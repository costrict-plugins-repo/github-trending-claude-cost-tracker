'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ProjectCost {
  project: string;
  cost: number;
  calls: number;
}

interface ToolCost {
  tool_name: string;
  cost: number;
  calls: number;
}

interface BreakdownChartsProps {
  byProject: ProjectCost[];
  byTool: ToolCost[];
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
];

function BreakdownTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { cost: number; calls: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-xl">
      <p className="text-lg font-bold text-[var(--accent-light)]">
        ${data.cost.toFixed(4)}
      </p>
      <p className="text-xs text-[var(--muted)]">{data.calls} calls</p>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="flex items-center justify-center h-48 text-[var(--muted)]">
        No data yet
      </div>
    </div>
  );
}

export default function BreakdownCharts({ byProject, byTool }: BreakdownChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {byProject.length === 0 ? (
        <EmptyState title="Cost by Project" />
      ) : (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
          <h2 className="text-lg font-semibold mb-4">Cost by Project</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byProject} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis
                type="number"
                tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#262626' }}
              />
              <YAxis
                type="category"
                dataKey="project"
                tick={{ fill: '#ededed', fontSize: 12 }}
                width={120}
                axisLine={{ stroke: '#262626' }}
              />
              <Tooltip content={<BreakdownTooltip />} />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={30}>
                {byProject.map((_, index) => (
                  <Cell key={`project-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {byTool.length === 0 ? (
        <EmptyState title="Cost by Tool" />
      ) : (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
          <h2 className="text-lg font-semibold mb-4">Cost by Tool</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byTool} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis
                type="number"
                tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#262626' }}
              />
              <YAxis
                type="category"
                dataKey="tool_name"
                tick={{ fill: '#ededed', fontSize: 12 }}
                width={80}
                axisLine={{ stroke: '#262626' }}
              />
              <Tooltip content={<BreakdownTooltip />} />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={30}>
                {byTool.map((_, index) => (
                  <Cell key={`tool-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
