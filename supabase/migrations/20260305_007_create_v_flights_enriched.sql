-- Phase 1.5 / Step 7: Create analytical view v_flights_enriched
--
-- Adds derived columns on top of raw_flights for Phase 2 analysis. No changes to
-- the raw table. All transformations are expressed in SQL so the view stays in sync
-- automatically as new data is upserted.
--
-- Derived columns:
--   route_code           "YYZ-YUL" style identifier for grouping by route
--   flight_date          dep_scheduled_utc truncated to date (UTC)
--   day_of_week          0 = Sunday … 6 = Saturday
--   week_number          ISO week number (1–53)
--   month_number         1–12
--   dep_delay_min        (revised − scheduled) in whole minutes; NULL when unknown
--   scheduled_block_min  (arr_scheduled − dep_scheduled) in whole minutes; NULL when unknown
--   aircraft_category    CRJ | Turboprop | Regional Jet | Narrowbody | Widebody |
--                        Business Jet | General Aviation | Other | NULL
--   is_crj               TRUE when aircraft is in the CRJ family
--   is_turboprop         TRUE when aircraft is a turboprop (upgrade opportunity)
--   is_regional_jet      TRUE when aircraft is an Embraer E-Series regional jet
--                        (direct CRJ competitor)

create or replace view public.v_flights_enriched as
with base as (
  select
    r.*,

    -- ── Route & time partitions ───────────────────────────────────────────────
    (r.airport_iata || '-' || r.arr_airport_iata)::text        as route_code,
    r.dep_scheduled_utc::date                                  as flight_date,
    extract(dow   from r.dep_scheduled_utc)::int               as day_of_week,
    extract(week  from r.dep_scheduled_utc)::int               as week_number,
    extract(month from r.dep_scheduled_utc)::int               as month_number,

    -- ── Departure delay ───────────────────────────────────────────────────────
    case
      when r.dep_revised_utc  is not null
       and r.dep_scheduled_utc is not null
      then round(
             extract(epoch from (r.dep_revised_utc - r.dep_scheduled_utc)) / 60.0
           )::int
    end as dep_delay_min,

    -- ── Scheduled block time (gate-to-gate) ──────────────────────────────────
    case
      when r.arr_scheduled_utc  is not null
       and r.dep_scheduled_utc  is not null
      then round(
             extract(epoch from (r.arr_scheduled_utc - r.dep_scheduled_utc)) / 60.0
           )::int
    end as scheduled_block_min,

    -- ── Aircraft category ─────────────────────────────────────────────────────
    -- Order matters: more-specific patterns must come before broader ones.
    case
      -- 1. CRJ Family (MHIRJ product lines)
      when r.aircraft_model ilike '%CRJ%'
        or r.aircraft_model ilike '%Canadair Regional Jet%'
        or r.aircraft_model ilike '%Canadair reg jet%'
        then 'CRJ'

      -- 2. Turboprop (routes where a CRJ upgrade opportunity exists)
      when r.aircraft_model ilike '%DHC-8%'
        or r.aircraft_model ilike '%Dash 8%'
        or r.aircraft_model ilike '%Q400%'
        or r.aircraft_model ilike '%Q300%'
        or r.aircraft_model ilike '%ATR%'
        or r.aircraft_model ilike '%Beechcraft 1900%'
        or r.aircraft_model ilike '%Beech 1900%'
        or r.aircraft_model in ('DH8A', 'DHC7')
        then 'Turboprop'

      -- 3. Business Jet — checked BEFORE Embraer regional jets to prevent
      --    Phenom/Legacy/Praetor from being caught by the '%Embraer%' pattern.
      when r.aircraft_model ilike '%Phenom%'
        or r.aircraft_model ilike '%Pheom%'       -- typo present in raw data
        or r.aircraft_model ilike '%Legacy%'
        or r.aircraft_model ilike '%Praetor%'
        or r.aircraft_model ilike '%Citation%'
        or r.aircraft_model ilike '%Challenger%'
        or r.aircraft_model ilike '%Global%'
        or r.aircraft_model ilike '%Learjet%'
        or r.aircraft_model ilike '%Gulfstream%'
        or r.aircraft_model ilike '%Hawker%'
        or r.aircraft_model ilike '%King Air%'
        or r.aircraft_model ilike '%Pilatus%'
        or r.aircraft_model ilike '%Piaggio%'
        or r.aircraft_model ilike '%Falcon%'
        or r.aircraft_model in ('E545', 'C700', 'GL7T', 'ASTR', 'EMB-545')
        then 'Business Jet'

      -- 4. Regional Jet — Embraer E-Series (direct CRJ competitors: 70-130 seats)
      when r.aircraft_model ilike '%Embraer%'
        or r.aircraft_model ilike '%EMB-%'
        or r.aircraft_model in ('E295')
        then 'Regional Jet'

      -- 5. Narrowbody (single-aisle mainline jets)
      when r.aircraft_model ilike '%737%'
        or r.aircraft_model ilike '%A319%'
        or r.aircraft_model ilike '%A320%'
        or r.aircraft_model ilike '%A321%'
        or r.aircraft_model ilike '%A220%'
        or r.aircraft_model ilike '%757%'
        or r.aircraft_model ilike '%Fokker 100%'
        or r.aircraft_model in ('BCS3')           -- ICAO type code for A220-300
        then 'Narrowbody'

      -- 6. Widebody (twin-aisle long-haul jets)
      when r.aircraft_model ilike '%777%'
        or r.aircraft_model ilike '%787%'
        or r.aircraft_model ilike '%A330%'
        or r.aircraft_model ilike '%A340%'
        or r.aircraft_model ilike '%A350%'
        or r.aircraft_model ilike '%A380%'
        or r.aircraft_model ilike '%747%'
        or r.aircraft_model ilike '%767%'
        or r.aircraft_model ilike '%IL-62%'
        or r.aircraft_model in ('B777-300')
        then 'Widebody'

      -- 7. General Aviation (helicopters, piston singles, small turboprops)
      when r.aircraft_model ilike '%Bell %'
        or r.aircraft_model ilike '%Eurocopter%'
        or r.aircraft_model ilike '%Robinson%'
        or r.aircraft_model ilike '%Diamond%'
        or r.aircraft_model ilike '%Beaver%'
        or r.aircraft_model ilike '%Caravan%'
        or r.aircraft_model ilike '%Cessna 172%'
        or r.aircraft_model ilike '%Twin Otter%'
        or r.aircraft_model ilike '%AgustaWestland%'
        then 'General Aviation'

      when r.aircraft_model is null then null
      else 'Other'
    end as aircraft_category

  from public.raw_flights r
)
select
  *,
  (aircraft_category = 'CRJ')          as is_crj,
  (aircraft_category = 'Turboprop')    as is_turboprop,
  (aircraft_category = 'Regional Jet') as is_regional_jet
from base;

-- Service role access (matches raw_flights RLS policy).
-- Extend to 'authenticated' once the frontend auth layer is configured.
grant select on public.v_flights_enriched to service_role;
