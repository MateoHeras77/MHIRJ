-- Phase 1 extension: persist additional timing and live-location fields for queryable access.
-- Full payload remains in raw_payload JSONB; these columns are promoted for analytics/filtering.

alter table public.raw_flights
  add column if not exists departure_revised_time_utc timestamptz,
  add column if not exists departure_predicted_time_utc timestamptz,
  add column if not exists departure_runway_time_utc timestamptz,
  add column if not exists arrival_revised_time_utc timestamptz,
  add column if not exists arrival_predicted_time_utc timestamptz,
  add column if not exists arrival_runway_time_utc timestamptz,
  add column if not exists location_reported_at_utc timestamptz,
  add column if not exists location_lat double precision,
  add column if not exists location_lon double precision;

comment on column public.raw_flights.departure_revised_time_utc is
  'Extracted from raw_payload.departure.revisedTime.utc when present.';

comment on column public.raw_flights.departure_predicted_time_utc is
  'Extracted from raw_payload.departure.predictedTime.utc when present.';

comment on column public.raw_flights.departure_runway_time_utc is
  'Extracted from raw_payload.departure.runwayTime.utc when present.';

comment on column public.raw_flights.arrival_revised_time_utc is
  'Extracted from raw_payload.arrival.revisedTime.utc when present.';

comment on column public.raw_flights.arrival_predicted_time_utc is
  'Extracted from raw_payload.arrival.predictedTime.utc when present.';

comment on column public.raw_flights.arrival_runway_time_utc is
  'Extracted from raw_payload.arrival.runwayTime.utc when present.';

comment on column public.raw_flights.location_reported_at_utc is
  'Extracted from raw_payload.location.reportedAtUtc when live location is provided.';

comment on column public.raw_flights.location_lat is
  'Extracted from raw_payload.location.lat when live location is provided.';

comment on column public.raw_flights.location_lon is
  'Extracted from raw_payload.location.lon when live location is provided.';
