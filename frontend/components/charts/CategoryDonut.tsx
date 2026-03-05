'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CategoryCount } from '@/lib/queries';
import { CATEGORY_COLORS, CATEGORY_ORDER } from '@/lib/constants';

interface Props { data: CategoryCount[] }

export function CategoryDonut({ data }: Props) {
  const sorted = [...data]
    .filter(d => d.aircraft_category != null)
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.aircraft_category!);
      const bi = CATEGORY_ORDER.indexOf(b.aircraft_category!);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  const nullRow = data.find(d => d.aircraft_category == null);
  const chartData = [
    ...sorted,
    ...(nullRow ? [{ ...nullRow, aircraft_category: 'Unknown' }] : []),
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="cnt"
          nameKey="aircraft_category"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.aircraft_category}
              fill={CATEGORY_COLORS[entry.aircraft_category ?? 'Other'] ?? '#9CA3AF'}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [(value as number).toLocaleString()]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend
          formatter={(value) => <span className="text-xs">{value}</span>}
          iconSize={10}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
