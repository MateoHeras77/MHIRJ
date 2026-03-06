-- Phase 3 / Executive polish foundation.
--
-- Goals:
-- 1. Base analytics on physical operating flights, not marketing codeshares.
-- 2. Normalize executive-facing airline labels for cleaner scorecards.
-- 3. Add conservative CRJ suitability bands using scheduled block time.
-- 4. Expose summary metadata used by the dashboard, fleet, and opportunity pages.

create or replace function public.normalize_operator_airline_name(raw_airline_name text, raw_airline_iata text)
returns text
language sql
immutable
as $$
  select case
    when raw_airline_name is null and raw_airline_iata is null then null
    when coalesce(raw_airline_iata, '') = 'PD' or raw_airline_name ilike 'Porter%' then 'Porter'
    when coalesce(raw_airline_iata, '') = 'MQ' or raw_airline_name ilike 'Envoy%' then 'Envoy Air'
    when coalesce(raw_airline_iata, '') = 'OH' or raw_airline_name ilike 'PSA%' then 'PSA Airlines'
    when coalesce(raw_airline_iata, '') = '9E' or raw_airline_name ilike 'Endeavor%' then 'Endeavor Air'
    when coalesce(raw_airline_iata, '') = 'QK' or raw_airline_name ilike 'Jazz%' then 'Jazz'
    when coalesce(raw_airline_iata, '') = 'OO' or raw_airline_name ilike 'SkyWest%' then 'SkyWest'
    when raw_airline_name = 'Porter Airlines' then 'Porter'
    when raw_airline_name = 'Delta Air Lines' then 'Delta'
    else raw_airline_name
  end;
$$;

create or replace function public.normalize_airline_display_name(operator_airline_name text, raw_airline_iata text)
returns text
language sql
immutable
as $$
  select case
    when operator_airline_name is null and raw_airline_iata is null then null
    when coalesce(raw_airline_iata, '') in ('MQ', 'OH') then 'American'
    when coalesce(raw_airline_iata, '') = '9E' then 'Delta'
    when coalesce(raw_airline_iata, '') = 'QK' then 'Air Canada'
    when coalesce(raw_airline_iata, '') = 'PD' then 'Porter'
    when operator_airline_name in ('Envoy Air', 'PSA Airlines') then 'American'
    when operator_airline_name = 'Endeavor Air' then 'Delta'
    when operator_airline_name = 'Jazz' then 'Air Canada'
    else operator_airline_name
  end;
$$;

create or replace function public.normalize_aircraft_generation(raw_aircraft_model text)
returns text
language sql
immutable
as $$
  select case
    when raw_aircraft_model is null then null
    when raw_aircraft_model ilike '%E2%' or raw_aircraft_model = 'E295' then 'Next Gen'
    when raw_aircraft_model ilike '%Embraer%' or raw_aircraft_model ilike '%ERJ%' then 'Classic E-Jet'
    when raw_aircraft_model ilike '%CRJ%' then 'CRJ Family'
    when raw_aircraft_model ilike '%Q400%'
      or raw_aircraft_model ilike '%Dash 8%'
      or raw_aircraft_model ilike '%ATR%'
      or raw_aircraft_model ilike '%DHC-8%' then 'Turboprop'
    else null
  end;
$$;

drop materialized view if exists public.v_opportunity_routes cascade;
drop materialized view if exists public.v_opportunity_airlines cascade;
drop materialized view if exists public.v_opportunity_summary cascade;
drop materialized view if exists public.v_airline_category_matrix cascade;
drop materialized view if exists public.v_top_aircraft_models cascade;
drop materialized view if exists public.v_monthly_category cascade;
drop materialized view if exists public.v_dow_volume cascade;
drop materialized view if exists public.v_airline_performance cascade;
drop materialized view if exists public.v_top_routes cascade;
drop materialized view if exists public.v_daily_volume cascade;
drop materialized view if exists public.v_category_breakdown cascade;
drop materialized view if exists public.v_executive_summary cascade;
drop view if exists public.v_flights_enriched cascade;

create view public.v_flights_enriched as
with base as (
  select
    r.*,

    (r.airport_iata || '-' || r.arr_airport_iata)::text as route_code,
    r.dep_scheduled_utc::date as flight_date,
    extract(dow from r.dep_scheduled_utc)::int as day_of_week,
    extract(week from r.dep_scheduled_utc)::int as week_number,
    extract(month from r.dep_scheduled_utc)::int as month_number,

    case
      when r.dep_revised_utc is not null and r.dep_scheduled_utc is not null
      then round(extract(epoch from (r.dep_revised_utc - r.dep_scheduled_utc)) / 60.0)::int
    end as dep_delay_min,

    case
      when r.arr_scheduled_utc is not null and r.dep_scheduled_utc is not null
      then round(extract(epoch from (r.arr_scheduled_utc - r.dep_scheduled_utc)) / 60.0)::int
    end as scheduled_block_min,

    public.normalize_operator_airline_name(r.airline_name, r.airline_iata) as operator_airline_name,
    public.normalize_airline_display_name(
      public.normalize_operator_airline_name(r.airline_name, r.airline_iata),
      r.airline_iata
    ) as airline_display_name,
    public.normalize_aircraft_generation(r.aircraft_model) as aircraft_generation,

    case
      when r.aircraft_model ilike '%CRJ%'
        or r.aircraft_model ilike '%Canadair Regional Jet%'
        or r.aircraft_model ilike '%Canadair reg jet%'
        then 'CRJ'

      when r.aircraft_model ilike '%DHC-8%'
        or r.aircraft_model ilike '%Dash 8%'
        or r.aircraft_model ilike '%Q400%'
        or r.aircraft_model ilike '%Q300%'
        or r.aircraft_model ilike '%ATR%'
        or r.aircraft_model ilike '%Beechcraft 1900%'
        or r.aircraft_model ilike '%Beech 1900%'
        or r.aircraft_model in ('DH8A', 'DHC7')
        then 'Turboprop'

      when r.aircraft_model ilike '%Phenom%'
        or r.aircraft_model ilike '%Pheom%'
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

      when r.aircraft_model ilike '%Embraer%'
        or r.aircraft_model ilike '%EMB-%'
        or r.aircraft_model in ('E295')
        then 'Regional Jet'

      when r.aircraft_model ilike '%737%'
        or r.aircraft_model ilike '%A319%'
        or r.aircraft_model ilike '%A320%'
        or r.aircraft_model ilike '%A321%'
        or r.aircraft_model ilike '%A220%'
        or r.aircraft_model ilike '%757%'
        or r.aircraft_model ilike '%Fokker 100%'
        or r.aircraft_model in ('BCS3')
        then 'Narrowbody'

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
  (coalesce(codeshare_status, 'IsOperator') = 'IsOperator') as is_operating_flight,
  (aircraft_category = 'CRJ') as is_crj,
  (aircraft_category = 'Turboprop') as is_turboprop,
  (aircraft_category = 'Regional Jet') as is_regional_jet,
  (aircraft_category in ('Turboprop', 'Regional Jet')) as is_opportunity_target,
  case
    when aircraft_category = 'Turboprop' then 'Turboprop'
    when aircraft_model ilike '%195-E2%' or aircraft_model = 'E295' then 'E-Jet E2'
    when airline_display_name = 'Porter' and aircraft_model ilike '%195%' then 'Porter E195'
    when aircraft_model ilike '%175%' then 'Embraer 175'
    when aircraft_model ilike '%170%' then 'Embraer 170'
    when aircraft_model ilike '%195%' then 'Embraer 195'
    when aircraft_model ilike '%145%' then 'ERJ145'
    when aircraft_model ilike '%190%' then 'Embraer 190'
    else coalesce(aircraft_category, 'Other')
  end as competitive_segment,
  case
    when scheduled_block_min is null then 'Unclassified'
    when scheduled_block_min <= 120 then 'Core Regional'
    when scheduled_block_min <= 180 then 'Priority Window'
    when scheduled_block_min <= 240 then 'Stretch Window'
    else 'Outside Priority'
  end as crj_fit_band,
  (scheduled_block_min is not null and scheduled_block_min <= 240) as is_priority_window
from base;

grant select on public.v_flights_enriched to service_role;

create materialized view public.v_executive_summary as
select
  count(*)::int as total_flights,
  count(distinct route_code)::int as total_routes,
  count(distinct airline_display_name)::int as total_airlines,
  (count(*) filter (where is_crj))::int as crj_flights,
  round((count(*) filter (where is_crj)) * 100.0 / nullif(count(*), 0), 1)::numeric as crj_pct,
  (count(*) filter (where is_regional_jet))::int as regional_jet_flights,
  round((count(*) filter (where is_regional_jet)) * 100.0 / nullif(count(*), 0), 1)::numeric as regional_jet_pct,
  (count(*) filter (where is_turboprop))::int as turboprop_flights,
  round(
    (count(*) filter (where is_crj)) * 100.0 /
    nullif((count(*) filter (where aircraft_category in ('CRJ', 'Regional Jet'))), 0),
    1
  )::numeric as crj_regional_share_pct,
  round(
    (count(*) filter (where is_regional_jet)) * 100.0 /
    nullif((count(*) filter (where aircraft_category in ('CRJ', 'Regional Jet'))), 0),
    1
  )::numeric as embraer_regional_share_pct,
  max(ingested_at_utc) as data_as_of_utc,
  min(flight_date) as flight_window_start,
  max(flight_date) as flight_window_end
from public.v_flights_enriched
where is_operating_flight;

create materialized view public.v_category_breakdown as
select
  aircraft_category,
  count(*)::int as cnt,
  round(count(*) * 100.0 / sum(count(*)) over (), 1)::numeric as pct
from public.v_flights_enriched
where is_operating_flight
group by aircraft_category
order by cnt desc;

create materialized view public.v_daily_volume as
select
  flight_date,
  count(*)::int as cnt
from public.v_flights_enriched
where is_operating_flight
  and flight_date is not null
group by flight_date
order by flight_date;

create materialized view public.v_top_routes as
select
  route_code,
  count(*)::int as flights,
  round(avg(scheduled_block_min))::int as avg_block_min,
  mode() within group (order by aircraft_category) as dominant_category
from public.v_flights_enriched
where is_operating_flight
  and route_code is not null
group by route_code
order by flights desc;

create materialized view public.v_airline_performance as
select
  airline_display_name as airline_name,
  count(*)::int as total_flights,
  count(distinct route_code)::int as routes_served,
  round(avg(dep_delay_min))::int as avg_delay_min,
  round(
    100.0 * count(case when dep_delay_min <= 15 then 1 end)::numeric /
    nullif(count(dep_delay_min), 0),
    1
  )::numeric as on_time_pct,
  mode() within group (order by aircraft_model) as top_aircraft,
  mode() within group (order by aircraft_category) as top_category
from public.v_flights_enriched
where is_operating_flight
  and airline_display_name is not null
group by airline_display_name
order by total_flights desc;

create materialized view public.v_dow_volume as
select
  day_of_week,
  count(*)::int as cnt
from public.v_flights_enriched
where is_operating_flight
group by day_of_week
order by day_of_week;

create materialized view public.v_monthly_category as
select
  month_number,
  aircraft_category,
  count(*)::int as cnt
from public.v_flights_enriched
where is_operating_flight
  and aircraft_category is not null
group by month_number, aircraft_category
order by month_number, cnt desc;

create materialized view public.v_top_aircraft_models as
select
  aircraft_model,
  aircraft_category,
  aircraft_generation,
  competitive_segment,
  count(distinct airline_display_name)::int as airlines_using,
  count(*)::int as flights,
  round(count(*) * 100.0 / sum(count(*)) over (), 2)::numeric as pct
from public.v_flights_enriched
where is_operating_flight
  and aircraft_model is not null
group by aircraft_model, aircraft_category, aircraft_generation, competitive_segment
order by flights desc;

create materialized view public.v_airline_category_matrix as
select
  airline_display_name as airline_name,
  sum(case when aircraft_category = 'CRJ' then 1 else 0 end)::int as "CRJ",
  sum(case when aircraft_category = 'Regional Jet' then 1 else 0 end)::int as "Regional Jet",
  sum(case when aircraft_category = 'Narrowbody' then 1 else 0 end)::int as "Narrowbody",
  sum(case when aircraft_category = 'Widebody' then 1 else 0 end)::int as "Widebody",
  sum(case when aircraft_category = 'Turboprop' then 1 else 0 end)::int as "Turboprop",
  sum(case when aircraft_category = 'Business Jet' then 1 else 0 end)::int as "Business Jet",
  sum(case when aircraft_category = 'Other' or aircraft_category is null then 1 else 0 end)::int as "Other",
  count(*)::int as total
from public.v_flights_enriched
where is_operating_flight
  and airline_display_name is not null
group by airline_display_name
order by total desc;

create materialized view public.v_opportunity_summary as
select
  count(distinct case when is_turboprop then route_code end)::int as turboprop_routes,
  count(distinct case when is_regional_jet then route_code end)::int as embraer_routes,
  count(distinct case when is_opportunity_target then route_code end)::int as addressable_routes,
  count(case when is_opportunity_target then 1 end)::int as addressable_flights,
  count(distinct case when is_opportunity_target and is_priority_window then route_code end)::int as priority_routes,
  count(case when is_opportunity_target and is_priority_window then 1 end)::int as priority_flights,
  count(distinct case when is_opportunity_target and not is_priority_window then route_code end)::int as outside_priority_routes,
  max(ingested_at_utc) as data_as_of_utc,
  min(flight_date) as flight_window_start,
  max(flight_date) as flight_window_end
from public.v_flights_enriched
where is_operating_flight;

create materialized view public.v_opportunity_airlines as
select
  airline_display_name as airline_name,
  nullif(array_to_string(array_agg(distinct operator_airline_name order by operator_airline_name), ' / '), '') as operator_airlines,
  count(*)::int as total_flights,
  (sum(case when is_crj then 1 else 0 end))::int as crj_flights,
  (sum(case when is_regional_jet then 1 else 0 end))::int as embraer_flights,
  (sum(case when is_turboprop then 1 else 0 end))::int as turboprop_flights,
  (sum(case when is_priority_window and is_opportunity_target then 1 else 0 end))::int as priority_flights,
  (sum(case when is_regional_jet then 1 else 0 end) + sum(case when is_turboprop then 1 else 0 end))::int as opportunity_flights,
  round(
    (sum(case when is_regional_jet then 1 else 0 end) + sum(case when is_turboprop then 1 else 0 end)) * 100.0 / count(*),
    1
  )::numeric as opportunity_pct
from public.v_flights_enriched
where is_operating_flight
  and airline_display_name is not null
group by airline_display_name
having (sum(case when is_regional_jet then 1 else 0 end) + sum(case when is_turboprop then 1 else 0 end)) > 0
order by opportunity_flights desc;

create materialized view public.v_opportunity_routes as
select
  route_code,
  airline_display_name as airline_name,
  operator_airline_name,
  aircraft_model,
  aircraft_category,
  aircraft_generation,
  competitive_segment,
  crj_fit_band,
  is_priority_window,
  count(*)::int as flights,
  round(avg(scheduled_block_min))::int as avg_block_min
from public.v_flights_enriched
where is_operating_flight
  and is_opportunity_target
  and route_code is not null
  and airline_display_name is not null
  and aircraft_model is not null
group by
  route_code,
  airline_display_name,
  operator_airline_name,
  aircraft_model,
  aircraft_category,
  aircraft_generation,
  competitive_segment,
  crj_fit_band,
  is_priority_window
order by flights desc;

grant select on public.v_executive_summary to anon, authenticated;
grant select on public.v_category_breakdown to anon, authenticated;
grant select on public.v_daily_volume to anon, authenticated;
grant select on public.v_top_routes to anon, authenticated;
grant select on public.v_airline_performance to anon, authenticated;
grant select on public.v_dow_volume to anon, authenticated;
grant select on public.v_monthly_category to anon, authenticated;
grant select on public.v_top_aircraft_models to anon, authenticated;
grant select on public.v_airline_category_matrix to anon, authenticated;
grant select on public.v_opportunity_summary to anon, authenticated;
grant select on public.v_opportunity_airlines to anon, authenticated;
grant select on public.v_opportunity_routes to anon, authenticated;

create or replace function public.refresh_dashboard_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.v_executive_summary;
  refresh materialized view public.v_category_breakdown;
  refresh materialized view public.v_daily_volume;
  refresh materialized view public.v_top_routes;
  refresh materialized view public.v_airline_performance;
  refresh materialized view public.v_dow_volume;
  refresh materialized view public.v_monthly_category;
  refresh materialized view public.v_top_aircraft_models;
  refresh materialized view public.v_airline_category_matrix;
  refresh materialized view public.v_opportunity_summary;
  refresh materialized view public.v_opportunity_airlines;
  refresh materialized view public.v_opportunity_routes;
end;
$$;