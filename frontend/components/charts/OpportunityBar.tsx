'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer,
} from 'recharts';
import { OpportunityAirlineRow } from '@/lib/queries';

interface Props { data: OpportunityAirlineRow[] }

export function OpportunityBar({ data }: Props) {
  const top = data.slice(0, 12);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={top} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="airline_name"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v, name) => [(v as number).toLocaleString(), name as string]}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="embraer_flights" name="Embraer (E-Series)" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
        <Bar dataKey="turboprop_flights" name="Turboprop" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
