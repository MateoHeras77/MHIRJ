-- Phase 1 / Step 6: Rebuild raw_flights with a clean, direct 1:1 AeroDataBox schema.
--
-- Rationale: the prior design flattened ~115 columns with 70-90% NULL fill because
-- AeroDataBox omits optional fields for most flights. This migration drops that table
-- and replaces it with a flat structure that maps directly from the API JSON paths.
--
-- Naming convention:
--   dep_*  → departure.*  fields
--   arr_*  → arrival.*   fields
--   No movement.* (redundant with departure.*/arrival.*).
--   No aircraft image fields (URL noise, not analytical data).
--   raw_payload kept as a hidden backup for future schema evolution.

drop table if exists public.raw_flights cascade;
drop function if exists public.raw_flights_set_updated_at_utc() cascade;

create table public.raw_flights (
  id                          bigint       generated always as identity primary key,

  -- Ingestion metadata
  flight_identity_key         text         not null,
  airport_iata                text         not null,
  direction                   text         not null default 'Departure',
  ingest_mode                 text         not null default 'manual',
  ingested_at_utc             timestamptz  not null default now(),

  -- Flight core
  flight_number               text         not null,
  call_sign                   text,
  status                      text,
  codeshare_status            text,
  is_cargo                    boolean,

  -- Airline
  airline_name                text,
  airline_iata                text,
  airline_icao                text,

  -- Aircraft (no image fields)
  aircraft_reg                text,
  aircraft_mode_s             text,
  aircraft_model              text,

  -- Departure airport
  dep_airport_icao            text,
  dep_airport_iata            text,
  dep_airport_local_code      text,
  dep_airport_name            text,
  dep_airport_short_name      text,
  dep_airport_municipality    text,
  dep_airport_country_code    text,
  dep_airport_lat             double precision,
  dep_airport_lon             double precision,
  dep_airport_timezone        text,

  -- Departure timing & operations
  dep_scheduled_utc           timestamptz  not null,
  dep_scheduled_local         timestamp without time zone,
  dep_revised_utc             timestamptz,
  dep_revised_local           timestamp without time zone,
  dep_predicted_utc           timestamptz,
  dep_predicted_local         timestamp without time zone,
  dep_runway_utc              timestamptz,
  dep_runway_local            timestamp without time zone,
  dep_terminal                text,
  dep_gate                    text,
  dep_check_in_desk           text,
  dep_baggage_belt            text,
  dep_runway                  text,
  dep_quality                 text[],

  -- Arrival airport
  arr_airport_icao            text,
  arr_airport_iata            text,
  arr_airport_local_code      text,
  arr_airport_name            text,
  arr_airport_short_name      text,
  arr_airport_municipality    text,
  arr_airport_country_code    text,
  arr_airport_lat             double precision,
  arr_airport_lon             double precision,
  arr_airport_timezone        text,

  -- Arrival timing & operations
  arr_scheduled_utc           timestamptz,
  arr_scheduled_local         timestamp without time zone,
  arr_revised_utc             timestamptz,
  arr_revised_local           timestamp without time zone,
  arr_predicted_utc           timestamptz,
  arr_predicted_local         timestamp without time zone,
  arr_runway_utc              timestamptz,
  arr_runway_local            timestamp without time zone,
  arr_terminal                text,
  arr_gate                    text,
  arr_check_in_desk           text,
  arr_baggage_belt            text,
  arr_runway                  text,
  arr_quality                 text[],

  -- Live location (sparse for historical data; populated for live/tracked flights)
  location_lat                double precision,
  location_lon                double precision,
  location_reported_at_utc    timestamptz,
  location_pressure_alt_m     double precision,
  location_pressure_alt_km    double precision,
  location_pressure_alt_mi    double precision,
  location_pressure_alt_nm    double precision,
  location_pressure_alt_ft    double precision,
  location_altitude_m         double precision,
  location_altitude_km        double precision,
  location_altitude_mi        double precision,
  location_altitude_nm        double precision,
  location_altitude_ft        double precision,
  location_pressure_hpa       double precision,
  location_pressure_inhg      double precision,
  location_pressure_mmhg      double precision,
  location_speed_kt           double precision,
  location_speed_kmh          double precision,
  location_speed_mph          double precision,
  location_speed_ms           double precision,
  location_track_deg          double precision,
  location_track_rad          double precision,
  location_vsi_fpm            integer,

  -- Full raw API object (hidden backup for schema evolution)
  raw_payload                 jsonb        not null,

  constraint raw_flights_identity_uk
    unique (flight_identity_key),
  constraint raw_flights_airport_iata_chk
    check (airport_iata ~ '^[A-Z]{3}$'),
  constraint raw_flights_direction_chk
    check (direction in ('Departure', 'Arrival')),
  constraint raw_flights_payload_object_chk
    check (jsonb_typeof(raw_payload) = 'object')
);

-- Date-range queries: most common access pattern
create index raw_flights_date_idx
  on public.raw_flights (airport_iata, dep_scheduled_utc);

-- Flight number lookup
create index raw_flights_flight_number_idx
  on public.raw_flights (flight_number);

-- Destination airport filter
create index raw_flights_arr_airport_idx
  on public.raw_flights (arr_airport_iata);

alter table public.raw_flights enable row level security;

create policy raw_flights_service_role_all
  on public.raw_flights
  for all
  to service_role
  using (true)
  with check (true);
