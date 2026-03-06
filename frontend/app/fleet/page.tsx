import { InfoTooltip } from '@/components/InfoTooltip';
import { RegionalJetShareCard } from '@/components/RegionalJetShareCard';
import { getAirlineMatrix, getCategoryBreakdown, getExecutiveSummary, getTopAircraftModels } from '@/lib/queries';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { fmt, fmtDateRange, fmtDateTime, fmtPct, CATEGORY_COLORS, toNumber } from '@/lib/constants';

export default async function FleetPage() {
  const [summary, categories, aircraftModels, matrix] = await Promise.all([
    getExecutiveSummary(),
    getCategoryBreakdown(),
    getTopAircraftModels(25),
    getAirlineMatrix(),
  ]);

  const MATRIX_CATS = ['CRJ', 'Regional Jet', 'Narrowbody', 'Widebody', 'Turboprop', 'Business Jet'] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fleet Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Aircraft types operating at YYZ · {fmtDateRange(summary.flight_window_start, summary.flight_window_end)} · Updated {fmtDateTime(summary.data_as_of_utc)}
        </p>
      </div>

      <RegionalJetShareCard summary={summary} />

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        {categories.filter(c => c.aircraft_category != null).slice(0, 8).map(cat => (
          <div
            key={cat.aircraft_category}
            className="bg-white rounded-xl shadow-sm p-4 border-l-4"
            style={{ borderLeftColor: CATEGORY_COLORS[cat.aircraft_category!] ?? '#9CA3AF' }}
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{cat.aircraft_category}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{fmt(cat.cnt)}</p>
            <p className="text-xs text-slate-400">{fmtPct(Number(cat.pct))} of total</p>
          </div>
        ))}
      </div>

      {/* Donut + Top Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-700">Fleet Composition</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categories} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-700">Top Aircraft Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 overflow-y-auto max-h-[276px]">
              {aircraftModels.slice(0, 20).map(row => (
                <div key={`${row.aircraft_model}-${row.aircraft_category}`} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{row.aircraft_model}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] flex-shrink-0"
                        style={{ borderColor: CATEGORY_COLORS[row.aircraft_category ?? 'Other'], color: CATEGORY_COLORS[row.aircraft_category ?? 'Other'] }}
                      >
                        {row.aircraft_category ?? 'Other'}
                      </Badge>
                      {row.aircraft_generation ? (
                        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">
                          {row.aircraft_generation}
                        </Badge>
                      ) : null}
                    </div>
                    {row.competitive_segment && row.competitive_segment !== row.aircraft_model ? (
                      <p className="mt-1 text-[11px] text-slate-500">{row.competitive_segment}</p>
                    ) : null}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, toNumber(row.pct) * 5)}%`,
                          backgroundColor: CATEGORY_COLORS[row.aircraft_category ?? 'Other'] ?? '#9CA3AF',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0 w-14 text-right">{fmt(row.flights)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Airline × Category matrix */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Airline × Aircraft Category Matrix
              <span className="ml-2 text-xs font-normal text-slate-400">flight counts — top 20 airline brands</span>
            </CardTitle>
            <InfoTooltip label="Matrix methodology">
              Matrix uses operating flights only and rolls cleaned operator names up to executive-facing airline brands such as American, Delta, Air Canada, and Porter.
            </InfoTooltip>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2.5 text-xs font-medium text-slate-500 min-w-[140px]">Airline</th>
                  {MATRIX_CATS.map(cat => (
                    <th
                      key={cat}
                      className="text-right py-2.5 text-xs font-medium px-2"
                      style={{ color: CATEGORY_COLORS[cat] }}
                    >
                      {cat}
                    </th>
                  ))}
                  <th className="text-right py-2.5 text-xs font-medium text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => {
                  const maxVal = Math.max(...MATRIX_CATS.map(c => (row[c as keyof typeof row] as number) ?? 0));
                  return (
                    <tr key={row.airline_name ?? 'null'} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-800 truncate max-w-[140px]">{row.airline_name ?? '—'}</td>
                      {MATRIX_CATS.map(cat => {
                        const val = (row[cat as keyof typeof row] as number) ?? 0;
                        const intensity = maxVal > 0 ? val / maxVal : 0;
                        return (
                          <td key={cat} className="py-2.5 text-right px-2">
                            {val > 0 ? (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[cat]}${Math.round(intensity * 40 + 15).toString(16).padStart(2, '0')}`,
                                  color: intensity > 0.5 ? CATEGORY_COLORS[cat] : '#6B7280',
                                }}
                              >
                                {fmt(val)}
                              </span>
                            ) : (
                              <span className="text-slate-200 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 text-right font-semibold text-slate-700">{fmt(row.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
