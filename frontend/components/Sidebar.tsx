'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Plane, Layers, TrendingUp } from 'lucide-react';

const NAV = [
  { href: '/',            label: 'Dashboard',            icon: BarChart3,  description: 'YYZ overview' },
  { href: '/routes',      label: 'Airport Intelligence',  icon: Plane,      description: 'Airlines & routes' },
  { href: '/fleet',       label: 'Fleet Analysis',        icon: Layers,     description: 'Aircraft & airlines' },
  { href: '/opportunity', label: 'CRJ Opportunity',       icon: TrendingUp, description: 'Sales intelligence', highlight: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#002d7a] text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C8102E] rounded flex items-center justify-center font-bold text-sm">
            M
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">MHIRJ</div>
            <div className="text-xs text-blue-300 leading-tight">Route Intelligence</div>
          </div>
        </div>
      </div>

      {/* Airport badge */}
      <div className="px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-xs text-blue-300">
          <span className="bg-white/10 rounded px-2 py-0.5 font-mono font-semibold text-white">YYZ</span>
          <span>Toronto Pearson</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon, description, highlight }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-white/15 text-white'
                  : highlight
                    ? 'text-amber-300 hover:bg-amber-400/10 hover:text-amber-200'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <Icon
                className={[
                  'w-4 h-4 flex-shrink-0',
                  highlight && !active ? 'text-amber-400' : '',
                ].join(' ')}
              />
              <div className="min-w-0">
                <div className="font-medium truncate">{label}</div>
                <div className={`text-xs truncate ${active ? 'text-blue-300' : 'text-blue-400/70'}`}>
                  {description}
                </div>
              </div>
              {highlight && (
                <span className="ml-auto text-[10px] font-bold bg-amber-400 text-amber-900 rounded px-1.5 py-0.5">
                  NEW
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10 text-[11px] text-blue-400">
        <div>Data: AeroDataBox</div>
        <div>Updated daily · Jan 2026–now</div>
      </div>
    </aside>
  );
}
