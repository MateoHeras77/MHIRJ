/**
 * Shared design tokens used across all chart components and UI elements.
 * Aviation-blue palette with amber reserved for the Opportunity page.
 */

export type NumericLike = number | string | null | undefined;

export const CATEGORY_COLORS: Record<string, string> = {
  'CRJ':              '#C8102E', // MHIRJ red
  'Regional Jet':     '#F59E0B', // amber — Embraer (opportunity)
  'Narrowbody':       '#003DA5', // aviation blue
  'Widebody':         '#0EA5E9', // sky blue
  'Turboprop':        '#F97316', // orange — direct upgrade target
  'Business Jet':     '#8B5CF6', // purple
  'General Aviation': '#10B981', // emerald
  'Other':            '#9CA3AF', // gray
};

export const CATEGORY_ORDER = [
  'Narrowbody',
  'Regional Jet',
  'Widebody',
  'CRJ',
  'Turboprop',
  'Business Jet',
  'General Aviation',
  'Other',
];

export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const FIT_BAND_COLORS: Record<string, string> = {
  'Core Regional': '#0F766E',
  'Priority Window': '#2563EB',
  'Stretch Window': '#D97706',
  'Outside Priority': '#B91C1C',
  'Unclassified': '#6B7280',
};

export const THESIS_TONE_CLASSES: Record<string, string> = {
  amber: 'border-amber-200 bg-amber-100 text-amber-900',
  blue: 'border-blue-200 bg-blue-100 text-blue-900',
  green: 'border-emerald-200 bg-emerald-100 text-emerald-900',
  violet: 'border-violet-200 bg-violet-100 text-violet-900',
  slate: 'border-slate-200 bg-slate-100 text-slate-800',
};

export function toNumber(value: NumericLike): number {
  if (value == null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Format a number with thousands separators */
export function fmt(n: NumericLike): string {
  if (n == null) return '—';
  return toNumber(n).toLocaleString('en-CA');
}

/** Format a percentage */
export function fmtPct(n: NumericLike): string {
  if (n == null) return '—';
  return `${toNumber(n).toFixed(1)}%`;
}

/** Format minutes as "Xh Ym" */
export function fmtBlock(min: NumericLike): string {
  if (min == null) return '—';
  const value = Math.round(toNumber(min));
  const h = Math.floor(value / 60);
  const m = value % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return `${new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Toronto',
  }).format(new Date(value))} ET`;
}

export function fmtDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return '—';
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}
