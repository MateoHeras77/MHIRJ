Plan: Phase 1 Ingestion Foundation
Build one TypeScript Supabase Edge Function (sync-flights) as the single ingestion brain, then attach three triggers to it (historical runner, cron, server-side user trigger). Start with live API contract inspection, then lock DB schema to retain the full AeroDataBox payload (JSONB) plus indexed metadata for idempotency and performance.

Status Update (2026-03-05)
Step 1 complete: Phase A artifacts now write to `Outcomes\Phase A`.
Step 2 complete: initial migration created at `supabase\migrations\20260305_001_create_raw_flights.sql`.
Step 3 complete: `sync-flights` edge function deployed to project `zuzireuxicdmuewkeuxu`.
Applied migrations in Supabase:
- `20260305202553 create_raw_flights`
- `20260305203015 harden_raw_flights_security`
Step 4 manual test complete: `sync-flights` invoked for `2026-03-04T11:00:00Z` to `2026-03-04T13:00:00Z` with `rowsUpserted=130` and stored rows verified in `public.raw_flights`.
Temporary test setting: edge function is currently deployed with `verify_jwt=false` (to be re-enabled before production use).

<!-- Steps
API Contract Discovery (blocks all other work)
Run live AeroDataBox test calls for YYZ departures (withLeg=true, direction=Departure, withCancelled=false) and document actual payload shape, nullability, and stable identifiers. -->

<!-- Schema Design + Migration (depends on 1)
Create raw_flights with full payload retention (raw_payload JSONB) and operational columns (flight_number, scheduled_time_utc, airport_iata, ingest timestamps, request window, key source, status/error fields). -->

<!-- Idempotency + Indexing (depends on 2)
Add unique conflict key for upsert and indexes for date-window scans + flight lookup; ensure duplicate runs cannot create duplicate rows. -->

Core Edge Function (sync-flights) (depends on 2-3)
Implement strict input contract (startDateUtc, endDateUtc, optional mode), call AeroDataBox, keep payload raw, and upsert records.

Two-Key Rate-Limit Strategy (depends on 4)
Implement round-robin API-key selection across both AeroDataBox keys with retry/backoff on 429 and transient failures.

Historical Backfill Runner (depends on 4-5)
Build day-by-day runner from 2026-01-01T00:00:00Z to current UTC date with checkpointing and resumable retries.

Daily Cron Automation (depends on 4-5)
Schedule at 04:00 America/Toronto, but enforce all internal windows/timestamps in UTC.

Server-Side User Trigger (parallel with 7, depends on 4-5)
Add protected server-side invoker (no direct browser call) that triggers bounded sync windows.

Validation + Runbook (depends on 6-8)
Verify idempotency, backfill continuity, cron reliability, and trigger parity; document replay/recovery procedures.

Relevant Files
c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\Outcomes\Phase A\aerodatabox-contract.md - API response contract and field map
c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\Outcomes\Phase A\phaseA-samples\phaseA-summary.json - machine-readable contract summary and nullability stats
c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\migrations\20260305_001_create_raw_flights.sql - table, constraints, indexes
c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\functions\sync-flights\index.ts - single ingestion function
c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\functions\_shared\aerodatabox-client.ts - key rotation + retry logic
c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\scripts\backfill-flights.ts - historical runner
c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\supabase\migrations\20260305_003_schedule_daily_sync.sql - cron registration
c:\Users\wmate\OneDrive\GitHub\Windows\MHIRJ\docs\phase1-runbook.md - ops and recovery procedures
Verification
Live API schema check vs contract doc.
Migration apply on clean DB; verify indexes + unique keys.
Run same window twice; confirm no duplicates.
Run 7-day backfill sample; verify no missing UTC days.
Force/observe rate-limit behavior; confirm retry + key rotation.
Confirm cron fires at 04:00 Toronto while persisted windows stay UTC.
Confirm cron path and user-trigger path produce consistent outcomes.
Decisions Captured
Store all API fields via full JSON payload retention (JSONB) plus metadata columns.
Canonical project time is UTC (including backfill windows).
Cron target is 04:00 America/Toronto.
Use round-robin across the 2 AeroDataBox keys.
User-triggered sync is server-side only.