'use client';

interface UsageRecord {
  id: number;
  timestamp: string;
  developer: string;
  project: string;
  tool_name: string;
  file_path: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  cost_usd: number;
  session_id: string | null;
}

interface RecentActivityProps {
  records: UsageRecord[];
}

const TOOL_COLORS: Record<string, string> = {
  Edit: '#6366f1',
  Write: '#8b5cf6',
  Read: '#22c55e',
  Bash: '#f59e0b',
  Search: '#06b6d4',
  Glob: '#a78bfa',
};

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function shortenPath(filePath: string | null): string {
  if (!filePath) return '—';
  const parts = filePath.split('/');
  if (parts.length <= 3) return filePath;
  return `.../${parts.slice(-2).join('/')}`;
}

export default function RecentActivity({ records }: RecentActivityProps) {
  if (!records.length) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="flex items-center justify-center h-48 text-[var(--muted)]">
          No activity yet. Use Claude Code to see tool calls here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
      <div className="max-h-[400px] overflow-y-auto space-y-1">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: TOOL_COLORS[record.tool_name] || '#71717a' }}
              />
              <span className="font-medium text-sm w-16 flex-shrink-0">
                {record.tool_name}
              </span>
              <span className="text-sm text-[var(--muted)] truncate" title={record.file_path || undefined}>
                {shortenPath(record.file_path)}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
              <span className="text-sm font-mono text-[var(--accent-light)]">
                ${record.cost_usd.toFixed(5)}
              </span>
              <span className="text-xs text-[var(--muted)] w-16 text-right">
                {timeAgo(record.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
