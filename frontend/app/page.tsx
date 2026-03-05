import { getCategoryBreakdown, getDailyVolume, getTopRoutes } from '@/lib/queries';

export const dynamic = 'force-dynamic';
import { KpiCard } from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { DailyTrend } from '@/components/charts/DailyTrend';
import { RoutesBar } from '@/components/charts/RoutesBar';
import { BarChart3, Plane, Map, TrendingUp } from 'lucide-react';
import { fmt, fmtPct } from '@/lib/constants';

export default async function DashboardPage() {
  const [categories, dailyVolume, topRoutes] = await Promise.all([
    getCategoryBreakdown(),
    getDailyVolume(),
    getTopRoutes(15),
  ]);

  const totalFlights = categories.reduce((s, c) => s + c.cnt, 0);
  const crjRow = categories.find(c => c.aircraft_category === 'CRJ');
  const crjPct = crjRow ? (crjRow.cnt / totalFlights) * 100 : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">YYZ Departures — Command Center</h1>
        <p className="text-sm text-slate-500 mt-1">
          Jan 2026 – Mar 2026 · {fmt(totalFlights)} scheduled departures
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Departures" value={fmt(totalFlights)} sub="Jan 2026 – today" icon={Plane} accent="blue" />
        <KpiCard label="Unique Routes" value="260+" sub="destination airports" icon={Map} accent="blue" />
        <KpiCard label="Airlines Operating" value="204" sub="distinct carriers" icon={BarChart3} accent="blue" />
        <KpiCard label="CRJ Fleet Share" value={fmtPct(crjPct)} sub={`${fmt(crjRow?.cnt ?? 0)} CRJ flights`} icon={TrendingUp} accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-700">Fleet Mix by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categories} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-700">Daily Departure Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyTrend data={dailyVolume} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Top 15 Routes by Departures
            <span className="ml-2 text-xs font-normal text-slate-400">coloured by dominant aircraft category</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RoutesBar data={topRoutes as Parameters<typeof RoutesBar>[0]['data']} />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold text-slate-700">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-medium text-slate-500">Category</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500">Flights</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500">Share</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(row => (
                <tr key={row.aircraft_category ?? 'null'} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 font-medium text-slate-800">{row.aircraft_category ?? 'Unknown'}</td>
                  <td className="py-2 text-right text-slate-600">{fmt(row.cnt)}</td>
                  <td className="py-2 text-right text-slate-600">{fmtPct(Number(row.pct))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

