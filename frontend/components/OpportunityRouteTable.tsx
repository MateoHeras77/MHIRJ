"use client"

import { startTransition } from 'react'

import { AlertTriangle } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { InfoTooltip } from '@/components/InfoTooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FIT_BAND_COLORS, THESIS_TONE_CLASSES, fmt, fmtBlock } from '@/lib/constants'
import { getOpportunityNarrative } from '@/lib/opportunity'
import type { OpportunityRouteRow } from '@/lib/queries'

type Props = {
  routes: OpportunityRouteRow[]
}

export function OpportunityRouteTable({ routes }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedWindow = searchParams.get('window') === 'all' ? 'all' : 'priority'

  const filteredRoutes = selectedWindow === 'all'
    ? routes
    : routes.filter((route) => route.is_priority_window)

  function setWindow(nextWindow: 'priority' | 'all') {
    const next = new URLSearchParams(searchParams.toString())
    if (nextWindow === 'priority') {
      next.delete('window')
    } else {
      next.set('window', 'all')
    }
    const query = next.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Route Table Scope</h3>
            <InfoTooltip label="How the route scope works">
              The default view keeps the table in the sales-ready window using average scheduled block time of 240 minutes or less. Show All exposes the stretch cases for discussion.
            </InfoTooltip>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Priority Window removes long-haul exceptions like West Coast Porter flying without pretending we have route-distance geometry in the current raw feed.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          <Button
            type="button"
            size="sm"
            variant={selectedWindow === 'priority' ? 'default' : 'ghost'}
            className={selectedWindow === 'priority' ? 'bg-slate-900 text-white hover:bg-slate-900/90' : 'text-slate-600'}
            onClick={() => setWindow('priority')}
          >
            Sales-Ready Window
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectedWindow === 'all' ? 'default' : 'ghost'}
            className={selectedWindow === 'all' ? 'bg-slate-900 text-white hover:bg-slate-900/90' : 'text-slate-600'}
            onClick={() => setWindow('all')}
          >
            Show All Routes
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-2.5 text-left text-xs font-medium text-slate-500">Route</th>
              <th className="py-2.5 text-left text-xs font-medium text-slate-500">Airline</th>
              <th className="py-2.5 text-left text-xs font-medium text-slate-500">Current Aircraft</th>
              <th className="py-2.5 text-left text-xs font-medium text-slate-500">Fit</th>
              <th className="py-2.5 text-right text-xs font-medium text-slate-500">Flights</th>
              <th className="py-2.5 text-right text-xs font-medium text-slate-500">Block</th>
              <th className="py-2.5 pl-4 text-left text-xs font-medium text-slate-500">Why CRJ Wins</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoutes.map((row) => {
              const narrative = getOpportunityNarrative(row)
              return (
                <tr key={`${row.route_code}-${row.airline_name}-${row.aircraft_model}`} className="border-b border-slate-50 align-top hover:bg-amber-50/40">
                  <td className="py-3 font-mono font-semibold text-slate-800">{row.route_code ?? '—'}</td>
                  <td className="py-3">
                    <div className="font-medium text-slate-800">{row.airline_name ?? '—'}</div>
                    {row.operator_airline_name && row.operator_airline_name !== row.airline_name ? (
                      <div className="text-xs text-slate-500">Operated by {row.operator_airline_name}</div>
                    ) : null}
                  </td>
                  <td className="py-3">
                    <div className="max-w-[180px] truncate font-medium text-slate-700">{row.aircraft_model ?? '—'}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {row.aircraft_generation ? (
                        <Badge variant="outline" className="border-slate-200 text-[10px] text-slate-600">
                          {row.aircraft_generation}
                        </Badge>
                      ) : null}
                      {row.competitive_segment ? (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-800">
                          {row.competitive_segment}
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1.5">
                      <Badge
                        variant="outline"
                        className="w-fit text-[10px]"
                        style={{
                          borderColor: FIT_BAND_COLORS[row.crj_fit_band ?? 'Unclassified'] ?? '#6B7280',
                          color: FIT_BAND_COLORS[row.crj_fit_band ?? 'Unclassified'] ?? '#6B7280',
                        }}
                      >
                        {row.crj_fit_band ?? 'Unclassified'}
                      </Badge>
                      {!row.is_priority_window ? (
                        <div className="flex items-center gap-1 text-[11px] text-red-600">
                          <AlertTriangle className="size-3" aria-hidden="true" />
                          Stretch / long-haul case
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 text-right text-slate-600">{fmt(row.flights)}</td>
                  <td className="py-3 text-right text-slate-500">{fmtBlock(row.avg_block_min)}</td>
                  <td className="py-3 pl-4">
                    <div className="max-w-[320px] space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {narrative.tags.map((tag) => (
                          <span key={`${row.route_code}-${tag.label}`} className="inline-flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${THESIS_TONE_CLASSES[tag.tone]}`}
                            >
                              {tag.label}
                            </Badge>
                            <InfoTooltip label={`${tag.label} explanation`}>
                              {tag.tooltip}
                            </InfoTooltip>
                          </span>
                        ))}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{narrative.headline}</div>
                        <p className="text-xs leading-5 text-slate-500">{narrative.detail}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}