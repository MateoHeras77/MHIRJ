import { getCategoryBreakdown, getDailyVolume, getExecutiveSummary, getTopRoutes } from '@/lib/queries';

export const dynamic = 'force-dynamic';
import { InfoTooltip } from '@/components/InfoTooltip';
import { KpiCard } from '@/components/KpiCard';
import { RegionalJetShareCard } from '@/components/RegionalJetShareCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { DailyTrend } from '@/components/charts/DailyTrend';
import { RoutesBar } from '@/components/charts/RoutesBar';
import { BarChart3, Plane, Map, TrendingUp } from 'lucide-react';
import { fmt, fmtDateRange, fmtDateTime, fmtPct } from '@/lib/constants';

export default async function DashboardPage() {
  const [summary, categories, dailyVolume, topRoutes] = await Promise.all([
    getExecutiveSummary(),
    getCategoryBreakdown(),
    getDailyVolume(),
    getTopRoutes(15),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">YYZ Departures — Command Center</h1>
          <InfoTooltip label="Dashboard methodology">
            Executive summary uses operating flights only. Marketing codeshares are excluded from all headline KPIs and charts.
          </InfoTooltip>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {fmtDateRange(summary.flight_window_start, summary.flight_window_end)} · {fmt(summary.total_flights)} operating departures · Updated {fmtDateTime(summary.data_as_of_utc)}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Departures" value={fmt(summary.total_flights)} sub="physical operating flights" icon={Plane} accent="blue" />
        <KpiCard label="Unique Routes" value={fmt(summary.total_routes)} sub="destination airports" icon={Map} accent="blue" />
        <KpiCard label="Airlines Operating" value={fmt(summary.total_airlines)} sub="normalized executive brands" icon={BarChart3} accent="blue" />
        <KpiCard label="CRJ Fleet Share" value={fmtPct(summary.crj_pct)} sub={`${fmt(summary.crj_flights)} CRJ flights`} icon={TrendingUp} accent="red" />
      </div>

      <RegionalJetShareCard
        summary={summary}
        subtitle="Why the story matters: Embraer now controls most of the regional-jet flying at YYZ."
      />

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

      <Card className="border-0 shadow-sm print:break-inside-avoid">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Methodology</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-slate-600">
          Dashboard KPIs are based on operating metal only. Marketed codeshares are excluded, airline brands are normalized for executive readability, and opportunity suitability uses scheduled block time as a conservative proxy until airport-reference geometry is added.
        </CardContent>
      </Card>
    </div>
  );
}

