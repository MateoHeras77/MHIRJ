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
  withLocation?: boolean;
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
const BACKFILL_WINDOW_DELAY_MS = readPositiveIntEnv("BACKFILL_WINDOW_DELAY_MS", 1500);

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
    withLocation: body.withLocation ?? true,
  };
  const mode = body.mode ?? "manual";

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
        mode,
        requestUrl: fetchResult.requestUrl,
        httpStatus: fetchResult.status,
        sourceKeyAlias: fetchResult.keyAliasUsed,
      });

      const dedupedRows = dedupeRowsByFlightIdentity(rows);
      const deduplicatedCount = rows.length - dedupedRows.length;

      if (dedupedRows.length > 0) {
        for (const chunk of chunkRows(dedupedRows, 200)) {
          const { error } = await supabase
            .from("raw_flights")
            .upsert(chunk, { onConflict: "flight_identity_key" });

          if (error) {
            throw new Error(`Supabase upsert failed: ${error.message}`);
          }
        }
      }

      insertedOrUpdated += dedupedRows.length;
      runSummary.push({
        windowStartUtc: window.startUtc,
        windowEndUtc: window.endUtc,
        windowStartLocal: window.startLocal,
        windowEndLocal: window.endLocal,
        flightsFetched: flights.length,
        rowsPrepared: rows.length,
        rowsDeduplicated: deduplicatedCount,
        rowsUpserted: dedupedRows.length,
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

    if (mode === "backfill" && index < windows.length - 1) {
      await sleep(BACKFILL_WINDOW_DELAY_MS);
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
      mode,
      windowsRequested: windows.length,
      windowsFailed: failedWindows,
      rowsUpserted: insertedOrUpdated,
      backfillWindowDelayMs: mode === "backfill" ? BACKFILL_WINDOW_DELAY_MS : 0,
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
    const depUtc = normalizeUtcTimestamp(readPath(flight, ["departure", "scheduledTime", "utc"]));
    if (!depUtc) {
      continue;
    }

    const arrAirportIata = pickString(readPath(flight, ["arrival", "airport", "iata"]));

    const flightIdentityKey = [
      args.query.airportIata,
      args.query.direction,
      flightNumber,
      depUtc,
      arrAirportIata ?? "NA",
    ].join("|");

    rows.push({
      // Ingestion metadata
      flight_identity_key: flightIdentityKey,
      airport_iata:        args.query.airportIata,
      direction:           args.query.direction,
      ingest_mode:         args.mode,

      // Flight core
      flight_number:       flightNumber,
      call_sign:           pickString(flight.callSign),
      status:              pickString(flight.status),
      codeshare_status:    pickString(flight.codeshareStatus),
      is_cargo:            pickBoolean(flight.isCargo),

      // Airline
      airline_name:        pickString(readPath(flight, ["airline", "name"])),
      airline_iata:        pickString(readPath(flight, ["airline", "iata"])),
      airline_icao:        pickString(readPath(flight, ["airline", "icao"])),

      // Aircraft (no image fields)
      aircraft_reg:        pickString(readPath(flight, ["aircraft", "reg"])),
      aircraft_mode_s:     pickString(readPath(flight, ["aircraft", "modeS"])),
      aircraft_model:      pickString(readPath(flight, ["aircraft", "model"])),

      // Departure airport
      dep_airport_icao:         pickString(readPath(flight, ["departure", "airport", "icao"])),
      dep_airport_iata:         pickString(readPath(flight, ["departure", "airport", "iata"])),
      dep_airport_local_code:   pickString(readPath(flight, ["departure", "airport", "localCode"])),
      dep_airport_name:         pickString(readPath(flight, ["departure", "airport", "name"])),
      dep_airport_short_name:   pickString(readPath(flight, ["departure", "airport", "shortName"])),
      dep_airport_municipality: pickString(readPath(flight, ["departure", "airport", "municipalityName"])),
      dep_airport_country_code: pickString(readPath(flight, ["departure", "airport", "countryCode"])),
      dep_airport_lat:          pickNumber(readPath(flight, ["departure", "airport", "location", "lat"])),
      dep_airport_lon:          pickNumber(readPath(flight, ["departure", "airport", "location", "lon"])),
      dep_airport_timezone:     pickString(readPath(flight, ["departure", "airport", "timeZone"])),

      // Departure timing & operations
      dep_scheduled_utc:   depUtc,
      dep_scheduled_local: normalizeLocalTimestamp(readPath(flight, ["departure", "scheduledTime", "local"])),
      dep_revised_utc:     normalizeUtcTimestamp(readPath(flight, ["departure", "revisedTime", "utc"])),
      dep_revised_local:   normalizeLocalTimestamp(readPath(flight, ["departure", "revisedTime", "local"])),
      dep_predicted_utc:   normalizeUtcTimestamp(readPath(flight, ["departure", "predictedTime", "utc"])),
      dep_predicted_local: normalizeLocalTimestamp(readPath(flight, ["departure", "predictedTime", "local"])),
      dep_runway_utc:      normalizeUtcTimestamp(readPath(flight, ["departure", "runwayTime", "utc"])),
      dep_runway_local:    normalizeLocalTimestamp(readPath(flight, ["departure", "runwayTime", "local"])),
      dep_terminal:        pickString(readPath(flight, ["departure", "terminal"])),
      dep_gate:            pickString(readPath(flight, ["departure", "gate"])),
      dep_check_in_desk:   pickString(readPath(flight, ["departure", "checkInDesk"])),
      dep_baggage_belt:    pickString(readPath(flight, ["departure", "baggageBelt"])),
      dep_runway:          pickString(readPath(flight, ["departure", "runway"])),
      dep_quality:         pickStringArray(readPath(flight, ["departure", "quality"])),

      // Arrival airport
      arr_airport_icao:         pickString(readPath(flight, ["arrival", "airport", "icao"])),
      arr_airport_iata:         arrAirportIata,
      arr_airport_local_code:   pickString(readPath(flight, ["arrival", "airport", "localCode"])),
      arr_airport_name:         pickString(readPath(flight, ["arrival", "airport", "name"])),
      arr_airport_short_name:   pickString(readPath(flight, ["arrival", "airport", "shortName"])),
      arr_airport_municipality: pickString(readPath(flight, ["arrival", "airport", "municipalityName"])),
      arr_airport_country_code: pickString(readPath(flight, ["arrival", "airport", "countryCode"])),
      arr_airport_lat:          pickNumber(readPath(flight, ["arrival", "airport", "location", "lat"])),
      arr_airport_lon:          pickNumber(readPath(flight, ["arrival", "airport", "location", "lon"])),
      arr_airport_timezone:     pickString(readPath(flight, ["arrival", "airport", "timeZone"])),

      // Arrival timing & operations
      arr_scheduled_utc:   normalizeUtcTimestamp(readPath(flight, ["arrival", "scheduledTime", "utc"])),
      arr_scheduled_local: normalizeLocalTimestamp(readPath(flight, ["arrival", "scheduledTime", "local"])),
      arr_revised_utc:     normalizeUtcTimestamp(readPath(flight, ["arrival", "revisedTime", "utc"])),
      arr_revised_local:   normalizeLocalTimestamp(readPath(flight, ["arrival", "revisedTime", "local"])),
      arr_predicted_utc:   normalizeUtcTimestamp(readPath(flight, ["arrival", "predictedTime", "utc"])),
      arr_predicted_local: normalizeLocalTimestamp(readPath(flight, ["arrival", "predictedTime", "local"])),
      arr_runway_utc:      normalizeUtcTimestamp(readPath(flight, ["arrival", "runwayTime", "utc"])),
      arr_runway_local:    normalizeLocalTimestamp(readPath(flight, ["arrival", "runwayTime", "local"])),
      arr_terminal:        pickString(readPath(flight, ["arrival", "terminal"])),
      arr_gate:            pickString(readPath(flight, ["arrival", "gate"])),
      arr_check_in_desk:   pickString(readPath(flight, ["arrival", "checkInDesk"])),
      arr_baggage_belt:    pickString(readPath(flight, ["arrival", "baggageBelt"])),
      arr_runway:          pickString(readPath(flight, ["arrival", "runway"])),
      arr_quality:         pickStringArray(readPath(flight, ["arrival", "quality"])),

      // Live location
      location_lat:              pickNumber(readPath(flight, ["location", "lat"])),
      location_lon:              pickNumber(readPath(flight, ["location", "lon"])),
      location_reported_at_utc:  normalizeUtcTimestamp(readPath(flight, ["location", "reportedAtUtc"])),
      location_pressure_alt_m:   pickNumber(readPath(flight, ["location", "pressureAltitude", "meter"])),
      location_pressure_alt_km:  pickNumber(readPath(flight, ["location", "pressureAltitude", "km"])),
      location_pressure_alt_mi:  pickNumber(readPath(flight, ["location", "pressureAltitude", "mile"])),
      location_pressure_alt_nm:  pickNumber(readPath(flight, ["location", "pressureAltitude", "nm"])),
      location_pressure_alt_ft:  pickNumber(readPath(flight, ["location", "pressureAltitude", "feet"])),
      location_altitude_m:       pickNumber(readPath(flight, ["location", "altitude", "meter"])),
      location_altitude_km:      pickNumber(readPath(flight, ["location", "altitude", "km"])),
      location_altitude_mi:      pickNumber(readPath(flight, ["location", "altitude", "mile"])),
      location_altitude_nm:      pickNumber(readPath(flight, ["location", "altitude", "nm"])),
      location_altitude_ft:      pickNumber(readPath(flight, ["location", "altitude", "feet"])),
      location_pressure_hpa:     pickNumber(readPath(flight, ["location", "pressure", "hPa"])),
      location_pressure_inhg:    pickNumber(readPath(flight, ["location", "pressure", "inHg"])),
      location_pressure_mmhg:    pickNumber(readPath(flight, ["location", "pressure", "mmHg"])),
      location_speed_kt:         pickNumber(readPath(flight, ["location", "groundSpeed", "kt"])),
      location_speed_kmh:        pickNumber(readPath(flight, ["location", "groundSpeed", "kmPerHour"])),
      location_speed_mph:        pickNumber(readPath(flight, ["location", "groundSpeed", "miPerHour"])),
      location_speed_ms:         pickNumber(readPath(flight, ["location", "groundSpeed", "meterPerSecond"])),
      location_track_deg:        pickNumber(readPath(flight, ["location", "trueTrack", "deg"])),
      location_track_rad:        pickNumber(readPath(flight, ["location", "trueTrack", "rad"])),
      location_vsi_fpm:          pickInteger(readPath(flight, ["location", "vsiFpm"])),

      // Full raw API object (hidden backup)
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

function dedupeRowsByFlightIdentity(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byIdentity = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const identity = typeof row.flight_identity_key === "string" ? row.flight_identity_key : "";
    if (!identity) {
      continue;
    }

    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, row);
      continue;
    }

    byIdentity.set(identity, chooseRicherRow(existing, row));
  }

  return [...byIdentity.values()];
}

function chooseRicherRow(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  return countNonNullValues(b) >= countNonNullValues(a) ? b : a;
}

function countNonNullValues(row: Record<string, unknown>): number {
  let count = 0;
  for (const value of Object.values(row)) {
    if (value !== null && value !== undefined) {
      count += 1;
    }
  }
  return count;
}

function mustEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = Deno.env.get(name);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function pickNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickInteger(value: unknown): number | null {
  const numberValue = pickNumber(value);
  if (numberValue === null) {
    return null;
  }
  return Math.trunc(numberValue);
}

function pickStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : null;
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

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
