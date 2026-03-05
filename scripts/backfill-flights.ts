export {};

declare const require: (name: string) => any;
declare const process: {
  argv: string[];
  cwd: () => string;
  env: Record<string, string | undefined>;
  stdout: { write: (message: string) => void };
  stderr: { write: (message: string) => void };
  exit: (code: number) => never;
};

type Direction = "Departure" | "Arrival";
type DirectionOption = Direction | "Both";
type CheckpointStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

type RunnerOptions = {
  fromUtc: string;
  toUtc: string;
  airportIata: string;
  direction: DirectionOption;
  delayMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  maxDays?: number;
  resume: boolean;
  dryRun: boolean;
  withLeg: boolean;
  withCancelled: boolean;
  withLocation: boolean;
};

type BackfillTask = {
  airportIata: string;
  direction: Direction;
  startUtc: string;
  endUtc: string;
};

type Credentials = {
  supabaseUrl: string;
  functionAuthKey: string;
  serviceRoleKey: string | null;
  checkpointEnabled: boolean;
};

type InvocationResult = {
  status: number;
  ok: boolean;
  body: Record<string, unknown>;
};

type CheckpointRow = {
  airport_iata: string;
  direction: string;
  window_start_utc: string;
  window_end_utc: string;
  status: CheckpointStatus;
  attempt_count: number;
  rows_upserted?: number;
  windows_requested?: number;
  windows_failed?: number;
  started_at_utc?: string | null;
  finished_at_utc?: string | null;
  last_error?: string | null;
  response_payload?: Record<string, unknown> | null;
};

type ExistingCheckpoint = {
  status: CheckpointStatus;
  attempt_count: number;
};

const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = process.cwd();
const ENV_MD_PATH = path.join(ROOT_DIR, "docs", "env.md");
const DAY_MS = 24 * 60 * 60 * 1000;
const CHECKPOINT_TABLE = "sync_backfill_checkpoints";

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const tasks = buildBackfillTasks(options);

  process.stdout.write("Backfill runner configuration:\n");
  process.stdout.write(`- Airport: ${options.airportIata}\n`);
  process.stdout.write(`- Direction: ${options.direction}\n`);
  process.stdout.write(`- From UTC: ${options.fromUtc}\n`);
  process.stdout.write(`- To UTC: ${options.toUtc}\n`);
  process.stdout.write(`- Delay between task calls: ${options.delayMs}ms\n`);
  process.stdout.write(`- Max retries per task: ${options.maxRetries}\n`);
  process.stdout.write(`- Resume: ${String(options.resume)}\n`);
  process.stdout.write(`- Dry run: ${String(options.dryRun)}\n`);
  process.stdout.write(`- Tasks planned: ${tasks.length}\n`);

  if (tasks.length === 0) {
    process.stdout.write("No tasks generated for the selected range.\n");
    return;
  }

  if (options.dryRun) {
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      process.stdout.write(`[${index + 1}/${tasks.length}] ${task.airportIata} ${task.direction} ${task.startUtc} -> ${task.endUtc}\n`);
    }
    return;
  }

  const credentials = await resolveCredentials();
  const resumeEnabled = options.resume && credentials.checkpointEnabled;

  if (!credentials.checkpointEnabled) {
    process.stdout.write("Checkpoint table updates are disabled (SUPABASE_SERVICE_ROLE_KEY not set).\n");
    if (options.resume) {
      process.stdout.write("Resume mode requested but disabled because checkpoint writes are unavailable.\n");
    }
  }

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  let rowsUpsertedTotal = 0;

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const taskLabel = `${task.airportIata} ${task.direction} ${task.startUtc} -> ${task.endUtc}`;

    const existing = resumeEnabled
      ? await getCheckpoint(credentials, task)
      : null;

    if (resumeEnabled && existing?.status === "succeeded") {
      skipped += 1;
      process.stdout.write(`[${index + 1}/${tasks.length}] SKIP ${taskLabel} (already succeeded)\n`);

      if (index < tasks.length - 1 && options.delayMs > 0) {
        await sleep(options.delayMs);
      }
      continue;
    }

    const baseAttemptCount = existing?.attempt_count ?? 0;
    let completed = false;

    for (let attempt = 1; attempt <= options.maxRetries + 1; attempt += 1) {
      const attemptCount = baseAttemptCount + attempt;
      if (credentials.checkpointEnabled) {
        await upsertCheckpoint(credentials, {
          airport_iata: task.airportIata,
          direction: task.direction,
          window_start_utc: task.startUtc,
          window_end_utc: task.endUtc,
          status: "running",
          attempt_count: attemptCount,
          started_at_utc: new Date().toISOString(),
          finished_at_utc: null,
          last_error: null,
        });
      }

      process.stdout.write(`[${index + 1}/${tasks.length}] RUN ${taskLabel} (attempt ${attempt}/${options.maxRetries + 1})\n`);

      try {
        const result = await invokeSyncFlights(credentials, task, options);
        const windowsFailed = pickInteger(result.body.windowsFailed) ?? 1;
        const rowsUpserted = pickInteger(result.body.rowsUpserted) ?? 0;
        const windowsRequested = pickInteger(result.body.windowsRequested) ?? 0;
        const isSuccess = result.ok && windowsFailed === 0;

        if (!isSuccess) {
          const message = pickString(result.body.error)
            ?? `sync-flights returned status=${result.status}, windowsFailed=${windowsFailed}`;
          throw new Error(message);
        }

        if (credentials.checkpointEnabled) {
          await upsertCheckpoint(credentials, {
            airport_iata: task.airportIata,
            direction: task.direction,
            window_start_utc: task.startUtc,
            window_end_utc: task.endUtc,
            status: "succeeded",
            attempt_count: attemptCount,
            rows_upserted: rowsUpserted,
            windows_requested: windowsRequested,
            windows_failed: windowsFailed,
            finished_at_utc: new Date().toISOString(),
            last_error: null,
            response_payload: result.body,
          });
        }

        succeeded += 1;
        rowsUpsertedTotal += rowsUpserted;
        completed = true;
        process.stdout.write(`  -> SUCCESS rowsUpserted=${rowsUpserted} windowsFailed=${windowsFailed}\n`);
        break;
      } catch (error) {
        const errorText = (error as Error).message;
        const exhausted = attempt > options.maxRetries;

        if (exhausted) {
          failed += 1;
          if (credentials.checkpointEnabled) {
            await upsertCheckpoint(credentials, {
              airport_iata: task.airportIata,
              direction: task.direction,
              window_start_utc: task.startUtc,
              window_end_utc: task.endUtc,
              status: "failed",
              attempt_count: attemptCount,
              finished_at_utc: new Date().toISOString(),
              last_error: errorText,
            });
          }

          process.stdout.write(`  -> FAILED ${errorText}\n`);
          break;
        }

        const retryDelayMs = computeRetryDelayMs(options.retryBaseDelayMs, attempt);
        process.stdout.write(`  -> RETRY in ${retryDelayMs}ms (${errorText})\n`);
        await sleep(retryDelayMs);
      }
    }

    if (index < tasks.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  process.stdout.write("\nBackfill runner finished.\n");
  process.stdout.write(`- Tasks: ${tasks.length}\n`);
  process.stdout.write(`- Succeeded: ${succeeded}\n`);
  process.stdout.write(`- Skipped: ${skipped}\n`);
  process.stdout.write(`- Failed: ${failed}\n`);
  process.stdout.write(`- Rows upserted total: ${rowsUpsertedTotal}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

function parseArgs(args: string[]): RunnerOptions {
  const options: RunnerOptions = {
    fromUtc: "2026-01-01T00:00:00Z",
    toUtc: new Date().toISOString(),
    airportIata: "YYZ",
    direction: "Departure",
    delayMs: 1500,
    maxRetries: 2,
    retryBaseDelayMs: 1000,
    resume: true,
    dryRun: false,
    withLeg: true,
    withCancelled: false,
    withLocation: true,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--no-resume") {
      options.resume = false;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const [rawKey, inlineValue] = splitArg(arg);
    const key = rawKey.slice(2);
    const value = inlineValue ?? args[index + 1];
    const consumesNext = inlineValue === null;

    if (value === undefined) {
      throw new Error(`Missing value for argument: --${key}`);
    }

    switch (key) {
      case "from":
        options.fromUtc = normalizeUtcInput(value);
        break;
      case "to":
        options.toUtc = normalizeUtcInput(value);
        break;
      case "airport":
        options.airportIata = value.toUpperCase();
        break;
      case "direction":
        options.direction = parseDirection(value);
        break;
      case "delay-ms":
        options.delayMs = parsePositiveInt(value, "delay-ms");
        break;
      case "max-retries":
        options.maxRetries = parseNonNegativeInt(value, "max-retries");
        break;
      case "retry-base-delay-ms":
        options.retryBaseDelayMs = parsePositiveInt(value, "retry-base-delay-ms");
        break;
      case "max-days":
        options.maxDays = parsePositiveInt(value, "max-days");
        break;
      case "resume":
        options.resume = parseBoolean(value, "resume");
        break;
      case "with-leg":
        options.withLeg = parseBoolean(value, "with-leg");
        break;
      case "with-cancelled":
        options.withCancelled = parseBoolean(value, "with-cancelled");
        break;
      case "with-location":
        options.withLocation = parseBoolean(value, "with-location");
        break;
      default:
        throw new Error(`Unknown argument: --${key}`);
    }

    if (consumesNext) {
      index += 1;
    }
  }

  if (!/^[A-Z]{3}$/.test(options.airportIata)) {
    throw new Error("--airport must be a 3-letter IATA code");
  }

  const fromDate = new Date(options.fromUtc);
  const toDate = new Date(options.toUtc);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("--from and --to must be valid ISO datetime values");
  }
  if (fromDate >= toDate) {
    throw new Error("--from must be before --to");
  }

  return options;
}

function splitArg(arg: string): [string, string | null] {
  const equalIndex = arg.indexOf("=");
  if (equalIndex === -1) {
    return [arg, null];
  }

  return [arg.slice(0, equalIndex), arg.slice(equalIndex + 1)];
}

function parseDirection(value: string): DirectionOption {
  const normalized = value.trim().toLowerCase();
  if (normalized === "departure") {
    return "Departure";
  }
  if (normalized === "arrival") {
    return "Arrival";
  }
  if (normalized === "both") {
    return "Both";
  }

  throw new Error("--direction must be Departure, Arrival, or Both");
}

function normalizeUtcInput(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00Z`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid UTC datetime: ${value}`);
  }
  return parsed.toISOString();
}

function parsePositiveInt(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return parsed;
}

function parseNonNegativeInt(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`--${name} must be a non-negative integer`);
  }
  return parsed;
}

function parseBoolean(value: string, name: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new Error(`--${name} must be true or false`);
}

function buildBackfillTasks(options: RunnerOptions): BackfillTask[] {
  const directions: Direction[] = options.direction === "Both"
    ? ["Departure", "Arrival"]
    : [options.direction];

  const tasks: BackfillTask[] = [];
  const end = new Date(options.toUtc);
  let cursor = new Date(options.fromUtc);
  let daysCreated = 0;

  while (cursor < end) {
    if (options.maxDays !== undefined && daysCreated >= options.maxDays) {
      break;
    }

    const dayEnd = new Date(Math.min(end.getTime(), startOfNextUtcDay(cursor).getTime()));
    const startIso = cursor.toISOString();
    const endIso = dayEnd.toISOString();

    for (const direction of directions) {
      tasks.push({
        airportIata: options.airportIata,
        direction,
        startUtc: startIso,
        endUtc: endIso,
      });
    }

    cursor = dayEnd;
    daysCreated += 1;
  }

  return tasks;
}

function startOfNextUtcDay(value: Date): Date {
  return new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  ));
}

async function resolveCredentials(): Promise<Credentials> {
  const fromEnvUrl = process.env.SUPABASE_URL?.trim();
  const fromEnvServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const fromEnvAnon = process.env.SUPABASE_ANON_KEY?.trim();
  const fromEnvMd = await readEnvMd();

  const supabaseUrl = fromEnvUrl ?? fromEnvMd.supabaseUrl;
  const serviceRoleKey = fromEnvServiceRole ?? null;
  const functionAuthKey = serviceRoleKey ?? fromEnvAnon ?? fromEnvMd.anonKey ?? null;

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL. Set SUPABASE_URL or keep docs/env.md with url.");
  }

  if (!functionAuthKey) {
    throw new Error(
      "Missing function auth key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY (or anon_key in docs/env.md)."
    );
  }

  return {
    supabaseUrl,
    functionAuthKey,
    serviceRoleKey,
    checkpointEnabled: Boolean(serviceRoleKey),
  };
}

async function readEnvMd(): Promise<{ supabaseUrl?: string; anonKey?: string }> {
  try {
    const text = await fs.readFile(ENV_MD_PATH, "utf8");
    const supabaseUrl = text.match(/url\s*=\s*(\S+)/i)?.[1]?.trim();
    const anonKey = text.match(/anon_key\s*=\s*(\S+)/i)?.[1]?.trim();
    return {
      supabaseUrl,
      anonKey,
    };
  } catch {
    return {};
  }
}

async function invokeSyncFlights(
  credentials: Credentials,
  task: BackfillTask,
  options: RunnerOptions
): Promise<InvocationResult> {
  const body = {
    airportIata: task.airportIata,
    direction: task.direction,
    withLeg: options.withLeg,
    withCancelled: options.withCancelled,
    withLocation: options.withLocation,
    startDateUtc: task.startUtc,
    endDateUtc: task.endUtc,
    mode: "backfill",
  };

  const response = await fetch(`${credentials.supabaseUrl}/functions/v1/sync-flights`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.functionAuthKey}`,
      apikey: credentials.functionAuthKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const bodyValue = safeJsonParse(text);

  if (typeof bodyValue !== "object" || bodyValue === null || Array.isArray(bodyValue)) {
    throw new Error(`sync-flights returned non-object response: ${text.slice(0, 500)}`);
  }

  return {
    status: response.status,
    ok: response.ok,
    body: bodyValue as Record<string, unknown>,
  };
}

async function getCheckpoint(
  credentials: Credentials,
  task: BackfillTask
): Promise<ExistingCheckpoint | null> {
  if (!credentials.serviceRoleKey) {
    throw new Error("Checkpoint read requires SUPABASE_SERVICE_ROLE_KEY");
  }

  const params = new URLSearchParams({
    select: "status,attempt_count",
    airport_iata: `eq.${task.airportIata}`,
    direction: `eq.${task.direction}`,
    window_start_utc: `eq.${task.startUtc}`,
    window_end_utc: `eq.${task.endUtc}`,
    limit: "1",
  });

  const response = await fetch(`${credentials.supabaseUrl}/rest/v1/${CHECKPOINT_TABLE}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${credentials.serviceRoleKey}`,
      apikey: credentials.serviceRoleKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Checkpoint read failed: HTTP ${response.status} ${text.slice(0, 300)}`);
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const status = pickCheckpointStatus(row.status);
  const attemptCount = pickInteger(row.attempt_count) ?? 0;

  return {
    status,
    attempt_count: attemptCount,
  };
}

async function upsertCheckpoint(credentials: Credentials, row: CheckpointRow): Promise<void> {
  if (!credentials.serviceRoleKey) {
    throw new Error("Checkpoint upsert requires SUPABASE_SERVICE_ROLE_KEY");
  }

  const response = await fetch(
    `${credentials.supabaseUrl}/rest/v1/${CHECKPOINT_TABLE}?on_conflict=airport_iata,direction,window_start_utc,window_end_utc`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.serviceRoleKey}`,
        apikey: credentials.serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([row]),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Checkpoint upsert failed: HTTP ${response.status} ${text.slice(0, 300)}`);
  }
}

function computeRetryDelayMs(baseDelayMs: number, attempt: number): number {
  const exponential = baseDelayMs * (2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 250);
  return exponential + jitter;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickCheckpointStatus(value: unknown): CheckpointStatus {
  const candidate = pickString(value);
  if (candidate === "pending" || candidate === "running" || candidate === "succeeded" || candidate === "failed" || candidate === "skipped") {
    return candidate;
  }
  return "pending";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printUsage(): void {
  process.stdout.write(
    [
      "Usage: npx tsx scripts/backfill-flights.ts [options]",
      "",
      "Options:",
      "  --from <iso-or-YYYY-MM-DD>           Default: 2026-01-01T00:00:00Z",
      "  --to <iso-or-YYYY-MM-DD>             Default: now (UTC)",
      "  --airport <IATA>                     Default: YYZ",
      "  --direction <Departure|Arrival|Both> Default: Both",
      "  --delay-ms <int>                     Default: 1500",
      "  --max-retries <int>                  Default: 2",
      "  --retry-base-delay-ms <int>          Default: 1000",
      "  --max-days <int>                     Optional safety cap",
      "  --resume <true|false>                Default: true",
      "  --no-resume                          Shortcut for --resume false",
      "  --dry-run                            Prints tasks without invoking function",
      "  --with-leg <true|false>              Default: true",
      "  --with-cancelled <true|false>        Default: false",
      "  --with-location <true|false>         Default: true",
      "  --help                               Show this help message",
      "",
      "Environment (recommended):",
      "  SUPABASE_URL",
      "  SUPABASE_SERVICE_ROLE_KEY",
      "",
      "Fallback (function invocation only):",
      "  SUPABASE_ANON_KEY or docs/env.md anon_key",
      "  (resume/checkpoints disabled without service-role key)",
      "",
    ].join("\n")
  );
}

main().catch((error) => {
  process.stderr.write(`Backfill runner failed: ${(error as Error).message}\n`);
  process.exit(1);
});
