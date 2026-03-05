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

    const movementAirportIcao = pickString(readPath(flight, ["movement", "airport", "icao"]));
    const movementAirportIata = pickString(readPath(flight, ["movement", "airport", "iata"]));
    const movementAirportLocalCode = pickString(readPath(flight, ["movement", "airport", "localCode"]));
    const movementAirportName = pickString(readPath(flight, ["movement", "airport", "name"]));
    const movementAirportShortName = pickString(readPath(flight, ["movement", "airport", "shortName"]));
    const movementAirportMunicipalityName = pickString(readPath(flight, ["movement", "airport", "municipalityName"]));
    const movementAirportLocationLat = pickNumber(readPath(flight, ["movement", "airport", "location", "lat"]));
    const movementAirportLocationLon = pickNumber(readPath(flight, ["movement", "airport", "location", "lon"]));
    const movementAirportCountryCode = pickString(readPath(flight, ["movement", "airport", "countryCode"]));
    const movementAirportTimeZone = pickString(readPath(flight, ["movement", "airport", "timeZone"]));
    const movementScheduledUtc = normalizeUtcTimestamp(readPath(flight, ["movement", "scheduledTime", "utc"]));
    const movementScheduledLocal = normalizeLocalTimestamp(readPath(flight, ["movement", "scheduledTime", "local"]));
    const movementRevisedUtc = normalizeUtcTimestamp(readPath(flight, ["movement", "revisedTime", "utc"]));
    const movementRevisedLocal = normalizeLocalTimestamp(readPath(flight, ["movement", "revisedTime", "local"]));
    const movementPredictedUtc = normalizeUtcTimestamp(readPath(flight, ["movement", "predictedTime", "utc"]));
    const movementPredictedLocal = normalizeLocalTimestamp(readPath(flight, ["movement", "predictedTime", "local"]));
    const movementRunwayUtc = normalizeUtcTimestamp(readPath(flight, ["movement", "runwayTime", "utc"]));
    const movementRunwayLocal = normalizeLocalTimestamp(readPath(flight, ["movement", "runwayTime", "local"]));
    const movementTerminal = pickString(readPath(flight, ["movement", "terminal"]));
    const movementCheckInDesk = pickString(readPath(flight, ["movement", "checkInDesk"]));
    const movementGate = pickString(readPath(flight, ["movement", "gate"]));
    const movementBaggageBelt = pickString(readPath(flight, ["movement", "baggageBelt"]));
    const movementRunway = pickString(readPath(flight, ["movement", "runway"]));
    const movementQuality = pickStringArray(readPath(flight, ["movement", "quality"]));

    const departureAirportIcao = pickString(readPath(flight, ["departure", "airport", "icao"]));
    const departureAirportIata = pickString(readPath(flight, ["departure", "airport", "iata"]));
    const departureAirportLocalCode = pickString(readPath(flight, ["departure", "airport", "localCode"]));
    const departureAirportName = pickString(readPath(flight, ["departure", "airport", "name"]));
    const departureAirportShortName = pickString(readPath(flight, ["departure", "airport", "shortName"]));
    const departureAirportMunicipalityName = pickString(readPath(flight, ["departure", "airport", "municipalityName"]));
    const departureAirportLocationLat = pickNumber(readPath(flight, ["departure", "airport", "location", "lat"]));
    const departureAirportLocationLon = pickNumber(readPath(flight, ["departure", "airport", "location", "lon"]));
    const departureAirportCountryCode = pickString(readPath(flight, ["departure", "airport", "countryCode"]));
    const departureAirportTimeZone = pickString(readPath(flight, ["departure", "airport", "timeZone"]));
    const departureRevisedUtc = normalizeUtcTimestamp(readPath(flight, ["departure", "revisedTime", "utc"]));
    const departureRevisedLocal = normalizeLocalTimestamp(readPath(flight, ["departure", "revisedTime", "local"]));
    const departurePredictedUtc = normalizeUtcTimestamp(readPath(flight, ["departure", "predictedTime", "utc"]));
    const departurePredictedLocal = normalizeLocalTimestamp(readPath(flight, ["departure", "predictedTime", "local"]));
    const departureRunwayUtc = normalizeUtcTimestamp(readPath(flight, ["departure", "runwayTime", "utc"]));
    const departureRunwayLocal = normalizeLocalTimestamp(readPath(flight, ["departure", "runwayTime", "local"]));
    const departureCheckInDesk = pickString(readPath(flight, ["departure", "checkInDesk"]));
    const departureBaggageBelt = pickString(readPath(flight, ["departure", "baggageBelt"]));
    const departureRunway = pickString(readPath(flight, ["departure", "runway"]));
    const departureQuality = pickStringArray(readPath(flight, ["departure", "quality"]));

    const arrivalAirportIcao = pickString(readPath(flight, ["arrival", "airport", "icao"]));
    const arrivalAirportLocalCode = pickString(readPath(flight, ["arrival", "airport", "localCode"]));
    const arrivalAirportName = pickString(readPath(flight, ["arrival", "airport", "name"]));
    const arrivalAirportShortName = pickString(readPath(flight, ["arrival", "airport", "shortName"]));
    const arrivalAirportMunicipalityName = pickString(readPath(flight, ["arrival", "airport", "municipalityName"]));
    const arrivalAirportLocationLat = pickNumber(readPath(flight, ["arrival", "airport", "location", "lat"]));
    const arrivalAirportLocationLon = pickNumber(readPath(flight, ["arrival", "airport", "location", "lon"]));
    const arrivalAirportCountryCode = pickString(readPath(flight, ["arrival", "airport", "countryCode"]));
    const arrivalAirportTimeZone = pickString(readPath(flight, ["arrival", "airport", "timeZone"]));
    const arrivalScheduledLocal = normalizeLocalTimestamp(readPath(flight, ["arrival", "scheduledTime", "local"]));
    const arrivalRevisedUtc = normalizeUtcTimestamp(readPath(flight, ["arrival", "revisedTime", "utc"]));
    const arrivalRevisedLocal = normalizeLocalTimestamp(readPath(flight, ["arrival", "revisedTime", "local"]));
    const arrivalPredictedUtc = normalizeUtcTimestamp(readPath(flight, ["arrival", "predictedTime", "utc"]));
    const arrivalPredictedLocal = normalizeLocalTimestamp(readPath(flight, ["arrival", "predictedTime", "local"]));
    const arrivalRunwayUtc = normalizeUtcTimestamp(readPath(flight, ["arrival", "runwayTime", "utc"]));
    const arrivalRunwayLocal = normalizeLocalTimestamp(readPath(flight, ["arrival", "runwayTime", "local"]));
    const arrivalTerminal = pickString(readPath(flight, ["arrival", "terminal"]));
    const arrivalCheckInDesk = pickString(readPath(flight, ["arrival", "checkInDesk"]));
    const arrivalGate = pickString(readPath(flight, ["arrival", "gate"]));
    const arrivalBaggageBelt = pickString(readPath(flight, ["arrival", "baggageBelt"]));
    const arrivalRunway = pickString(readPath(flight, ["arrival", "runway"]));
    const arrivalQuality = pickStringArray(readPath(flight, ["arrival", "quality"]));

    const aircraftModeS = pickString(readPath(flight, ["aircraft", "modeS"]));
    const aircraftImageUrl = pickString(readPath(flight, ["aircraft", "image", "url"]));
    const aircraftImageWebUrl = pickString(readPath(flight, ["aircraft", "image", "webUrl"]));
    const aircraftImageAuthor = pickString(readPath(flight, ["aircraft", "image", "author"]));
    const aircraftImageTitle = pickString(readPath(flight, ["aircraft", "image", "title"]));
    const aircraftImageDescription = pickString(readPath(flight, ["aircraft", "image", "description"]));
    const aircraftImageLicense = pickString(readPath(flight, ["aircraft", "image", "license"]));
    const aircraftImageHtmlAttributions = pickStringArray(readPath(flight, ["aircraft", "image", "htmlAttributions"]));
    const airlineName = pickString(readPath(flight, ["airline", "name"]));

    const locationPressureAltitudeMeter = pickNumber(readPath(flight, ["location", "pressureAltitude", "meter"]));
    const locationPressureAltitudeKm = pickNumber(readPath(flight, ["location", "pressureAltitude", "km"]));
    const locationPressureAltitudeMile = pickNumber(readPath(flight, ["location", "pressureAltitude", "mile"]));
    const locationPressureAltitudeNm = pickNumber(readPath(flight, ["location", "pressureAltitude", "nm"]));
    const locationPressureAltitudeFeet = pickNumber(readPath(flight, ["location", "pressureAltitude", "feet"]));
    const locationAltitudeMeter = pickNumber(readPath(flight, ["location", "altitude", "meter"]));
    const locationAltitudeKm = pickNumber(readPath(flight, ["location", "altitude", "km"]));
    const locationAltitudeMile = pickNumber(readPath(flight, ["location", "altitude", "mile"]));
    const locationAltitudeNm = pickNumber(readPath(flight, ["location", "altitude", "nm"]));
    const locationAltitudeFeet = pickNumber(readPath(flight, ["location", "altitude", "feet"]));
    const locationPressureHpa = pickNumber(readPath(flight, ["location", "pressure", "hPa"]));
    const locationPressureInHg = pickNumber(readPath(flight, ["location", "pressure", "inHg"]));
    const locationPressureMmHg = pickNumber(readPath(flight, ["location", "pressure", "mmHg"]));
    const locationGroundSpeedKt = pickNumber(readPath(flight, ["location", "groundSpeed", "kt"]));
    const locationGroundSpeedKmPerHour = pickNumber(readPath(flight, ["location", "groundSpeed", "kmPerHour"]));
    const locationGroundSpeedMiPerHour = pickNumber(readPath(flight, ["location", "groundSpeed", "miPerHour"]));
    const locationGroundSpeedMeterPerSecond = pickNumber(readPath(flight, ["location", "groundSpeed", "meterPerSecond"]));
    const locationTrueTrackDeg = pickNumber(readPath(flight, ["location", "trueTrack", "deg"]));
    const locationTrueTrackRad = pickNumber(readPath(flight, ["location", "trueTrack", "rad"]));
    const locationVsiFpm = pickInteger(readPath(flight, ["location", "vsiFpm"]));
    const locationReportedAtUtc = normalizeUtcTimestamp(readPath(flight, ["location", "reportedAtUtc"]));
    const locationLat = pickNumber(readPath(flight, ["location", "lat"]));
    const locationLon = pickNumber(readPath(flight, ["location", "lon"]));

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
      with_location: args.query.withLocation,
      source_key_alias: args.sourceKeyAlias,
      request_url: args.requestUrl,
      http_status: args.httpStatus,
      ingestion_status: "ingested",
      last_error: null,
      flight_identity_key: flightIdentityKey,
      flight_number: flightNumber,

      movement_airport_icao: movementAirportIcao,
      movement_airport_iata: movementAirportIata,
      movement_airport_local_code: movementAirportLocalCode,
      movement_airport_name: movementAirportName,
      movement_airport_short_name: movementAirportShortName,
      movement_airport_municipality_name: movementAirportMunicipalityName,
      movement_airport_location_lat: movementAirportLocationLat,
      movement_airport_location_lon: movementAirportLocationLon,
      movement_airport_country_code: movementAirportCountryCode,
      movement_airport_time_zone: movementAirportTimeZone,
      movement_scheduled_time_utc: movementScheduledUtc,
      movement_scheduled_time_local: movementScheduledLocal,
      movement_revised_time_utc: movementRevisedUtc,
      movement_revised_time_local: movementRevisedLocal,
      movement_predicted_time_utc: movementPredictedUtc,
      movement_predicted_time_local: movementPredictedLocal,
      movement_runway_time_utc: movementRunwayUtc,
      movement_runway_time_local: movementRunwayLocal,
      movement_terminal: movementTerminal,
      movement_check_in_desk: movementCheckInDesk,
      movement_gate: movementGate,
      movement_baggage_belt: movementBaggageBelt,
      movement_runway: movementRunway,
      movement_quality: movementQuality,

      departure_airport_icao: departureAirportIcao,
      departure_airport_iata: departureAirportIata,
      departure_airport_local_code: departureAirportLocalCode,
      departure_airport_name: departureAirportName,
      departure_airport_short_name: departureAirportShortName,
      departure_airport_municipality_name: departureAirportMunicipalityName,
      departure_airport_location_lat: departureAirportLocationLat,
      departure_airport_location_lon: departureAirportLocationLon,
      departure_airport_country_code: departureAirportCountryCode,
      departure_airport_time_zone: departureAirportTimeZone,
      departure_scheduled_time_utc: depUtc,
      departure_scheduled_time_local: normalizeLocalTimestamp(depLocalRaw),
      departure_revised_time_utc: departureRevisedUtc,
      departure_revised_time_local: departureRevisedLocal,
      departure_predicted_time_utc: departurePredictedUtc,
      departure_predicted_time_local: departurePredictedLocal,
      departure_runway_time_utc: departureRunwayUtc,
      departure_runway_time_local: departureRunwayLocal,
      departure_check_in_desk: departureCheckInDesk,
      departure_terminal: pickString(readPath(flight, ["departure", "terminal"])),
      departure_gate: pickString(readPath(flight, ["departure", "gate"])),
      departure_baggage_belt: departureBaggageBelt,
      departure_runway: departureRunway,
      departure_quality: departureQuality,

      arrival_airport_iata: arrivalIata,
      arrival_airport_icao: arrivalAirportIcao,
      arrival_airport_local_code: arrivalAirportLocalCode,
      arrival_airport_name: arrivalAirportName,
      arrival_airport_short_name: arrivalAirportShortName,
      arrival_airport_municipality_name: arrivalAirportMunicipalityName,
      arrival_airport_location_lat: arrivalAirportLocationLat,
      arrival_airport_location_lon: arrivalAirportLocationLon,
      arrival_airport_country_code: arrivalAirportCountryCode,
      arrival_airport_time_zone: arrivalAirportTimeZone,
      arrival_scheduled_time_utc: arrivalUtc,
      arrival_scheduled_time_local: arrivalScheduledLocal,
      arrival_revised_time_utc: arrivalRevisedUtc,
      arrival_revised_time_local: arrivalRevisedLocal,
      arrival_predicted_time_utc: arrivalPredictedUtc,
      arrival_predicted_time_local: arrivalPredictedLocal,
      arrival_runway_time_utc: arrivalRunwayUtc,
      arrival_runway_time_local: arrivalRunwayLocal,
      arrival_terminal: arrivalTerminal,
      arrival_check_in_desk: arrivalCheckInDesk,
      arrival_gate: arrivalGate,
      arrival_baggage_belt: arrivalBaggageBelt,
      arrival_runway: arrivalRunway,
      arrival_quality: arrivalQuality,

      airline_name: airlineName,
      airline_iata: pickString(readPath(flight, ["airline", "iata"])),
      airline_icao: pickString(readPath(flight, ["airline", "icao"])),

      aircraft_reg: pickString(readPath(flight, ["aircraft", "reg"])),
      aircraft_mode_s: aircraftModeS,
      aircraft_model: pickString(readPath(flight, ["aircraft", "model"])),
      aircraft_image_url: aircraftImageUrl,
      aircraft_image_web_url: aircraftImageWebUrl,
      aircraft_image_author: aircraftImageAuthor,
      aircraft_image_title: aircraftImageTitle,
      aircraft_image_description: aircraftImageDescription,
      aircraft_image_license: aircraftImageLicense,
      aircraft_image_html_attributions: aircraftImageHtmlAttributions,

      location_pressure_altitude_meter: locationPressureAltitudeMeter,
      location_pressure_altitude_km: locationPressureAltitudeKm,
      location_pressure_altitude_mile: locationPressureAltitudeMile,
      location_pressure_altitude_nm: locationPressureAltitudeNm,
      location_pressure_altitude_feet: locationPressureAltitudeFeet,
      location_altitude_meter: locationAltitudeMeter,
      location_altitude_km: locationAltitudeKm,
      location_altitude_mile: locationAltitudeMile,
      location_altitude_nm: locationAltitudeNm,
      location_altitude_feet: locationAltitudeFeet,
      location_pressure_hpa: locationPressureHpa,
      location_pressure_in_hg: locationPressureInHg,
      location_pressure_mm_hg: locationPressureMmHg,
      location_ground_speed_kt: locationGroundSpeedKt,
      location_ground_speed_km_per_hour: locationGroundSpeedKmPerHour,
      location_ground_speed_mi_per_hour: locationGroundSpeedMiPerHour,
      location_ground_speed_meter_per_second: locationGroundSpeedMeterPerSecond,
      location_true_track_deg: locationTrueTrackDeg,
      location_true_track_rad: locationTrueTrackRad,
      location_vsi_fpm: locationVsiFpm,
      location_reported_at_utc: locationReportedAtUtc,
      location_lat: locationLat,
      location_lon: locationLon,

      call_sign: pickString(flight.callSign),
      status: pickString(flight.status),
      codeshare_status: pickString(flight.codeshareStatus),
      is_cargo: pickBoolean(flight.isCargo),
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
