import Link from 'next/link';

import { AviationHeroGraphic } from '@/components/AviationHeroGraphic';
import { ExportReportButton } from '@/components/ExportReportButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmt, fmtDateRange, fmtDateTime, fmtPct } from '@/lib/constants';
import { PROFILE } from '@/lib/profile';
import { getExecutiveSummary, getOpportunitySummary } from '@/lib/queries';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  GraduationCap,
  Radar,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

const APP_SECTIONS = [
  {
    title: 'Dashboard',
    description: 'Executive snapshot of operating flights, route density, and fleet share at YYZ.',
  },
  {
    title: 'Fleet Analysis',
    description: 'Competitive mix by aircraft family, airline exposure, and regional-jet pressure points.',
  },
  {
    title: 'CRJ Opportunity',
    description: 'Addressable routes, priority windows, and route-level arguments built for sales conversations.',
  },
] as const;

export default async function HomePage() {
  const [summary, opportunity] = await Promise.all([
    getExecutiveSummary(),
    getOpportunitySummary(),
  ]);

  const stats = [
    { label: 'Operating Flights', value: fmt(summary.total_flights) },
    { label: 'Routes Mapped', value: fmt(summary.total_routes) },
    { label: 'Airline Brands', value: fmt(summary.total_airlines) },
    { label: 'Priority Routes', value: fmt(opportunity.priority_routes) },
  ];

  const insightCards = [
    {
      label: 'CRJ Regional Share',
      value: fmtPct(summary.crj_regional_share_pct),
      detail: 'Current share inside the regional-jet competitive set at Toronto Pearson.',
      tone: 'from-[#003DA5] to-cyan-600',
    },
    {
      label: 'Embraer Share',
      value: fmtPct(summary.embraer_regional_share_pct),
      detail: 'The installed competitor baseline this tool is designed to challenge.',
      tone: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Addressable Routes',
      value: fmt(opportunity.addressable_routes),
      detail: 'Routes where schedule patterns and equipment suggest a credible CRJ discussion.',
      tone: 'from-[#0f766e] to-emerald-600',
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(0,61,165,0.14),_transparent_34%),linear-gradient(180deg,_#e2e8f0_0%,_#f8fafc_24%,_#ffffff_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:gap-10 lg:py-10">
        <section className="overflow-hidden rounded-[36px] border border-slate-200/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-10 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-10 xl:px-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                <Sparkles className="size-3.5 text-[#003DA5]" aria-hidden="true" />
                {PROFILE.eyebrow}
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#003DA5]">
                  {PROFILE.name}
                </p>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 text-balance sm:text-5xl xl:text-[3.6rem] xl:leading-[1.02]">
                  {PROFILE.headline}
                </h1>
                <p className="max-w-2xl text-lg font-medium text-slate-700">{PROFILE.role}</p>
                <p className="max-w-2xl text-base leading-7 text-slate-600">{PROFILE.intro}</p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                  <BriefcaseBusiness className="size-4 text-[#003DA5]" aria-hidden="true" />
                  {PROFILE.currentRole}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                  <GraduationCap className="size-4 text-[#C8102E]" aria-hidden="true" />
                  {PROFILE.education}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-[#003DA5] text-white hover:bg-[#003DA5]/90">
                  <Link href="/dashboard">
                    Open Dashboard
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50">
                  <Link href="/opportunity">View CRJ Opportunity</Link>
                </Button>
                <ExportReportButton label="Print Portfolio Brief" />
              </div>

              <p className="max-w-2xl text-sm leading-6 text-slate-500">{PROFILE.nextStep}</p>
              <p className="text-sm font-medium text-slate-500">{PROFILE.contactLine}</p>
            </div>

            <div className="space-y-4">
              <AviationHeroGraphic />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-0 bg-slate-950 text-white shadow-[0_16px_44px_rgba(15,23,42,0.18)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                <Radar className="size-4 text-cyan-300" aria-hidden="true" />
                {PROFILE.missionTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="max-w-3xl text-lg leading-8 text-slate-100">{PROFILE.missionLead}</p>
              <p className="max-w-3xl text-sm leading-7 text-slate-300">{PROFILE.missionBody}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {insightCards.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${item.tone}`} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Project Operating Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Coverage window: {fmtDateRange(summary.flight_window_start, summary.flight_window_end)}.
              </p>
              <p>
                Executive views last refreshed {fmtDateTime(summary.data_as_of_utc)} using operating flights only.
              </p>
              <p>
                The route thesis is built around market share pressure, block-time fit, and airline-level fleet context rather than generic schedule counts.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Current Thesis
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  The strongest CRJ story at YYZ is not overall traffic volume. It is targeted replacement logic where Embraer and turboprop incumbents leave an opening on speed, frequency, or scope-clause alignment.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Meet the Analyst</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
              <p>
                I built this platform as a portfolio-grade decision tool that connects frontline airport operations knowledge with network-strategy analysis.
              </p>
              <p>
                Working inside YYZ gives me an operational view of how airline schedules translate into turnaround pressure, gate usage, and real-world fleet behavior. My analytics work turns that operational context into a sharper commercial narrative.
              </p>
              <p>
                The result is a route-intelligence brief designed to look credible in front of airline planners, OEM sales teams, and aviation strategy leaders.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {PROFILE.toolkit.map((group) => (
              <Card key={group.title} className="border-0 bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.14)]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-slate-200">
                    {group.items.map((item) => (
                      <li key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <BarChart3 className="size-4 text-[#003DA5]" aria-hidden="true" />
                Inside the Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {APP_SECTIONS.map((section) => (
                <div key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{section.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />
                Independence Note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-slate-700">
              <p>{PROFILE.disclaimer}</p>
              <p>
                The current version uses scheduled block time as the conservative suitability filter. Geographic range filtering will be layered in later when the airport reference geometry is complete enough to support it credibly.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

