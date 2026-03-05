export type SyncWindow = {
  startUtc: string;
  endUtc: string;
  startLocal: string;
  endLocal: string;
};

export type AeroDataBoxQuery = {
  airportIata: string;
  direction: "Departure" | "Arrival" | "Both";
  withLeg: boolean;
  withCancelled: boolean;
};

export type AeroDataBoxResponse = {
  departures?: Record<string, unknown>[];
  arrivals?: Record<string, unknown>[];
};

export type AeroDataBoxFetchResult = {
  data: AeroDataBoxResponse;
  status: number;
  keyAliasUsed: string;
  requestUrl: string;
};

const API_HOST = "aerodatabox.p.rapidapi.com";
const API_BASE = `https://${API_HOST}`;
const TORONTO_TZ = "America/Toronto";
const MAX_WINDOW_HOURS = 12;

function toLocalApiDateTime(utcIso: string, timeZone = TORONTO_TZ): string {
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid UTC datetime: ${utcIso}`);
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (!year || !month || !day || !hour || !minute) {
    throw new Error(`Could not format ${utcIso} into ${timeZone}`);
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function splitUtcRangeToLocalWindows(startDateUtc: string, endDateUtc: string): SyncWindow[] {
  const start = new Date(startDateUtc);
  const end = new Date(endDateUtc);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("startDateUtc/endDateUtc must be valid datetime strings");
  }
  if (start >= end) {
    throw new Error("startDateUtc must be before endDateUtc");
  }

  const maxMs = MAX_WINDOW_HOURS * 60 * 60 * 1000;
  const windows: SyncWindow[] = [];
  let cursor = start.getTime();

  while (cursor < end.getTime()) {
    const next = Math.min(cursor + maxMs, end.getTime());
    const startUtcIso = new Date(cursor).toISOString();
    const endUtcIso = new Date(next).toISOString();

    windows.push({
      startUtc: startUtcIso,
      endUtc: endUtcIso,
      startLocal: toLocalApiDateTime(startUtcIso),
      endLocal: toLocalApiDateTime(endUtcIso),
    });

    cursor = next;
  }

  return windows;
}

function buildApiUrl(query: AeroDataBoxQuery, window: SyncWindow): string {
  const encodedFrom = encodeURIComponent(window.startLocal);
  const encodedTo = encodeURIComponent(window.endLocal);
  const params = new URLSearchParams({
    withLeg: String(query.withLeg),
    direction: query.direction,
    withCancelled: String(query.withCancelled),
  });

  return `${API_BASE}/flights/airports/iata/${query.airportIata}/${encodedFrom}/${encodedTo}?${params.toString()}`;
}

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithKey(url: string, apiKey: string): Promise<Response> {
  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-RapidAPI-Host": API_HOST,
      "X-RapidAPI-Key": apiKey,
    },
  });
}

export async function fetchAeroDataBoxWindow(
  query: AeroDataBoxQuery,
  window: SyncWindow,
  apiKeys: string[],
  startingKeyIndex: number
): Promise<AeroDataBoxFetchResult> {
  if (apiKeys.length === 0) {
    throw new Error("No AeroDataBox API keys configured");
  }

  const requestUrl = buildApiUrl(query, window);
  let lastError = "Unknown request failure";

  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const keyIndex = (startingKeyIndex + attempt) % apiKeys.length;
    const keyAlias = `key_${keyIndex + 1}`;
    const key = apiKeys[keyIndex];

    const response = await fetchWithKey(requestUrl, key);
    const text = await response.text();
    const body = text.length > 0 ? safeJsonParse(text) : {};

    if (response.ok) {
      return {
        data: toAeroDataBoxResponse(body),
        status: response.status,
        keyAliasUsed: keyAlias,
        requestUrl,
      };
    }

    lastError = `HTTP ${response.status} (${keyAlias}): ${text.slice(0, 400)}`;
    if (!shouldRetry(response.status)) {
      break;
    }

    await sleep(300 * (attempt + 1));
  }

  throw new Error(lastError);
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function toAeroDataBoxResponse(value: unknown): AeroDataBoxResponse {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const departures = Array.isArray(record.departures)
    ? (record.departures.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[])
    : [];
  const arrivals = Array.isArray(record.arrivals)
    ? (record.arrivals.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[])
    : [];

  return { departures, arrivals };
}
