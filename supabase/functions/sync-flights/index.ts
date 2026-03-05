import "jsr:@supabase/functions-js/edge-runtime.d.ts";
declare const Deno: {
  env: { get: (name: string) => string | undefined };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

// @ts-ignore URL import is resolved by Supabase Edge Functions (Deno runtime).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  fetchAeroDataBoxWindow,
  splitUtcRangeToLocalWindows,
  type AeroDataBoxQuery,
  type SyncWindow,
} from "../_shared/aerodatabox-client.ts";

type SyncRequest = {
  airportIata?: string;
  direction?: "Departure" | "Arrival" | "Both";
  withLeg?: boolean;
  withCancelled?: boolean;
  startDateUtc: string;
  endDateUtc: string;
  mode?: "cron" | "backfill" | "manual";
};

type FlightPayload = Record<string, unknown>;

const SUPABASE_URL = mustEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
const API_KEYS = [
  Deno.env.get("AERODATABOX_API_KEY_1") ?? "",
  Deno.env.get("AERODATABOX_API_KEY_2") ?? "",
  Deno.env.get("AERODATABOX_API_KEY") ?? "",
].filter((value, index, arr) => value && arr.indexOf(value) === index);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Only POST is supported" }, 405);
  }

  if (API_KEYS.length === 0) {
    return json({ error: "AeroDataBox keys are not configured" }, 500);
  }

  let body: SyncRequest;
  try {
    body = (await request.json()) as SyncRequest;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body?.startDateUtc || !body?.endDateUtc) {
    return json({ error: "startDateUtc and endDateUtc are required" }, 400);
  }

  const query: AeroDataBoxQuery = {
    airportIata: (body.airportIata ?? "YYZ").toUpperCase(),
    direction: body.direction ?? "Departure",
    withLeg: body.withLeg ?? true,
    withCancelled: body.withCancelled ?? false,
  };

  let windows: SyncWindow[];
  try {
    windows = splitUtcRangeToLocalWindows(body.startDateUtc, body.endDateUtc);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }

  const runStartedAt = new Date().toISOString();
  const runSummary: Array<Record<string, unknown>> = [];
  let insertedOrUpdated = 0;
  let failedWindows = 0;

  for (let index = 0; index < windows.length; index += 1) {
    const window = windows[index];
    try {
      const fetchResult = await fetchAeroDataBoxWindow(query, window, API_KEYS, index % API_KEYS.length);
      const flights = query.direction === "Arrival"
        ? fetchResult.data.arrivals ?? []
        : fetchResult.data.departures ?? [];

      const rows = await buildRows({
        flights,
        query,
        window,
        mode: body.mode ?? "manual",
        requestUrl: fetchResult.requestUrl,
        httpStatus: fetchResult.status,
        sourceKeyAlias: fetchResult.keyAliasUsed,
      });

      if (rows.length > 0) {
        for (const chunk of chunkRows(rows, 200)) {
          const { error } = await supabase
            .from("raw_flights")
            .upsert(chunk, { onConflict: "flight_identity_key" });

          if (error) {
            throw new Error(`Supabase upsert failed: ${error.message}`);
          }
        }
      }

      insertedOrUpdated += rows.length;
      runSummary.push({
        windowStartUtc: window.startUtc,
        windowEndUtc: window.endUtc,
        windowStartLocal: window.startLocal,
        windowEndLocal: window.endLocal,
        flightsFetched: flights.length,
        rowsUpserted: rows.length,
        httpStatus: fetchResult.status,
        sourceKeyAlias: fetchResult.keyAliasUsed,
      });
    } catch (error) {
      failedWindows += 1;
      runSummary.push({
        windowStartUtc: window.startUtc,
        windowEndUtc: window.endUtc,
        error: (error as Error).message,
      });
    }
  }

  const statusCode = failedWindows > 0 ? 207 : 200;
  return json(
    {
      ok: failedWindows === 0,
      runStartedAt,
      runFinishedAt: new Date().toISOString(),
      airportIata: query.airportIata,
      direction: query.direction,
      mode: body.mode ?? "manual",
      windowsRequested: windows.length,
      windowsFailed: failedWindows,
      rowsUpserted: insertedOrUpdated,
      summary: runSummary,
    },
    statusCode
  );
});

async function buildRows(args: {
  flights: FlightPayload[];
  query: AeroDataBoxQuery;
  window: SyncWindow;
  mode: string;
  requestUrl: string;
  httpStatus: number;
  sourceKeyAlias: string;
}): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];

  for (const flight of args.flights) {
    const flightNumber = pickString(flight.number) ?? "UNKNOWN";
    const depUtcRaw = readPath(flight, ["departure", "scheduledTime", "utc"]);
    const depUtc = normalizeUtcTimestamp(depUtcRaw);
    if (!depUtc) {
      continue;
    }

    const depLocalRaw = readPath(flight, ["departure", "scheduledTime", "local"]);
    const arrivalIata = pickString(readPath(flight, ["arrival", "airport", "iata"]));
    const arrivalUtc = normalizeUtcTimestamp(readPath(flight, ["arrival", "scheduledTime", "utc"]));

    const flightIdentityKey = [
      args.query.airportIata,
      args.query.direction,
      flightNumber,
      depUtc,
      arrivalIata ?? "NA",
    ].join("|");

    const payloadHash = await sha256Hex(JSON.stringify(flight));

    rows.push({
      source: `aerodatabox.fids.${args.mode}`,
      airport_iata: args.query.airportIata,
      direction: args.query.direction,
      source_window_start_local: normalizeLocalTimestamp(args.window.startLocal),
      source_window_end_local: normalizeLocalTimestamp(args.window.endLocal),
      source_window_timezone: "America/Toronto",
      source_window_start_utc: args.window.startUtc,
      source_window_end_utc: args.window.endUtc,
      with_leg: args.query.withLeg,
      with_cancelled: args.query.withCancelled,
      source_key_alias: args.sourceKeyAlias,
      request_url: args.requestUrl,
      http_status: args.httpStatus,
      ingestion_status: "ingested",
      last_error: null,
      flight_identity_key: flightIdentityKey,
      flight_number: flightNumber,
      departure_scheduled_time_utc: depUtc,
      departure_scheduled_time_local: normalizeLocalTimestamp(depLocalRaw),
      arrival_airport_iata: arrivalIata,
      arrival_scheduled_time_utc: arrivalUtc,
      call_sign: pickString(flight.callSign),
      status: pickString(flight.status),
      codeshare_status: pickString(flight.codeshareStatus),
      is_cargo: pickBoolean(flight.isCargo),
      airline_iata: pickString(readPath(flight, ["airline", "iata"])),
      airline_icao: pickString(readPath(flight, ["airline", "icao"])),
      aircraft_reg: pickString(readPath(flight, ["aircraft", "reg"])),
      aircraft_model: pickString(readPath(flight, ["aircraft", "model"])),
      departure_terminal: pickString(readPath(flight, ["departure", "terminal"])),
      departure_gate: pickString(readPath(flight, ["departure", "gate"])),
      payload_hash: payloadHash,
      raw_payload: flight,
    });
  }

  return rows;
}

function chunkRows<T>(rows: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }
  return chunks;
}

function mustEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function readPath(input: unknown, path: string[]): unknown {
  let current: unknown = input;
  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeUtcTimestamp(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normalizeLocalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (!match) {
    return null;
  }

  return `${match[1]} ${match[2]}:00`;
}

async function sha256Hex(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
