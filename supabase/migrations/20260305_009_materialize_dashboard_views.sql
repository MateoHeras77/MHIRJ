-- Phase 2 / Step 9: Convert aggregate dashboard views → materialized views.
-- This eliminates statement-timeout errors caused by full-table scans on every
-- API request.  Data is refreshed by calling refresh_dashboard_views().

-- ── Drop existing regular views ───────────────────────────────────────────
drop view if exists public.v_opportunity_routes      cascade;
drop view if exists public.v_opportunity_airlines    cascade;
drop view if exists public.v_opportunity_summary     cascade;
drop view if exists public.v_airline_category_matrix cascade;
drop view if exists public.v_top_aircraft_models     cascade;
drop view if exists public.v_monthly_category        cascade;
drop view if exists public.v_dow_volume              cascade;
drop view if exists public.v_airline_performance     cascade;
drop view if exists public.v_top_routes              cascade;
drop view if exists public.v_daily_volume            cascade;
drop view if exists public.v_category_breakdown      cascade;

-- ── Page 1: Dashboard ────────────────────────────────────────────────────

create materialized view public.v_category_breakdown as
select
  aircraft_category,
  count(*)::int                                                           as cnt,
  round(count(*) * 100.0 / sum(count(*)) over (), 1)::numeric            as pct
from public.v_flights_enriched
group by aircraft_category
order by cnt desc;

create materialized view public.v_daily_volume as
select
  flight_date,
  count(*)::int as cnt
from public.v_flights_enriched
where flight_date is not null
group by flight_date
order by flight_date;

create materialized view public.v_top_routes as
select
  route_code,
  count(*)::int                                     as flights,
  round(avg(scheduled_block_min))::int              as avg_block_min,
  mode() within group (order by aircraft_category)  as dominant_category
from public.v_flights_enriched
where route_code is not null
group by route_code
order by flights desc;

-- ── Page 2: Airport Intelligence ─────────────────────────────────────────

create materialized view public.v_airline_performance as
select
  airline_name,
  count(*)::int                                                              as total_flights,
  count(distinct route_code)::int                                            as routes_served,
  round(avg(dep_delay_min))::int                                             as avg_delay_min,
  round(
    100.0 * count(case when dep_delay_min <= 15 then 1 end)::numeric /
    nullif(count(dep_delay_min), 0)
  , 1)::numeric                                                              as on_time_pct,
  mode() within group (order by aircraft_model)                              as top_aircraft,
  mode() within group (order by aircraft_category)                           as top_category
from public.v_flights_enriched
where airline_name is not null
group by airline_name
order by total_flights desc;

create materialized view public.v_dow_volume as
select
  day_of_week,
  count(*)::int as cnt
from public.v_flights_enriched
group by day_of_week
order by day_of_week;

create materialized view public.v_monthly_category as
select
  month_number,
  aircraft_category,
  count(*)::int as cnt
from public.v_flights_enriched
where aircraft_category is not null
group by month_number, aircraft_category
order by month_number, cnt desc;

-- ── Page 3: Fleet Analysis ────────────────────────────────────────────────

create materialized view public.v_top_aircraft_models as
select
  aircraft_model,
  aircraft_category,
  count(distinct airline_name)::int                                          as airlines_using,
  count(*)::int                                                              as flights,
  round(count(*) * 100.0 / sum(count(*)) over (), 2)::numeric               as pct
from public.v_flights_enriched
where aircraft_model is not null
group by aircraft_model, aircraft_category
order by flights desc;

create materialized view public.v_airline_category_matrix as
select
  airline_name,
  sum(case when aircraft_category = 'CRJ'           then 1 else 0 end)::int as "CRJ",
  sum(case when aircraft_category = 'Regional Jet'  then 1 else 0 end)::int as "Regional Jet",
  sum(case when aircraft_category = 'Narrowbody'    then 1 else 0 end)::int as "Narrowbody",
  sum(case when aircraft_category = 'Widebody'      then 1 else 0 end)::int as "Widebody",
  sum(case when aircraft_category = 'Turboprop'     then 1 else 0 end)::int as "Turboprop",
  sum(case when aircraft_category = 'Business Jet'  then 1 else 0 end)::int as "Business Jet",
  sum(case when aircraft_category = 'Other'
         or aircraft_category is null              then 1 else 0 end)::int  as "Other",
  count(*)::int                                                              as total
from public.v_flights_enriched
where airline_name is not null
group by airline_name
order by total desc;

-- ── Page 4: CRJ Opportunity ───────────────────────────────────────────────

create materialized view public.v_opportunity_summary as
select
  count(distinct case when is_turboprop             then route_code end)::int as turboprop_routes,
  count(distinct case when is_regional_jet           then route_code end)::int as embraer_routes,
  count(distinct case when is_turboprop
                        or is_regional_jet           then route_code end)::int as addressable_routes,
  count(case when is_turboprop or is_regional_jet then 1 end)::int            as addressable_flights
from public.v_flights_enriched;

create materialized view public.v_opportunity_airlines as
select
  airline_name,
  count(*)::int                                                           as total_flights,
  sum(case when is_crj           then 1 else 0 end)::int                  as crj_flights,
  sum(case when is_regional_jet  then 1 else 0 end)::int                  as embraer_flights,
  sum(case when is_turboprop     then 1 else 0 end)::int                  as turboprop_flights,
  (sum(case when is_regional_jet then 1 else 0 end)
   + sum(case when is_turboprop  then 1 else 0 end))::int                 as opportunity_flights,
  round(
    (sum(case when is_regional_jet then 1 else 0 end)
     + sum(case when is_turboprop  then 1 else 0 end)) * 100.0 / count(*),
    1
  )::numeric                                                              as opportunity_pct
from public.v_flights_enriched
where airline_name is not null
group by airline_name
having (sum(case when is_regional_jet then 1 else 0 end)
      + sum(case when is_turboprop    then 1 else 0 end)) > 0
order by opportunity_flights desc;

create materialized view public.v_opportunity_routes as
select
  route_code,
  airline_name,
  aircraft_model,
  aircraft_category,
  count(*)::int                        as flights,
  round(avg(scheduled_block_min))::int as avg_block_min
from public.v_flights_enriched
where (is_turboprop or is_regional_jet)
  and route_code is not null
  and airline_name is not null
  and aircraft_model is not null
group by route_code, airline_name, aircraft_model, aircraft_category
order by flights desc;

-- ── Grant read access to anon + authenticated roles ───────────────────────
grant select on public.v_category_breakdown       to anon, authenticated;
grant select on public.v_daily_volume             to anon, authenticated;
grant select on public.v_top_routes               to anon, authenticated;
grant select on public.v_airline_performance      to anon, authenticated;
grant select on public.v_dow_volume               to anon, authenticated;
grant select on public.v_monthly_category         to anon, authenticated;
grant select on public.v_top_aircraft_models      to anon, authenticated;
grant select on public.v_airline_category_matrix  to anon, authenticated;
grant select on public.v_opportunity_summary      to anon, authenticated;
grant select on public.v_opportunity_airlines     to anon, authenticated;
grant select on public.v_opportunity_routes       to anon, authenticated;

-- ── Convenience refresh function (call after new data loads) ──────────────
create or replace function public.refresh_dashboard_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
