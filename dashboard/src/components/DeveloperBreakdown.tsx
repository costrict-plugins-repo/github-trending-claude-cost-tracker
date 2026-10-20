'use client';

interface DeveloperCost {
  developer: string;
  developer_email: string | null;
  cost: number;
  calls: number;
}

interface DeveloperBreakdownProps {
  data: DeveloperCost[];
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(5)}`;
}

export default function DeveloperBreakdown({ data }: DeveloperBreakdownProps) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
        <h2 className="text-lg font-semibold mb-4">Cost by Developer</h2>
        <div className="flex items-center justify-center h-32 text-[var(--muted)]">
          No developer data yet
        </div>
      </div>
    );
  }

  const maxCost = Math.max(...data.map(d => d.cost));

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <h2 className="text-lg font-semibold mb-4">Cost by Developer</h2>
      <div className="space-y-3">
        {data.map((dev) => (
          <div key={dev.developer} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {dev.developer.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{dev.developer}</p>
                  {dev.developer_email && (
                    <p className="text-xs text-[var(--muted)] truncate">{dev.developer_email}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-sm font-mono font-medium text-[var(--accent-light)]">
                  {formatCost(dev.cost)}
                </p>
                <p className="text-xs text-[var(--muted)]">{dev.calls} calls</p>
              </div>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: `${(dev.cost / maxCost) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
