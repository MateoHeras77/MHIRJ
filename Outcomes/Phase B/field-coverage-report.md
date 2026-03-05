# Field Coverage Report - AeroDataBox vs Supabase

Generated: 2026-03-05
Project: `zuzireuxicdmuewkeuxu`

## 1) Live extraction test executed

Manual edge-function call executed with:
- `withLeg=true`
- `direction=Departure`
- `withCancelled=false`
- `withLocation=true`
- Window: `2026-03-04T11:00:00Z` to `2026-03-04T13:00:00Z`

Result:
- `ok=true`
- `rowsUpserted=130`
- `windowsFailed=0`

Contract-discovery sample refreshed at:
- `Outcomes/Phase A/phaseA-samples/phaseA-summary.json`

## 2) API body fields vs Supabase columns

Expected flattened coverage set used for comparison: 114 columns (movement/departure/arrival/flight/airline/aircraft/location leaves from API body).

Comparison result against `public.raw_flights`:
- Expected columns: `114`
- Present columns: `114`
- Missing columns: `0`

Conclusion: the table now has all requested flattened columns from the provided API body list.

## 3) Why some columns still look empty

Even with `withLocation=true` enabled, many fields are still null because AeroDataBox did not return those keys for this airport/time window.

Observed from `raw_payload` for the tested window (`130` rows):
- `raw_payload.location.*`: `0` rows present
- `raw_payload.departure.predictedTime.utc`: `0` rows present
- `raw_payload.departure.checkInDesk`: `0` rows present
- `raw_payload.movement.*`: `0` rows present

This means the pipeline and schema are ready, but the source response did not include those fields in this sample.

## 4) Changes applied

- Migration added full flattened contract columns:
  - `supabase/migrations/20260305_004_add_full_airport_flights_columns.sql`
- Edge function updated to map and upsert all requested field groups:
  - `supabase/functions/sync-flights/index.ts`
- API client updated to request live location explicitly:
  - `supabase/functions/_shared/aerodatabox-client.ts`
- Contract discovery script updated to include `withLocation=true`:
  - `scripts/phaseA-contract-discovery.ts`

## 5) Verification pointers

- Current table column count: `136` total columns in `public.raw_flights`.
- Tested request URL now includes `withLocation=true`.
- `verify_jwt=false` remains active for `sync-flights` as requested for manual testing.
