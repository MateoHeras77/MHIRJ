import { getAirlinePerformance, getDowVolume, getTopRoutes } from '@/lib/queries';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoutesBar } from '@/components/charts/RoutesBar';
import { DowBar } from '@/components/charts/DowBar';
import { fmt, fmtPct, fmtBlock } from '@/lib/constants';

export default async function RoutesPage() {
  const [airlines, dowVolume, topRoutes] = await Promise.all([
    getAirlinePerformance(),
    getDowVolume(),
    getTopRoutes(20),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Airport Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">Airline performance & route breakdown at YYZ</p>
      </div>

      {/* Airline performance table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Airline Performance Rankings
            <span className="ml-2 text-xs font-normal text-slate-400">sorted by total departures</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2.5 text-xs font-medium text-slate-500">Airline</th>
                  <th className="text-right py-2.5 text-xs font-medium text-slate-500">Flights</th>
                  <th className="text-right py-2.5 text-xs font-medium text-slate-500">Routes</th>
                  <th className="text-right py-2.5 text-xs font-medium text-slate-500">Avg Delay</th>
                  <th className="text-right py-2.5 text-xs font-medium text-slate-500">On-Time %</th>
                  <th className="text-left py-2.5 text-xs font-medium text-slate-500 pl-4">Top Aircraft</th>
                </tr>
              </thead>
              <tbody>
                {airlines.map(row => (
                  <tr key={row.airline_name ?? 'null'} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800">{row.airline_name ?? '—'}</td>
                    <td className="py-2.5 text-right text-slate-600">{fmt(row.total_flights)}</td>
                    <td className="py-2.5 text-right text-slate-500">{fmt(row.routes_served)}</td>
                    <td className="py-2.5 text-right">
                      {row.avg_delay_min != null ? (
                        <span className={row.avg_delay_min > 15 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {row.avg_delay_min > 0 ? '+' : ''}{row.avg_delay_min}m
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      {row.on_time_pct != null ? (
                        <span className={Number(row.on_time_pct) >= 75 ? 'text-green-600 font-medium' : 'text-amber-600'}>
                          {fmtPct(Number(row.on_time_pct))}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 pl-4">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {row.top_aircraft ?? '—'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-700">Top 20 Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <RoutesBar data={topRoutes as Parameters<typeof RoutesBar>[0]['data']} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-700">Flights by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <DowBar data={dowVolume} />
          </CardContent>
        </Card>
      </div>

      {/* Top routes table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold text-slate-700">Route Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2.5 text-xs font-medium text-slate-500">Route</th>
                  <th className="text-right py-2.5 text-xs font-medium text-slate-500">Flights</th>
                  <th className="text-right py-2.5 text-xs font-medium text-slate-500">Avg Block Time</th>
                  <th className="text-left py-2.5 text-xs font-medium text-slate-500 pl-4">Dominant Aircraft</th>
                </tr>
              </thead>
              <tbody>
                {topRoutes.map(row => (
                  <tr key={row.route_code} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2.5 font-mono font-semibold text-slate-800">{row.route_code}</td>
                    <td className="py-2.5 text-right text-slate-600">{fmt(row.flights)}</td>
                    <td className="py-2.5 text-right text-slate-500">{fmtBlock(row.avg_block_min)}</td>
                    <td className="py-2.5 pl-4">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {(row as { dominant_category?: string }).dominant_category ?? '—'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
