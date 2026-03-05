-- Phase 1 extension: checkpoint table for resumable historical backfill runs.

create extension if not exists pgcrypto;

create table if not exists public.sync_backfill_checkpoints (
  id bigint generated always as identity primary key,
  run_id uuid not null default gen_random_uuid(),
  airport_iata text not null,
  direction text not null,
  window_start_utc timestamptz not null,
  window_end_utc timestamptz not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  rows_upserted integer not null default 0,
  windows_requested integer,
  windows_failed integer,
  started_at_utc timestamptz,
  finished_at_utc timestamptz,
  last_error text,
  response_payload jsonb,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),

  constraint sync_backfill_checkpoints_airport_iata_chk
    check (airport_iata ~ '^[A-Z]{3}$'),
  constraint sync_backfill_checkpoints_direction_chk
    check (direction in ('Departure', 'Arrival')),
  constraint sync_backfill_checkpoints_window_chk
    check (window_end_utc > window_start_utc),
  constraint sync_backfill_checkpoints_status_chk
    check (status in ('pending', 'running', 'succeeded', 'failed', 'skipped')),
  constraint sync_backfill_checkpoints_attempt_count_chk
    check (attempt_count >= 0),
  constraint sync_backfill_checkpoints_rows_upserted_chk
    check (rows_upserted >= 0),
  constraint sync_backfill_checkpoints_windows_requested_chk
    check (windows_requested is null or windows_requested >= 0),
  constraint sync_backfill_checkpoints_windows_failed_chk
    check (windows_failed is null or windows_failed >= 0),
  constraint sync_backfill_checkpoints_response_payload_chk
    check (response_payload is null or jsonb_typeof(response_payload) = 'object'),
  constraint sync_backfill_checkpoints_window_uk
    unique (airport_iata, direction, window_start_utc, window_end_utc)
);

create or replace function public.sync_backfill_checkpoints_set_updated_at_utc()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at_utc := now();
  return new;
end;
$$;

drop trigger if exists sync_backfill_checkpoints_set_updated_at_utc on public.sync_backfill_checkpoints;

create trigger sync_backfill_checkpoints_set_updated_at_utc
before update on public.sync_backfill_checkpoints
for each row
execute function public.sync_backfill_checkpoints_set_updated_at_utc();

create index if not exists sync_backfill_checkpoints_status_window_idx
  on public.sync_backfill_checkpoints (status, window_start_utc);

create index if not exists sync_backfill_checkpoints_direction_window_idx
  on public.sync_backfill_checkpoints (direction, window_start_utc);

create index if not exists sync_backfill_checkpoints_failed_window_idx
  on public.sync_backfill_checkpoints (window_start_utc)
  where status = 'failed';

alter table public.sync_backfill_checkpoints enable row level security;

comment on table public.sync_backfill_checkpoints is
  'Checkpoint records for historical sync-flights backfill windows (day and direction).';

comment on column public.sync_backfill_checkpoints.response_payload is
  'Last edge-function response summary payload captured by the orchestrator.';
