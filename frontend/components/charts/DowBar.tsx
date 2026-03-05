'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DowVolume } from '@/lib/queries';
import { DOW_LABELS } from '@/lib/constants';

interface Props { data: DowVolume[] }

export function DowBar({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    day: DOW_LABELS[d.day_of_week] ?? `${d.day_of_week}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v) => [(v as number).toLocaleString(), 'Flights']}
        />
        <Bar dataKey="cnt" fill="#003DA5" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
