import { ShieldAlert } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExecutiveSummary } from '@/lib/queries'
import { fmt, fmtPct, toNumber } from '@/lib/constants'

type Props = {
  summary: ExecutiveSummary
  title?: string
  subtitle?: string
}

export function RegionalJetShareCard({
  summary,
  title = 'Regional Jet Market Share (YYZ)',
  subtitle = 'Operating flights only · CRJ vs Embraer family',
}: Props) {
  const crjShare = toNumber(summary.crj_regional_share_pct)
  const embraerShare = toNumber(summary.embraer_regional_share_pct)
  const ratio = crjShare > 0 ? embraerShare / crjShare : 0

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />
          {title}
        </CardTitle>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-red-700">CRJ</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{fmtPct(crjShare)}</p>
            <p className="text-xs text-slate-500">{fmt(summary.crj_flights)} flights in market</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Embraer</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{fmtPct(embraerShare)}</p>
            <p className="text-xs text-slate-500">{fmt(summary.regional_jet_flights)} flights in market</p>
          </div>
        </div>

        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-[#C8102E]" style={{ width: `${crjShare}%` }} />
            <div className="h-full bg-[#F59E0B]" style={{ width: `${embraerShare}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>CRJ {fmtPct(crjShare)}</span>
            <span>Embraer {fmtPct(embraerShare)}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          CRJ is currently outnumbered by roughly {ratio > 0 ? `${ratio.toFixed(1)}:1` : '—'} in the regional-jet contest at YYZ.
        </p>
      </CardContent>
    </Card>
  )
}