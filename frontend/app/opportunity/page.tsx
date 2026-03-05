import {
  getOpportunitySummary,
  getOpportunityAirlines,
  getOpportunityRoutes,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpportunityBar } from '@/components/charts/OpportunityBar';
import { fmt, fmtPct, fmtBlock } from '@/lib/constants';
import { TrendingUp, Target, Zap, Award } from 'lucide-react';

const WHY_CRJ: Record<string, string> = {
  Turboprop: 'Jet speed · pressurized cabin · 50% faster block time',
  'Regional Jet': 'CRJ 900: comparable capacity · lower fuel burn per seat · MHIRJ support network',
};

export default async function OpportunityPage() {
  const [summary, airlines, routes] = await Promise.all([
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-6 h-6 text-amber-900" />
            <span className="text-amber-900 font-semibold text-sm uppercase tracking-wide">CRJ Sales Intelligence</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Market Opportunity at YYZ</h1>
          <p className="text-amber-100 mt-1 text-sm">
            Routes where the CRJ Series is the operationally superior replacement
          </p>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Opportunity KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-4">
          {[
            { label: 'Turboprop Routes', value: fmt(summary.turboprop_routes), sub: 'direct upgrade targets', icon: Zap, color: 'bg-orange-500' },
            { label: 'Embraer Routes', value: fmt(summary.embraer_routes), sub: 'displacement targets', icon: Target, color: 'bg-amber-500' },
            { label: 'Addressable Routes', value: fmt(summary.addressable_routes), sub: 'combined opportunity', icon: TrendingUp, color: 'bg-amber-600' },
            { label: 'Annual Flight Pool', value: fmt(summary.addressable_flights), sub: 'in opportunity window', icon: Award, color: 'bg-yellow-600' },
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
            <CardTitle className="text-sm font-semibold text-slate-700">
              Opportunity Flights by Airline
              <span className="ml-2 text-xs font-normal text-slate-400">Embraer E-Series + Turboprop flights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OpportunityBar data={airlines} />
          </CardContent>
        </Card>

        {/* Airline scorecards */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-3">Airline Scorecards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {airlines.slice(0, 9).map(airline => {
              const oppPct = Number(airline.opportunity_pct);
              return (
                <div key={airline.airline_name ?? 'null'} className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{airline.airline_name ?? 'Unknown'}</h3>
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
                      { label: 'Embraer E-Series', value: airline.embraer_flights, color: '#F59E0B', total: airline.total_flights },
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
                    <span className="text-xs text-slate-500">Opportunity pool</span>
                    <span className="text-sm font-bold text-amber-600">{fmt(airline.opportunity_flights)} flights</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opportunity route table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Opportunity Route Intelligence
              <span className="ml-2 text-xs font-normal text-slate-400">routes with Turboprop or Embraer E-Series operations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">Route</th>
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">Airline</th>
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">Current Aircraft</th>
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500">Category</th>
                    <th className="text-right py-2.5 text-xs font-medium text-slate-500">Flights</th>
                    <th className="text-right py-2.5 text-xs font-medium text-slate-500">Block</th>
                    <th className="text-left py-2.5 text-xs font-medium text-slate-500 pl-4">Why CRJ Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {deduped.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-amber-50/40">
                      <td className="py-2.5 font-mono font-semibold text-slate-800">{row.route_code ?? '—'}</td>
                      <td className="py-2.5 text-slate-700">{row.airline_name ?? '—'}</td>
                      <td className="py-2.5 text-slate-600 max-w-[160px] truncate">{row.aircraft_model ?? '—'}</td>
                      <td className="py-2.5">
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            borderColor: row.aircraft_category === 'Turboprop' ? '#F97316' : '#F59E0B',
                            color: row.aircraft_category === 'Turboprop' ? '#F97316' : '#D97706',
                          }}
                        >
                          {row.aircraft_category}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right text-slate-600">{fmt(row.flights)}</td>
                      <td className="py-2.5 text-right text-slate-500">{fmtBlock(row.avg_block_min)}</td>
                      <td className="py-2.5 pl-4 text-xs text-slate-500 max-w-[200px]">
                        {WHY_CRJ[row.aircraft_category ?? ''] ?? 'CRJ Series competitive on this route'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
