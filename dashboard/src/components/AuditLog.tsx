'use client';

import { useState, useEffect } from 'react';

interface AuditEntry {
  id: number;
  timestamp: string;
  action: string;
  detail: string | null;
  actor: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  alert_created: 'Alert Created',
  alert_deleted: 'Alert Deleted',
  alert_toggled: 'Alert Toggled',
  budget_created: 'Budget Created',
  budget_deleted: 'Budget Deleted',
  model_changed: 'Model Changed',
  db_reset: 'Database Reset',
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/audit')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEntries(data); })
      .catch(() => {});
  }, []);

  if (entries.length === 0) return null;

  const visible = expanded ? entries : entries.slice(0, 5);

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <h2 className="text-lg font-semibold mb-4">Audit Log</h2>
      <div className="space-y-2">
        {visible.map(e => (
          <div key={e.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-[var(--accent-light)]">
                {ACTION_LABELS[e.action] || e.action}
              </span>
              {e.detail && (
                <span className="text-xs text-[var(--muted)] truncate">{e.detail}</span>
              )}
            </div>
            <span className="text-xs text-[var(--muted)] flex-shrink-0 ml-2">{timeAgo(e.timestamp)}</span>
          </div>
        ))}
      </div>
      {entries.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-[var(--accent-light)] hover:underline"
        >
          {expanded ? 'Show less' : `Show all ${entries.length} entries`}
        </button>
      )}
    </div>
  );
}
