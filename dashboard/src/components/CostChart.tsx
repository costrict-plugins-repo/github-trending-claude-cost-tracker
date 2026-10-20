'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DailyCost {
  date: string;
  cost: number;
  tokens: number;
}

interface CostChartProps {
  data: DailyCost[];
  days?: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-xl">
      <p className="text-sm text-[var(--muted)] mb-1">{formatDate(label)}</p>
      <p className="text-lg font-bold text-[var(--accent-light)]">
        ${payload[0].value.toFixed(4)}
      </p>
    </div>
  );
}

export default function CostChart({ data, days = 14 }: CostChartProps) {
  const title = days === 1 ? 'Daily Cost (Today)' : `Daily Cost (Last ${days} Days)`;
  if (!data.length) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="flex items-center justify-center h-64 text-[var(--muted)]">
          No usage data yet. Start using Claude Code to see costs here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#262626' }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#262626' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="cost"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
