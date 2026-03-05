declare const require: (name: string) => any;
declare const process: {
  cwd: () => string;
  env: Record<string, string | undefined>;
  stdout: { write: (message: string) => void };
  stderr: { write: (message: string) => void };
  exit: (code: number) => never;
};

const fs = require("fs/promises");
const path = require("path");
const https = require("https");

type JsonObject = Record<string, unknown>;

type WindowSpec = {
  name: string;
  fromLocal: string;
  toLocal: string;
};

type WindowResult = {
  name: string;
  fromLocal: string;
  toLocal: string;
  status: "ok" | "error";
  httpStatus?: number;
  keyAliasTried?: string;
  keyAliasUsed?: string;
  departuresCount?: number;
  arrivalsCount?: number;
  sampleFile?: string;
  error?: string;
};

type PathStat = {
  path: string;
  exists: number;
  nonNull: number;
  nulls: number;
  missing: number;
  nonNullPct: number;
};

type CandidateStat = {
  key: string;
  completeRows: number;
  distinctValues: number;
  duplicateRows: number;
  uniquenessPct: number;
  coveragePct: number;
};

const AIRPORT = "YYZ";
const ROOT_DIR = process.cwd();
const DOCS_DIR = path.join(ROOT_DIR, "docs");
const OUTCOMES_PHASE_A_DIR = path.join(ROOT_DIR, "Outcomes", "Phase A");
const SAMPLES_DIR = path.join(OUTCOMES_PHASE_A_DIR, "phaseA-samples");
const CONTRACT_DOC_PATH = path.join(OUTCOMES_PHASE_A_DIR, "aerodatabox-contract.md");
const SUMMARY_JSON_PATH = path.join(SAMPLES_DIR, "phaseA-summary.json");
const ENV_MD_PATH = path.join(DOCS_DIR, "env.md");

const REQUIRED_QUERY = {
  withLeg: "true",
  direction: "Departure",
  withCancelled: "false",
};

const NULLABILITY_PATHS = [
  "number",
  "callSign",
  "status",
  "codeshareStatus",
  "isCargo",
  "airline.iata",
  "airline.icao",
  "aircraft.reg",
  "aircraft.modeS",
  "aircraft.model",
  "departure.scheduledTime.utc",
  "departure.revisedTime.utc",
  "departure.predictedTime.utc",
  "departure.runwayTime.utc",
  "departure.terminal",
  "departure.gate",
  "arrival.airport.iata",
  "arrival.airport.icao",
  "arrival.scheduledTime.utc",
  "location.lat",
  "location.lon",
  "location.reportedAtUtc",
];

const IDENTIFIER_COMBINATIONS: Array<{ key: string; paths: string[] }> = [
  { key: "number", paths: ["number"] },
  { key: "number+departure.scheduledTime.utc", paths: ["number", "departure.scheduledTime.utc"] },
  {
    key: "number+departure.scheduledTime.utc+arrival.airport.iata",
    paths: ["number", "departure.scheduledTime.utc", "arrival.airport.iata"],
  },
  {
    key: "number+departure.scheduledTime.utc+arrival.airport.iata+arrival.scheduledTime.utc",
    paths: ["number", "departure.scheduledTime.utc", "arrival.airport.iata", "arrival.scheduledTime.utc"],
  },
  {
    key: "number+departure.scheduledTime.utc+airline.icao",
    paths: ["number", "departure.scheduledTime.utc", "airline.icao"],
  },
  { key: "callSign+departure.scheduledTime.utc", paths: ["callSign", "departure.scheduledTime.utc"] },
];

function getDatePartsInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function formatYmd(parts: { year: number; month: number; day: number }): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function shiftYmd(ymd: string, dayOffset: number): string {
  const [yearText, monthText, dayText] = ymd.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));

  return formatYmd({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

function buildDefaultWindows(): WindowSpec[] {
  const todayToronto = formatYmd(getDatePartsInTimeZone(new Date(), "America/Toronto"));
  const yesterdayToronto = shiftYmd(todayToronto, -1);

  return [
    {
      name: "normal_morning",
      fromLocal: `${yesterdayToronto}T06:00`,
      toLocal: `${yesterdayToronto}T10:00`,
    },
    {
      name: "high_volume_midday",
      fromLocal: `${yesterdayToronto}T11:00`,
      toLocal: `${yesterdayToronto}T15:00`,
    },
    {
      name: "edge_overnight",
      fromLocal: `${yesterdayToronto}T23:00`,
      toLocal: `${todayToronto}T05:00`,
    },
  ];
}

async function readEnvMdKeys(envPath: string): Promise<string[]> {
  try {
    const text = await fs.readFile(envPath, "utf8");
    const key1 = text.match(/api_key\s*=\s*"([^"]+)"/i)?.[1]?.trim();
    const key2 = text.match(/api_key_2\s*=\s*"([^"]+)"/i)?.[1]?.trim();

    return [key1, key2].filter((value): value is string => Boolean(value));
  } catch {
    return [];
  }
}

function uniqueNonEmpty(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) {
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      output.push(trimmed);
    }
  }

  return output;
}

async function resolveApiKeys(): Promise<string[]> {
  const fromEnv = uniqueNonEmpty([
    process.env.AERODATABOX_API_KEY_1,
    process.env.AERODATABOX_API_KEY_2,
    process.env.AERODATABOX_API_KEY,
  ]);

  if (fromEnv.length > 0) {
    return fromEnv;
  }

  const fromEnvMd = uniqueNonEmpty(await readEnvMdKeys(ENV_MD_PATH));
  if (fromEnvMd.length > 0) {
    return fromEnvMd;
  }

  throw new Error(
    "No AeroDataBox API keys found. Set AERODATABOX_API_KEY_1/AERODATABOX_API_KEY_2 or keep keys in docs/env.md."
  );
}

function httpGetJson(url: string, headers: Record<string, string>): Promise<{ status: number; body: unknown; raw: string }> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "GET",
        headers,
      },
      (response: any) => {
        let raw = "";
        response.setEncoding("utf8");

        response.on("data", (chunk: string) => {
          raw += chunk;
        });

        response.on("end", () => {
          const status = response.statusCode ?? 0;

          if (raw.length === 0) {
            resolve({ status, body: null, raw });
            return;
          }

          try {
            const parsed = JSON.parse(raw) as unknown;
            resolve({ status, body: parsed, raw });
          } catch {
            resolve({ status, body: raw, raw });
          }
        });
      }
    );

    request.on("error", (error: Error) => {
      reject(error);
    });

    request.end();
  });
}

function toJsonObject(input: unknown): JsonObject {
  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    return input as JsonObject;
  }
  return {};
}

function toJsonObjectArray(input: unknown): JsonObject[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.filter((item): item is JsonObject => typeof item === "object" && item !== null && !Array.isArray(item));
}

function getPathState(record: JsonObject, pathText: string): { exists: boolean; value: unknown } {
  const segments = pathText.split(".");
  let current: unknown = record;

  for (const segment of segments) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return { exists: false, value: undefined };
    }

    const objectRecord = current as JsonObject;
    if (!(segment in objectRecord)) {
      return { exists: false, value: undefined };
    }

    current = objectRecord[segment];
  }

  return { exists: true, value: current };
}

function valueFingerprint(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function collectNullabilityStats(flights: JsonObject[]): PathStat[] {
  const total = flights.length;

  return NULLABILITY_PATHS.map((pathText) => {
    let exists = 0;
    let nonNull = 0;
    let nulls = 0;

    for (const flight of flights) {
      const state = getPathState(flight, pathText);
      if (!state.exists) {
        continue;
      }

      exists += 1;
      if (state.value === null || state.value === undefined) {
        nulls += 1;
      } else {
        nonNull += 1;
      }
    }

    const missing = total - exists;
    const nonNullPct = total === 0 ? 0 : Number(((nonNull / total) * 100).toFixed(2));

    return {
      path: pathText,
      exists,
      nonNull,
      nulls,
      missing,
      nonNullPct,
    };
  });
}

function collectIdentifierStats(flights: JsonObject[]): CandidateStat[] {
  const total = flights.length;

  return IDENTIFIER_COMBINATIONS.map((candidate) => {
    let completeRows = 0;
    const values = new Set<string>();

    for (const flight of flights) {
      const parts: string[] = [];
      let complete = true;

      for (const pathText of candidate.paths) {
        const state = getPathState(flight, pathText);
        if (!state.exists || state.value === null || state.value === undefined) {
          complete = false;
          break;
        }
        parts.push(valueFingerprint(state.value));
      }

      if (!complete) {
        continue;
      }

      completeRows += 1;
      values.add(parts.join("||"));
    }

    const distinctValues = values.size;
    const duplicateRows = Math.max(completeRows - distinctValues, 0);
    const uniquenessPct = completeRows === 0 ? 0 : Number(((distinctValues / completeRows) * 100).toFixed(2));
    const coveragePct = total === 0 ? 0 : Number(((completeRows / total) * 100).toFixed(2));

    return {
      key: candidate.key,
      completeRows,
      distinctValues,
      duplicateRows,
      uniquenessPct,
      coveragePct,
    };
  }).sort((a, b) => {
    if (a.coveragePct !== b.coveragePct) {
      return b.coveragePct - a.coveragePct;
    }
    if (a.duplicateRows !== b.duplicateRows) {
      return a.duplicateRows - b.duplicateRows;
    }
    return b.uniquenessPct - a.uniquenessPct;
  });
}

function collectShapeTypes(value: unknown, currentPath: string, map: Map<string, Set<string>>, depth: number): void {
  if (depth > 8) {
    return;
  }

  if (value === null) {
    if (!map.has(currentPath)) {
      map.set(currentPath, new Set<string>());
    }
    map.get(currentPath)?.add("null");
    return;
  }

  if (Array.isArray(value)) {
    if (!map.has(currentPath)) {
      map.set(currentPath, new Set<string>());
    }
    map.get(currentPath)?.add("array");

    for (const item of value.slice(0, 3)) {
      collectShapeTypes(item, `${currentPath}[]`, map, depth + 1);
    }
    return;
  }

  if (typeof value === "object") {
    if (!map.has(currentPath)) {
      map.set(currentPath, new Set<string>());
    }
    map.get(currentPath)?.add("object");

    for (const [key, child] of Object.entries(value as JsonObject)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      collectShapeTypes(child, nextPath, map, depth + 1);
    }
    return;
  }

  if (!map.has(currentPath)) {
    map.set(currentPath, new Set<string>());
  }
  map.get(currentPath)?.add(typeof value);
}

function buildPhaseAMarkdown(args: {
  generatedAtUtc: string;
  windows: WindowResult[];
  responseTopKeys: string[];
  departureTopKeys: string[];
  shapeRows: Array<{ path: string; types: string }>;
  nullability: PathStat[];
  identifierStats: CandidateStat[];
}): string {
  const lines: string[] = [];

  lines.push("# AeroDataBox Contract Discovery (Phase A)");
  lines.push("");
  lines.push(`Generated at (UTC): ${args.generatedAtUtc}`);
  lines.push("");
  lines.push("## Request Settings");
  lines.push("");
  lines.push("- Endpoint: `GET /flights/airports/iata/YYZ/{fromLocal}/{toLocal}`");
  lines.push("- `withLeg=true`");
  lines.push("- `direction=Departure`");
  lines.push("- `withCancelled=false`");
  lines.push("- Time range windows are local Toronto time and each window is <= 12h");
  lines.push("");

  lines.push("## Probe Windows");
  lines.push("");
  lines.push("| Window | From Local | To Local | Status | HTTP | Departures | Arrivals | Sample | Error |\n|---|---|---|---|---:|---:|---:|---|---|");
  for (const window of args.windows) {
    lines.push(
      `| ${window.name} | ${window.fromLocal} | ${window.toLocal} | ${window.status} | ${window.httpStatus ?? ""} | ${window.departuresCount ?? 0} | ${window.arrivalsCount ?? 0} | ${window.sampleFile ?? ""} | ${window.error ?? ""} |`
    );
  }
  lines.push("");

  lines.push("## Envelope Shape");
  lines.push("");
  lines.push(`- Response top-level keys observed: ${args.responseTopKeys.join(", ") || "none"}`);
  lines.push(`- Departure object top-level keys observed: ${args.departureTopKeys.join(", ") || "none"}`);
  lines.push("");

  lines.push("## Flattened Path Type Map (Observed)");
  lines.push("");
  lines.push("| Path | Types |\n|---|---|");
  for (const row of args.shapeRows.slice(0, 200)) {
    lines.push(`| ${row.path || "<root>"} | ${row.types} |`);
  }
  if (args.shapeRows.length > 200) {
    lines.push(`| ...truncated | ${args.shapeRows.length - 200} additional paths omitted in markdown; see JSON summary |`);
  }
  lines.push("");

  lines.push("## Nullability Snapshot (Selected Paths)");
  lines.push("");
  lines.push("| Path | Exists | Non-null | Null | Missing | Non-null % of all departures |\n|---|---:|---:|---:|---:|---:|");
  for (const row of args.nullability) {
    lines.push(`| ${row.path} | ${row.exists} | ${row.nonNull} | ${row.nulls} | ${row.missing} | ${row.nonNullPct}% |`);
  }
  lines.push("");

  lines.push("## Stable Identifier Candidates");
  lines.push("");
  lines.push("| Candidate | Complete Rows | Distinct Values | Duplicate Rows | Uniqueness % | Coverage % |\n|---|---:|---:|---:|---:|---:|");
  for (const row of args.identifierStats) {
    lines.push(
      `| ${row.key} | ${row.completeRows} | ${row.distinctValues} | ${row.duplicateRows} | ${row.uniquenessPct}% | ${row.coveragePct}% |`
    );
  }
  lines.push("");

  const best = args.identifierStats[0];
  if (best) {
    lines.push("## Recommendation for Upsert Key (Phase B Input)");
    lines.push("");
    lines.push(`Best observed candidate in this probe: \`${best.key}\` (duplicates: ${best.duplicateRows}, coverage: ${best.coveragePct}%).`);
    lines.push(
      "If duplicates remain in larger windows, use airport request context plus payload fields: `airport_iata + direction + number + departure.scheduledTime.utc + coalesce(arrival.airport.iata,'NA')`."
    );
    lines.push("");
  }

  lines.push("## Generated Artifacts");
  lines.push("");
  lines.push("- `Outcomes/Phase A/phaseA-samples/*.json`: raw API snapshots per window");
  lines.push("- `Outcomes/Phase A/phaseA-samples/phaseA-summary.json`: machine-readable summary");
  lines.push("- `Outcomes/Phase A/aerodatabox-contract.md`: this contract report");
  lines.push("");

  return lines.join("\n");
}

async function fetchWindow(
  spec: WindowSpec,
  apiKeys: string[],
  keyStartIndex: number
): Promise<{ result: WindowResult; responseBody: JsonObject | null }> {
  const encodedFrom = encodeURIComponent(spec.fromLocal);
  const encodedTo = encodeURIComponent(spec.toLocal);
  const url =
    `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${AIRPORT}/${encodedFrom}/${encodedTo}` +
    `?withLeg=${REQUIRED_QUERY.withLeg}&direction=${REQUIRED_QUERY.direction}&withCancelled=${REQUIRED_QUERY.withCancelled}`;

  let lastError = "";

  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const keyIndex = (keyStartIndex + attempt) % apiKeys.length;
    const apiKey = apiKeys[keyIndex];
    const keyAlias = `key_${keyIndex + 1}`;

    const headers = {
      "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
      "X-RapidAPI-Key": apiKey,
      Accept: "application/json",
    };

    try {
      const response = await httpGetJson(url, headers);

      if (response.status >= 200 && response.status < 300) {
        const body = toJsonObject(response.body);
        const departures = toJsonObjectArray(body.departures);
        const arrivals = toJsonObjectArray(body.arrivals);

        return {
          result: {
            name: spec.name,
            fromLocal: spec.fromLocal,
            toLocal: spec.toLocal,
            status: "ok",
            httpStatus: response.status,
            keyAliasUsed: keyAlias,
            departuresCount: departures.length,
            arrivalsCount: arrivals.length,
          },
          responseBody: body,
        };
      }

      const errorText = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
      lastError = `HTTP ${response.status} from ${keyAlias}: ${errorText}`;

      // Retry on throttling and server errors using the next key.
      if (!(response.status === 429 || response.status >= 500)) {
        break;
      }
    } catch (error) {
      lastError = `${keyAlias}: ${(error as Error).message}`;
    }
  }

  return {
    result: {
      name: spec.name,
      fromLocal: spec.fromLocal,
      toLocal: spec.toLocal,
      status: "error",
      keyAliasTried: `start_key_${keyStartIndex + 1}`,
      error: lastError || "Unknown error",
    },
    responseBody: null,
  };
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  const pretty = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, pretty, "utf8");
}

async function main(): Promise<void> {
  await fs.mkdir(SAMPLES_DIR, { recursive: true });

  const apiKeys = await resolveApiKeys();
  const windows = buildDefaultWindows();

  const allFlights: JsonObject[] = [];
  const windowResults: WindowResult[] = [];
  const responseTopKeySet = new Set<string>();
  const departureTopKeySet = new Set<string>();
  const shapeTypeMap = new Map<string, Set<string>>();

  for (let index = 0; index < windows.length; index += 1) {
    const window = windows[index];
    const { result, responseBody } = await fetchWindow(window, apiKeys, index % apiKeys.length);

    if (result.status === "ok" && responseBody) {
      const sampleFileName = `${window.name}.json`;
      const samplePath = path.join(SAMPLES_DIR, sampleFileName);

      await writeJson(samplePath, {
        meta: {
          generatedAtUtc: new Date().toISOString(),
          airport: AIRPORT,
          fromLocal: window.fromLocal,
          toLocal: window.toLocal,
          query: REQUIRED_QUERY,
          keyAliasUsed: result.keyAliasUsed,
        },
        response: responseBody,
      });

      result.sampleFile = path.relative(ROOT_DIR, samplePath).replace(/\\/g, "/");

      for (const key of Object.keys(responseBody)) {
        responseTopKeySet.add(key);
      }

      const departures = toJsonObjectArray(responseBody.departures);
      for (const departure of departures) {
        allFlights.push(departure);
        for (const key of Object.keys(departure)) {
          departureTopKeySet.add(key);
        }
        collectShapeTypes(departure, "", shapeTypeMap, 0);
      }
    }

    windowResults.push(result);
  }

  const nullability = collectNullabilityStats(allFlights);
  const identifierStats = collectIdentifierStats(allFlights);

  const shapeRows = Array.from(shapeTypeMap.entries())
    .map(([pathKey, types]) => ({ path: pathKey, types: Array.from(types).sort().join("|") }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const summary = {
    generatedAtUtc: new Date().toISOString(),
    airport: AIRPORT,
    query: REQUIRED_QUERY,
    totalDepartureFlights: allFlights.length,
    windows: windowResults,
    responseTopKeys: Array.from(responseTopKeySet).sort(),
    departureTopKeys: Array.from(departureTopKeySet).sort(),
    nullability,
    identifierStats,
    shapeRows,
  };

  await writeJson(SUMMARY_JSON_PATH, summary);

  const markdown = buildPhaseAMarkdown({
    generatedAtUtc: summary.generatedAtUtc,
    windows: windowResults,
    responseTopKeys: summary.responseTopKeys,
    departureTopKeys: summary.departureTopKeys,
    shapeRows,
    nullability,
    identifierStats,
  });

  await fs.writeFile(CONTRACT_DOC_PATH, markdown, "utf8");

  process.stdout.write(`Phase A discovery complete.\n`);
  process.stdout.write(`- Contract doc: ${path.relative(ROOT_DIR, CONTRACT_DOC_PATH)}\n`);
  process.stdout.write(`- Summary JSON: ${path.relative(ROOT_DIR, SUMMARY_JSON_PATH)}\n`);
  process.stdout.write(`- Raw samples dir: ${path.relative(ROOT_DIR, SAMPLES_DIR)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Phase A discovery failed: ${(error as Error).message}\n`);
  process.exit(1);
});
