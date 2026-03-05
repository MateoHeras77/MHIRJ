'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DailyVolume } from '@/lib/queries';

interface Props { data: DailyVolume[] }

export function DailyTrend({ data }: Props) {
  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.flight_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#003DA5" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#003DA5" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          interval={6}
          tickLine={false}
          axisLine={false}
        />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v) => [(v as number).toLocaleString(), 'Flights']}
        />
        <Area
          type="monotone"
          dataKey="cnt"
          stroke="#003DA5"
          strokeWidth={2}
          fill="url(#volGrad)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
