import {
  getExecutiveSummary,
  getOpportunitySummary,
  getOpportunityAirlines,
  getOpportunityRoutes,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';
import { ExportReportButton } from '@/components/ExportReportButton';
import { InfoTooltip } from '@/components/InfoTooltip';
import { OpportunityRouteTable } from '@/components/OpportunityRouteTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpportunityBar } from '@/components/charts/OpportunityBar';
import { fmt, fmtDateRange, fmtDateTime, fmtPct, toNumber } from '@/lib/constants';
import { TrendingUp, Target, Zap, Award } from 'lucide-react';

export default async function OpportunityPage() {
  const [overview, summary, airlines, routes] = await Promise.all([
    getExecutiveSummary(),
    getOpportunitySummary(),
    getOpportunityAirlines(),
    getOpportunityRoutes(),
  ]);

  // Deduplicate routes to one row per route+airline (keep highest flight count row)
  const deduped = Object.values(
    routes.reduce<Record<string, typeof routes[0]>>((acc, r) => {
      const k = `${r.route_code}|${r.airline_name}`;
      if (!acc[k] || r.flights > acc[k].flights) acc[k] = r;
      return acc;
    }, {})
  ).sort((a, b) => b.flights - a.flights);

  const spotlightAirlines = [...airlines]
    .filter(airline => airline.opportunity_flights >= 20)
    .sort((a, b) => (b.priority_flights ?? b.opportunity_flights) - (a.priority_flights ?? a.opportunity_flights))
    .slice(0, 9);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-6 h-6 text-amber-900" />
                <span className="text-amber-900 font-semibold text-sm uppercase tracking-wide">CRJ Sales Intelligence</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Market Opportunity at YYZ</h1>
              <p className="text-amber-100 mt-1 text-sm">
                Operating flights only · {fmtDateRange(summary.flight_window_start, summary.flight_window_end)} · Updated {fmtDateTime(summary.data_as_of_utc)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/15">{fmt(summary.addressable_routes)} addressable routes</Badge>
                <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/15">{fmt(summary.priority_routes)} in sales-ready window</Badge>
                <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/15">CRJ share {fmtPct(overview.crj_regional_share_pct)} vs Embraer {fmtPct(overview.embraer_regional_share_pct)}</Badge>
              </div>
            </div>
            <ExportReportButton />
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Opportunity KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-4">
          {[
            { label: 'Turboprop Routes', value: fmt(summary.turboprop_routes), sub: 'direct upgrade targets', icon: Zap, color: 'bg-orange-500' },
            { label: 'Embraer Routes', value: fmt(summary.embraer_routes), sub: 'displacement targets', icon: Target, color: 'bg-amber-500' },
            { label: 'Addressable Routes', value: fmt(summary.addressable_routes), sub: `${fmt(summary.priority_routes)} in sales-ready window`, icon: TrendingUp, color: 'bg-amber-600' },
            { label: 'Priority Flight Pool', value: fmt(summary.priority_flights), sub: 'avg block ≤ 240 min', icon: Award, color: 'bg-yellow-600' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-5 border border-amber-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 leading-none">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{sub}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stacked bar: opportunity breakdown by airline */}
        <Card className="border-0 shadow-sm border-t-4 border-amber-400">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Opportunity Flights by Airline
                <span className="ml-2 text-xs font-normal text-slate-400">Embraer family + turboprop operations</span>
              </CardTitle>
              <InfoTooltip label="Opportunity chart methodology">
                This chart stays on the full opportunity pool for context. The table below defaults to the tighter sales-ready window so long-haul Porter cases do not dominate the talking points.
              </InfoTooltip>
            </div>
          </CardHeader>
          <CardContent>
            <OpportunityBar data={airlines} />
          </CardContent>
        </Card>

        {/* Airline scorecards */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3">Airline Scorecards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {spotlightAirlines.map(airline => {
              const oppPct = toNumber(airline.opportunity_pct);
              return (
                <div key={airline.airline_name ?? 'null'} className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{airline.airline_name ?? 'Unknown'}</h3>
                      {airline.operator_airlines && airline.operator_airlines !== airline.airline_name ? (
                        <p className="text-[11px] text-slate-500">Operated by {airline.operator_airlines}</p>
                      ) : null}
                      <p className="text-xs text-slate-500">{fmt(airline.total_flights)} total departures</p>
                    </div>
                    <Badge
                      className="text-xs font-semibold"
                      style={{ backgroundColor: oppPct >= 50 ? '#F59E0B' : oppPct >= 20 ? '#F97316' : '#6B7280', color: 'white', border: 'none' }}
                    >
                      {fmtPct(oppPct)} opportunity
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'CRJ flights', value: airline.crj_flights, color: '#C8102E', total: airline.total_flights },
                      { label: 'Embraer family', value: airline.embraer_flights, color: '#F59E0B', total: airline.total_flights },
                      { label: 'Turboprop', value: airline.turboprop_flights, color: '#F97316', total: airline.total_flights },
                    ].map(({ label, value, color, total }) => (
                      <div key={label}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-slate-600">{label}</span>
                          <span className="font-medium text-slate-800">{fmt(value)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (value / total) * 100)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Sales-ready window</span>
                    <span className="text-sm font-bold text-amber-600">{fmt(airline.priority_flights ?? 0)} flights</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opportunity route table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Opportunity Route Intelligence
                <span className="ml-2 text-xs font-normal text-slate-400">reason tags, fit bands, and cleaner airline labels</span>
              </CardTitle>
              <InfoTooltip label="Opportunity methodology">
                Route recommendations default to the sales-ready window using average scheduled block time of 240 minutes or less. Use Show All to review the stretch cases separately.
              </InfoTooltip>
            </div>
          </CardHeader>
          <CardContent>
            <OpportunityRouteTable routes={deduped} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Assumptions & Caveats</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-slate-600">
            Opportunity analytics are based on operating flights only, not marketed codeshares. Airline labels are normalized for executive readability. The default table view uses average scheduled block time of 240 minutes or less as a conservative sales-priority screen because the current raw feed does not contain usable airport-coordinate geometry for true distance filtering.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
