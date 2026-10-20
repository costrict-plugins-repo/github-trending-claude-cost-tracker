'use client';

interface Projection {
  avg_daily_cost: number;
  projected_monthly_cost: number;
  days_remaining: number;
  days_sampled: number;
}

interface CostProjectionProps {
  projection: Projection | null;
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(5)}`;
}

export default function CostProjection({ projection }: CostProjectionProps) {
  if (!projection || projection.days_sampled === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
        <p className="text-sm text-[var(--muted)] mb-1">Monthly Projection</p>
        <p className="text-3xl font-bold tracking-tight text-zinc-600">—</p>
        <p className="text-xs text-[var(--muted)] mt-2">Need at least 1 day of data</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <p className="text-sm text-[var(--muted)] mb-1">Monthly Projection</p>
      <p className="text-3xl font-bold tracking-tight">{formatCost(projection.projected_monthly_cost)}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-xs text-[var(--muted)]">
          ~{formatCost(projection.avg_daily_cost)}/day
        </span>
        <span className="text-xs text-[var(--muted)]">
          {projection.days_remaining}d left in month
        </span>
      </div>
    </div>
  );
}
