-- Phase 1 / Step 2: Schema design for raw AeroDataBox FIDS ingestion.
-- Strategy: keep every flight payload as JSONB and add operational metadata for idempotency and query speed.

create extension if not exists pgcrypto;

create table if not exists public.raw_flights (
  id bigint generated always as identity primary key,

  -- Ingestion run context
  ingestion_run_id uuid not null default gen_random_uuid(),
  source text not null default 'aerodatabox.fids',
  airport_iata text not null,
  direction text not null default 'Departure',
  source_window_start_local timestamp without time zone not null,
  source_window_end_local timestamp without time zone not null,
  source_window_timezone text not null default 'America/Toronto',
  source_window_start_utc timestamptz not null,
  source_window_end_utc timestamptz not null,
  with_leg boolean not null default true,
  with_cancelled boolean not null default false,
  source_key_alias text,
  request_url text,
  http_status integer,
  ingestion_status text not null default 'ingested',
  last_error text,
  ingested_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),

  -- Extracted operational fields from payload (for fast filtering and upsert)
  flight_identity_key text not null,
  flight_number text not null,
  departure_scheduled_time_utc timestamptz not null,
  departure_scheduled_time_local timestamp without time zone,
  arrival_airport_iata text,
  arrival_scheduled_time_utc timestamptz,
  call_sign text,
  status text,
  codeshare_status text,
  is_cargo boolean,
  airline_iata text,
  airline_icao text,
  aircraft_reg text,
  aircraft_model text,
  departure_terminal text,
  departure_gate text,

  -- Full raw payload retention
  payload_hash text not null,
  raw_payload jsonb not null,

  constraint raw_flights_airport_iata_chk
    check (airport_iata ~ '^[A-Z]{3}$'),
  constraint raw_flights_direction_chk
    check (direction in ('Departure', 'Arrival', 'Both')),
  constraint raw_flights_window_local_chk
    check (source_window_end_local > source_window_start_local),
  constraint raw_flights_window_utc_chk
    check (source_window_end_utc > source_window_start_utc),
  constraint raw_flights_ingestion_status_chk
    check (ingestion_status in ('ingested', 'error')),
  constraint raw_flights_flight_identity_nonempty_chk
    check (btrim(flight_identity_key) <> ''),
  constraint raw_flights_payload_hash_nonempty_chk
    check (btrim(payload_hash) <> ''),
  constraint raw_flights_payload_object_chk
    check (jsonb_typeof(raw_payload) = 'object'),
  constraint raw_flights_flight_identity_key_uk
    unique (flight_identity_key)
);

create or replace function public.raw_flights_set_updated_at_utc()
returns trigger
language plpgsql
as $$
begin
  new.updated_at_utc := now();
  return new;
end;
$$;

drop trigger if exists raw_flights_set_updated_at_utc on public.raw_flights;

create trigger raw_flights_set_updated_at_utc
before update on public.raw_flights
for each row
execute function public.raw_flights_set_updated_at_utc();

create index if not exists raw_flights_ingestion_run_id_idx
  on public.raw_flights (ingestion_run_id);

create index if not exists raw_flights_airport_direction_sched_idx
  on public.raw_flights (airport_iata, direction, departure_scheduled_time_utc desc);

create index if not exists raw_flights_flight_number_sched_idx
  on public.raw_flights (flight_number, departure_scheduled_time_utc desc);

create index if not exists raw_flights_arrival_airport_sched_idx
  on public.raw_flights (arrival_airport_iata, departure_scheduled_time_utc desc);

create index if not exists raw_flights_status_sched_idx
  on public.raw_flights (status, departure_scheduled_time_utc desc);

create index if not exists raw_flights_ingested_at_idx
  on public.raw_flights (ingested_at_utc desc);

create index if not exists raw_flights_error_updated_idx
  on public.raw_flights (updated_at_utc desc)
  where ingestion_status = 'error';

create index if not exists raw_flights_payload_hash_idx
  on public.raw_flights (payload_hash);

create index if not exists raw_flights_payload_gin_idx
  on public.raw_flights
  using gin (raw_payload jsonb_path_ops);

comment on table public.raw_flights is
  'Raw AeroDataBox FIDS departures/arrivals payloads with ingestion metadata and idempotency key.';

comment on column public.raw_flights.flight_identity_key is
  'Application-computed idempotency key; recommended pattern: airport_iata|direction|number|departure.scheduledTime.utc|coalesce(arrival.airport.iata,''NA'').';

comment on column public.raw_flights.raw_payload is
  'Full unmodified flight object from AeroDataBox response.';
