'use client';

import { useState, useCallback } from 'react';

interface SessionSummary {
  session_id: string;
  started_at: string;
  ended_at: string;
  tool_calls: number;
  total_cost: number;
  tools_used: string;
}

interface SessionRecord {
  id: number;
  timestamp: string;
  tool_name: string;
  file_path: string | null;
  cost_usd: number;
}

interface SessionsViewProps {
  sessions: SessionSummary[];
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(5)}`;
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function SessionRow({ session }: { session: SessionSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (details.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`/api/sessions?session_id=${encodeURIComponent(session.session_id)}`);
        const data = await res.json() as SessionRecord[];
        setDetails(data);
      } catch { /* ignore */ }
      setLoading(false);
    }
    setExpanded(true);
  }, [expanded, details.length, session.session_id]);

  const shortId = session.session_id.length > 16
    ? `${session.session_id.slice(0, 8)}...${session.session_id.slice(-4)}`
    : session.session_id;

  return (
    <div className="border-b border-zinc-800/50 last:border-0">
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-mono text-[var(--muted)]" title={session.session_id}>{shortId}</span>
          <span className="text-xs text-[var(--muted)]">{session.tool_calls} calls</span>
          <span className="text-xs text-[var(--muted)]">{formatDuration(session.started_at, session.ended_at)}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-zinc-400">{session.tools_used.split(',').slice(0, 3).join(', ')}</span>
          <span className="text-sm font-mono text-[var(--accent-light)]">{formatCost(session.total_cost)}</span>
          <span className="text-xs text-[var(--muted)]">{timeAgo(session.started_at)}</span>
        </div>
      </button>
      {expanded && (
        <div className="pl-10 pb-3 space-y-1">
          {loading && <p className="text-xs text-[var(--muted)]">Loading...</p>}
          {details.map(d => (
            <div key={d.id} className="flex items-center justify-between py-1 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white w-14">{d.tool_name}</span>
                <span className="truncate max-w-[200px]">{d.file_path ?? '—'}</span>
              </div>
              <span className="font-mono">${d.cost_usd.toFixed(5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionsView({ sessions }: SessionsViewProps) {
  if (!sessions.length) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
        <h2 className="text-lg font-semibold mb-4">Sessions</h2>
        <p className="text-sm text-[var(--muted)] text-center py-8">No session data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <h2 className="text-lg font-semibold mb-4">Sessions</h2>
      <div className="max-h-[400px] overflow-y-auto">
        {sessions.map(s => <SessionRow key={s.session_id} session={s} />)}
      </div>
    </div>
  );
}
