/**
 * Shared design tokens used across all chart components and UI elements.
 * Aviation-blue palette with amber reserved for the Opportunity page.
 */

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

/** Format a number with thousands separators */
export function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-CA');
}

/** Format a percentage */
export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toFixed(1)}%`;
}

/** Format minutes as "Xh Ym" */
export function fmtBlock(min: number | null | undefined): string {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
