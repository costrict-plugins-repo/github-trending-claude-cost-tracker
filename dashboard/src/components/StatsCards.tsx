'use client';

interface TotalStats {
  total_cost: number;
  total_tokens: number;
  total_calls: number;
  today_cost: number;
  today_calls: number;
  yesterday_cost: number;
  unique_sessions: number;
}

interface EfficiencyScore {
  cache_hit_ratio: number;
  rating: string;
}

interface StatsCardsProps {
  totals: TotalStats | null;
  efficiency?: EfficiencyScore | null;
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(5)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return <span className="text-xs text-[var(--muted)]">new today</span>;
  }

  const pctChange = ((current - previous) / previous) * 100;
  const isUp = pctChange > 0;
  const isFlat = Math.abs(pctChange) < 1;

  if (isFlat) {
    return <span className="text-xs text-[var(--muted)]">~same as yesterday</span>;
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-red-400' : 'text-green-400'}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d={isUp ? 'M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25' : 'M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25'}
        />
      </svg>
      {Math.abs(pctChange).toFixed(0)}% vs yesterday
    </span>
  );
}

const RATING_COLORS: Record<string, string> = {
  'Excellent': 'text-green-400',
  'Good': 'text-blue-400',
  'Fair': 'text-amber-400',
  'Poor': 'text-red-400',
  'No data': 'text-zinc-500',
};

function Card({ label, value, sublabel, trend }: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <p className="text-sm text-[var(--muted)] mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-3">
        {sublabel && <span className="text-xs text-[var(--muted)]">{sublabel}</span>}
        {trend}
      </div>
    </div>
  );
}

export default function StatsCards({ totals, efficiency }: StatsCardsProps) {
  if (!totals) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 animate-pulse">
            <div className="h-4 bg-zinc-800 rounded w-24 mb-3" />
            <div className="h-8 bg-zinc-800 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Today's Cost"
        value={formatCost(totals.today_cost)}
        sublabel={`${totals.today_calls} calls today`}
        trend={<TrendBadge current={totals.today_cost} previous={totals.yesterday_cost} />}
      />
      <Card
        label="Total Tokens Used"
        value={formatTokens(totals.total_tokens)}
        sublabel={`All time: ${formatCost(totals.total_cost)}`}
      />
      <Card
        label="Total Tool Calls"
        value={totals.total_calls.toLocaleString()}
        sublabel={`${totals.unique_sessions} unique sessions`}
      />
      <Card
        label="Cache Efficiency"
        value={efficiency ? `${efficiency.cache_hit_ratio.toFixed(0)}%` : '—'}
        sublabel={efficiency?.rating || 'No data'}
        trend={
          efficiency ? (
            <span className={`text-xs font-medium ${RATING_COLORS[efficiency.rating] || ''}`}>
              {efficiency.rating}
            </span>
          ) : undefined
        }
      />
    </div>
  );
}
