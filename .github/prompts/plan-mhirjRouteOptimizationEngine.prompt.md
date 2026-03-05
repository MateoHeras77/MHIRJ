## Plan: Phase 1 Ingestion Foundation

Build one reusable Supabase Edge Function in TypeScript (`sync-flights`) and drive it through three triggers (historical runner, daily cron, server-side user trigger). First, confirm the AeroDataBox response contract with live samples, then create a schema that preserves the full payload in JSONB plus indexed metadata for upsert/query performance. Use UTC as the project time standard, run cron at 04:00 America/Toronto, and implement round-robin API-key usage to reduce throttling risk.

**Steps**
1. Phase A - API Contract Discovery (blocks all later phases)
2. Capture 2-3 representative AeroDataBox responses for YYZ departures using required params (`withLeg=true`, `direction=Departure`, `withCancelled=false`) for: a normal day, a high-volume day, and an edge case window.
3. Document exact response structure (including nested arrays/objects), nullability patterns, and fields needed for dedupe (`number`, `scheduledTime`, any stable identifier).
4. Define ingestion contract doc with request/response examples, rate-limit behavior observed, and retryable vs non-retryable errors.
5. Phase B - Database Schema & Migrations (*depends on Phase A*)
6. Create `raw_flights` table with full payload retention: `raw_payload JSONB NOT NULL` + metadata columns for ingestion control and search (for example: `flight_number`, `scheduled_time_utc`, `airport_iata`, `direction`, `source_key_id`, `ingested_at_utc`, `payload_hash`).
7. Add idempotency and performance constraints: primary key, unique constraint for upsert key, and indexes for date-window scans and flight lookup.
8. Add audit/replay support: ingest status, last_error, request window fields (`window_start_utc`, `window_end_utc`) so backfill and cron runs are traceable.
9. Phase C - Core Sync Function (“One Brain”) (*depends on Phase B*)
10. Implement `sync-flights` Edge Function with strict input contract (`startDateUtc`, `endDateUtc`, optional mode flag: `cron|backfill|manual`).
11. Implement AeroDataBox client with round-robin key selection across both API keys and automatic retry/backoff on `429`/transient failures.
12. Normalize only operational metadata (not business transforms), then upsert full payload rows using DB conflict target from Step 7.
13. Add structured logs/metrics per run: request count, rows inserted, rows updated, failures, elapsed time.
14. Phase D - Trigger Layer (*depends on Phase C; steps 15-17 can run in parallel*)
15. Historical backfill runner: day-by-day loop from `2026-01-01T00:00:00Z` to current UTC date, checkpointing progress and retrying failed days.
16. Daily cron setup: schedule at `04:00 America/Toronto`; enforce UTC windows inside function (project canonical time remains UTC).
17. Server-side user trigger: expose a protected server-side invoker (not browser-direct) that calls `sync-flights` with bounded windows and authorization.
18. Phase E - Validation & Operational Hardening (*depends on Phase D*)
19. Run dry-run and real-run validations for one day, one week, and one month ranges; verify no duplicates and full payload retention.
20. Validate backfill resumability by intentionally interrupting and resuming mid-range.
21. Confirm cron execution and user-trigger path produce identical ingestion behavior (same function, same dedupe rules).
22. Publish runbook: incident steps for rate limits, key exhaustion, and replaying failed windows.

**Relevant files**
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\Outcomes\Phase A\aerodatabox-contract.md` — API response contract, field map, rate-limit/error behavior.
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\Outcomes\Phase A\phaseA-samples\phaseA-summary.json` — machine-readable Phase A schema/nullability summary.
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\migrations\20260305_001_create_raw_flights.sql` — base table, constraints, indexes.
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\migrations\20260305_002_ingestion_audit_fields.sql` — run-window/audit columns if separated.
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\functions\sync-flights\index.ts` — single ingestion brain.
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\functions\_shared\aerodatabox-client.ts` — API client, round-robin key selection, retry logic.
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\scripts\backfill-flights.ts` — historical day-by-day runner.
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\migrations\20260305_003_schedule_daily_sync.sql` — cron job registration.
- `c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\docs\phase1-runbook.md` — operations, replay, troubleshooting.

**Verification**
1. API contract check: execute a live call for a known UTC window and verify the documented schema matches actual payload keys.
2. Migration validation: apply migrations on a clean database; confirm indexes, unique constraints, and JSONB column definitions.
3. Idempotency test: run `sync-flights` twice for the same window and verify second run performs updates/no duplicate inserts.
4. Backfill integrity test: run a 7-day backfill sample and verify contiguous coverage with no missing UTC days.
5. Rate-limit resilience test: simulate/observe `429` and confirm retry plus key rotation behave as expected.
6. Cron validation: confirm scheduled run executes at local 04:00 Toronto while persisted timestamps/windows remain UTC.
7. Trigger parity test: invoke via cron path and server-side user trigger path; compare run summaries for equivalent windows.

**Decisions**
- Confirmed: store all API fields via full `JSONB` payload retention, with additional metadata columns for performance/idempotency.
- Confirmed: canonical project time is UTC; backfill windows are UTC.
- Confirmed: cron target is 04:00 America/Toronto; UTC conversion handled internally.
- Confirmed: two AeroDataBox keys used in round-robin strategy.
- Confirmed: user-triggered sync must be server-side only (no direct browser invocation).
- Included scope: Phase 1 ingestion infra, backfill, automation, server-side trigger path.
- Excluded scope: analytics models, profitability logic, dashboards, ML.

**Further Considerations**
1. Upsert conflict key: prefer API-provided stable flight identifier if present; fallback to `(flight_number, scheduled_time_utc, airport_iata)`.
2. Retention strategy: keep raw payload indefinitely for Phase 2+ flexibility unless storage budget requires archival policy.
3. Secret hygiene: move credentials out of docs and into Supabase secrets/local env files before implementation starts.
