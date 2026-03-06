/**
 * All typed data-fetch functions for v_flights_enriched.
 * Called exclusively from Next.js Server Components — never from the client.
 */
import { supabase } from './supabase';

// ─── Shared types ──────────────────────────────────────────────────────────

export type NumericValue = number | string;

export type CategoryCount = { aircraft_category: string | null; cnt: number; pct: NumericValue };
export type DailyVolume = { flight_date: string; cnt: number };
export type TopRoute = { route_code: string; flights: number; avg_block_min: number | null; dominant_category?: string | null };
export type AirlineRow = {
  airline_name: string | null;
  total_flights: number;
  routes_served: number;
  avg_delay_min: number | null;
  on_time_pct: NumericValue | null;
  top_aircraft: string | null;
};
export type AircraftModelRow = {
  aircraft_model: string | null;
  aircraft_category: string | null;
  aircraft_generation?: string | null;
  competitive_segment?: string | null;
  airlines_using: number;
  flights: number;
  pct: NumericValue;
};
export type AirlineMatrixRow = {
  airline_name: string | null;
  CRJ: number;
  'Regional Jet': number;
  Narrowbody: number;
  Widebody: number;
  Turboprop: number;
  'Business Jet': number;
  Other: number;
  total: number;
};
export type OpportunityAirlineRow = {
  airline_name: string | null;
  operator_airlines?: string | null;
  total_flights: number;
  crj_flights: number;
  embraer_flights: number;
  turboprop_flights: number;
  priority_flights?: number;
  opportunity_flights: number;
  opportunity_pct: NumericValue;
};
export type OpportunityRouteRow = {
  route_code: string | null;
  airline_name: string | null;
  operator_airline_name?: string | null;
  aircraft_model: string | null;
  aircraft_category: string | null;
  aircraft_generation?: string | null;
  competitive_segment?: string | null;
  crj_fit_band?: string | null;
  is_priority_window?: boolean;
  flights: number;
  avg_block_min: number | null;
};
export type ExecutiveSummary = {
  total_flights: number;
  total_airlines: number;
  total_routes: number;
  crj_flights: number;
  crj_pct: NumericValue;
  regional_jet_flights: number;
  regional_jet_pct: NumericValue;
  turboprop_flights: number;
  crj_regional_share_pct: NumericValue;
  embraer_regional_share_pct: NumericValue;
  data_as_of_utc: string | null;
  flight_window_start: string | null;
  flight_window_end: string | null;
};
export type OpportunitySummary = {
  turboprop_routes: number;
  embraer_routes: number;
  addressable_routes: number;
  addressable_flights: number;
  priority_routes: number;
  priority_flights: number;
  outside_priority_routes: number;
  data_as_of_utc: string | null;
  flight_window_start: string | null;
  flight_window_end: string | null;
};
export type DowVolume = { day_of_week: number; cnt: number };

// ─── Dashboard (Page 1) ────────────────────────────────────────────────────

export async function getExecutiveSummary(): Promise<ExecutiveSummary> {
  const { data, error } = await supabase
    .from('v_executive_summary')
    .select('*')
    .single();
  if (error) throw error;
  return data as ExecutiveSummary;
}

export async function getCategoryBreakdown(): Promise<CategoryCount[]> {
  const { data, error } = await supabase
    .from('v_category_breakdown')
    .select('*')
    .order('cnt', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CategoryCount[];
}

export async function getDailyVolume(): Promise<DailyVolume[]> {
  const { data, error } = await supabase
    .from('v_daily_volume')
    .select('*')
    .order('flight_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DailyVolume[];
}

export async function getTopRoutes(limit = 15): Promise<TopRoute[]> {
  const { data, error } = await supabase
    .from('v_top_routes')
    .select('*')
    .order('flights', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TopRoute[];
}

// ─── Airport Intelligence (Page 2) ────────────────────────────────────────

export async function getAirlinePerformance(): Promise<AirlineRow[]> {
  const { data, error } = await supabase
    .from('v_airline_performance')
    .select('*')
    .order('total_flights', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as AirlineRow[];
}

export async function getDowVolume(): Promise<DowVolume[]> {
  const { data, error } = await supabase
    .from('v_dow_volume')
    .select('*')
    .order('day_of_week', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DowVolume[];
}

// ─── Fleet Analysis (Page 3) ──────────────────────────────────────────────

export async function getTopAircraftModels(limit = 20): Promise<AircraftModelRow[]> {
  const { data, error } = await supabase
    .from('v_top_aircraft_models')
    .select('*')
    .order('flights', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AircraftModelRow[];
}

export async function getAirlineMatrix(): Promise<AirlineMatrixRow[]> {
  const { data, error } = await supabase
    .from('v_airline_category_matrix')
    .select('*')
    .order('total', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as AirlineMatrixRow[];
}

// ─── CRJ Opportunity (Page 4) ─────────────────────────────────────────────

export async function getOpportunitySummary(): Promise<OpportunitySummary> {
  const { data, error } = await supabase
    .from('v_opportunity_summary')
    .select('*')
    .single();
  if (error) throw error;
  return data as OpportunitySummary;
}

export async function getOpportunityAirlines(): Promise<OpportunityAirlineRow[]> {
  const { data, error } = await supabase
    .from('v_opportunity_airlines')
    .select('*')
    .order('opportunity_flights', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as OpportunityAirlineRow[];
}

export async function getOpportunityRoutes(): Promise<OpportunityRouteRow[]> {
  const { data, error } = await supabase
    .from('v_opportunity_routes')
    .select('*')
    .order('flights', { ascending: false })
    .limit(80);
  if (error) throw error;
  return (data ?? []) as OpportunityRouteRow[];
}
