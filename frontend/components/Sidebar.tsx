'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Home,
  Layers,
  Menu,
  Plane,
  TrendingUp,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/',             label: 'Home',                 icon: Home,       description: 'About me & project' },
  { href: '/dashboard',    label: 'Dashboard',            icon: BarChart3,  description: 'YYZ overview' },
  { href: '/routes',       label: 'Airport Intelligence', icon: Plane,      description: 'Airlines & routes' },
  { href: '/fleet',        label: 'Fleet Analysis',       icon: Layers,     description: 'Aircraft & airlines' },
  { href: '/opportunity',  label: 'CRJ Opportunity',      icon: TrendingUp, description: 'Sales intelligence', highlight: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  useEffect(() => {
    if (!isMobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsMobileOpen(false);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const renderNav = (compact = false) => (
    <nav className={['flex-1 py-4', compact ? 'px-2' : 'px-3'].join(' ')}>
      {NAV.map(({ href, label, icon: Icon, description, highlight }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            title={compact ? label : undefined}
            aria-label={compact ? label : undefined}
            className={[
              'group mb-1 rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              compact ? 'flex items-center justify-center px-0 py-3' : 'flex items-center gap-3 px-3 py-2.5',
              active
                ? 'bg-white/15 text-white'
                : highlight
                  ? 'text-amber-300 hover:bg-amber-400/10 hover:text-amber-200'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className={[
                  'h-4 w-4 flex-shrink-0',
                  highlight && !active ? 'text-amber-400' : '',
                ].join(' ')}
              />
              {compact && highlight ? (
                <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-amber-400" />
              ) : null}
            </div>

            {!compact ? (
              <>
                <div className="min-w-0">
                  <div className="font-medium truncate">{label}</div>
                  <div className={`text-xs truncate ${active ? 'text-blue-300' : 'text-blue-400/70'}`}>
                    {description}
                  </div>
                </div>
                {highlight ? (
                  <span className="ml-auto text-[10px] font-bold bg-amber-400 text-amber-900 rounded px-1.5 py-0.5">
                    NEW
                  </span>
                ) : null}
              </>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        aria-expanded={isMobileOpen}
        aria-controls="mobile-sidebar"
        aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
        className="fixed left-4 top-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003DA5] lg:hidden print:hidden"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] lg:hidden print:hidden"
        />
      ) : null}

      <aside
        id="mobile-sidebar"
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#002d7a] text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden print:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#C8102E] text-sm font-bold">
                M
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">MHIRJ</div>
                <div className="text-xs leading-tight text-blue-300">Route Intelligence</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-white/10 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-blue-300">
            <span className="rounded bg-white/10 px-2 py-0.5 font-mono font-semibold text-white">YYZ</span>
            <span>Toronto Pearson</span>
          </div>
        </div>

        {renderNav(false)}

        <div className="border-t border-white/10 px-6 py-4 text-[11px] text-blue-400">
          <div>Data: AeroDataBox</div>
          <div>Operating flights only · Jan 2026–now</div>
        </div>
      </aside>

      <aside
        className={[
          'relative hidden min-h-screen flex-shrink-0 flex-col bg-[#002d7a] text-white transition-[width] duration-300 ease-out lg:flex print:hidden',
          isDesktopCollapsed ? 'w-20' : 'w-64',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => setIsDesktopCollapsed((collapsed) => !collapsed)}
          aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-7 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-md transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003DA5]"
        >
          {isDesktopCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className={['border-b border-white/10 py-6', isDesktopCollapsed ? 'px-4' : 'px-6'].join(' ')}>
          <div className={['flex items-center', isDesktopCollapsed ? 'justify-center' : 'gap-3'].join(' ')}>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#C8102E] text-sm font-bold">
              M
            </div>
            {!isDesktopCollapsed ? (
              <div>
                <div className="text-sm font-bold leading-tight">MHIRJ</div>
                <div className="text-xs leading-tight text-blue-300">Route Intelligence</div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={['border-b border-white/10 py-3', isDesktopCollapsed ? 'px-3' : 'px-6'].join(' ')}>
          <div className={['flex items-center text-xs text-blue-300', isDesktopCollapsed ? 'justify-center' : 'gap-2'].join(' ')}>
            <span className="rounded bg-white/10 px-2 py-0.5 font-mono font-semibold text-white">YYZ</span>
            {!isDesktopCollapsed ? <span>Toronto Pearson</span> : null}
          </div>
        </div>

        {renderNav(isDesktopCollapsed)}

        <div className={['border-t border-white/10 py-4 text-[11px] text-blue-400', isDesktopCollapsed ? 'px-3 text-center' : 'px-6'].join(' ')}>
          {isDesktopCollapsed ? (
            <>
              <div className="font-mono text-white">YYZ</div>
              <div className="mt-1">Data live</div>
            </>
          ) : (
            <>
              <div>Data: AeroDataBox</div>
              <div>Operating flights only · Jan 2026–now</div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
