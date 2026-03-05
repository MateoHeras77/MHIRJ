import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'blue' | 'red' | 'amber' | 'green';
}

const ACCENT_STYLES = {
  blue:  'bg-blue-50 text-blue-600',
  red:   'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  green: 'bg-green-50 text-green-600',
};

export function KpiCard({ label, value, sub, icon: Icon, accent = 'blue' }: KpiCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 leading-none">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          {Icon && (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${ACCENT_STYLES[accent]}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
