'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { TopRoute } from '@/lib/queries';
import { CATEGORY_COLORS } from '@/lib/constants';

interface Props { data: (TopRoute & { dominant_category?: string })[] }

export function RoutesBar({ data }: Props) {
  const top = data.slice(0, 15);

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart
        data={top}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="route_code"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v, _name, item) => {
            const p = item.payload as TopRoute;
            return [`${(v as number).toLocaleString()} flights · ${p.avg_block_min ?? '—'} min avg`, p.route_code ?? ''];
          }}
        />
        <Bar dataKey="flights" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {top.map((entry, i) => (
            <Cell
              key={i}
              fill={CATEGORY_COLORS[(entry as { dominant_category?: string }).dominant_category ?? 'Other'] ?? '#003DA5'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
