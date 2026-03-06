import { Plane } from 'lucide-react';

export function AviationHeroGraphic() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.32)]">
      <div className="aviation-grid absolute inset-0 opacity-35" />
      <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative z-10 h-[320px]">
        <div className="absolute left-0 top-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-slate-300">
          YYZ Route Intelligence
        </div>
        <div className="absolute right-0 top-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
          CRJ Opportunity Lens
        </div>

        <svg viewBox="0 0 560 320" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="route-primary" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.25" />
              <stop offset="45%" stopColor="#60A5FA" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="route-secondary" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          <g opacity="0.24">
            <circle cx="410" cy="150" r="92" fill="none" stroke="#38BDF8" strokeWidth="1" />
            <circle cx="410" cy="150" r="64" fill="none" stroke="#38BDF8" strokeWidth="1" />
            <circle cx="410" cy="150" r="36" fill="none" stroke="#38BDF8" strokeWidth="1" />
          </g>

          <path
            d="M42 248 C 142 194, 212 130, 302 118 S 446 124, 520 74"
            fill="none"
            stroke="url(#route-primary)"
            strokeLinecap="round"
            strokeWidth="3.5"
            strokeDasharray="10 12"
          />
          <path
            d="M70 282 C 172 246, 248 234, 350 212 S 460 188, 522 152"
            fill="none"
            stroke="url(#route-secondary)"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
          <path
            d="M98 96 C 156 84, 232 84, 286 104 S 410 148, 472 204"
            fill="none"
            stroke="#E2E8F0"
            strokeOpacity="0.16"
            strokeLinecap="round"
            strokeWidth="1"
          />

          <circle cx="44" cy="248" r="8" fill="#67E8F9" fillOpacity="0.85" />
          <circle cx="520" cy="74" r="8" fill="#F59E0B" fillOpacity="0.92" />
          <circle cx="522" cy="152" r="6" fill="#94A3B8" fillOpacity="0.72" />

          <g opacity="0.8">
            <rect x="356" y="218" width="16" height="40" rx="4" fill="#38BDF8" fillOpacity="0.45" />
            <rect x="380" y="196" width="16" height="62" rx="4" fill="#60A5FA" fillOpacity="0.55" />
            <rect x="404" y="178" width="16" height="80" rx="4" fill="#F59E0B" fillOpacity="0.85" />
            <rect x="428" y="206" width="16" height="52" rx="4" fill="#E2E8F0" fillOpacity="0.35" />
          </g>
        </svg>

        <div className="absolute left-[16%] top-[64%] animate-flight-drift rounded-full border border-white/10 bg-white/10 p-2 shadow-lg shadow-cyan-500/10">
          <Plane className="size-4 -rotate-12 text-amber-300" aria-hidden="true" />
        </div>

        <div className="absolute left-[10%] top-[70%] animate-pulse-soft h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.7)]" />
        <div className="absolute left-[78%] top-[16%] animate-pulse-soft h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.7)]" />

        <div className="absolute left-[53%] top-[18%] animate-float-slow rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-cyan-200 backdrop-blur">
          Frequency Edge
        </div>
        <div className="absolute left-[71%] top-[62%] animate-float-reverse rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-medium text-amber-200 backdrop-blur">
          Scope Fit
        </div>
        <div className="absolute left-[28%] top-[80%] rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 backdrop-blur">
          Sales-Ready Briefing
        </div>
      </div>
    </div>
  );
}