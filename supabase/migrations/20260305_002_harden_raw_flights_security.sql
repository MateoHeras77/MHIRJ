-- Phase 1 hardening: enforce RLS and immutable function search_path.

create or replace function public.raw_flights_set_updated_at_utc()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at_utc := now();
  return new;
end;
$$;

alter table public.raw_flights enable row level security;

-- No anon/authenticated policies are created on purpose.
-- Table is intended for server-side ingestion and access paths only.
