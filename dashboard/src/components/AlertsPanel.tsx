'use client';

import { useState } from 'react';

interface Alert {
  id: number;
  type: string;
  threshold_usd: number;
  enabled: number;
  created_at: string;
  last_triggered_at: string | null;
}

interface AlertsPanelProps {
  alerts: Alert[];
  triggeredAlerts: Alert[];
  todayCost: number;
  onRefresh: () => void;
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(5)}`;
}

export default function AlertsPanel({ alerts, triggeredAlerts, todayCost, onRefresh }: AlertsPanelProps) {
  const [newThreshold, setNewThreshold] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddAlert() {
    const value = parseFloat(newThreshold);
    if (isNaN(value) || value <= 0) return;

    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold_usd: value }),
      });
      setNewThreshold('');
      setIsAdding(false);
      onRefresh();
    } catch {
      // Silently fail
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      // Silently fail
    }
  }

  async function handleToggle(id: number, currentEnabled: number) {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: currentEnabled === 0 }),
      });
      onRefresh();
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Cost Alerts</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors font-medium"
          >
            + Add Alert
          </button>
        )}
      </div>

      {triggeredAlerts.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-400 font-medium">
            Daily spend alert triggered — today's cost is {formatCost(todayCost)}
          </p>
        </div>
      )}

      {isAdding && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-[var(--muted)]">Alert when daily cost exceeds $</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={newThreshold}
            onChange={e => setNewThreshold(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddAlert()}
            placeholder="1.00"
            className="w-24 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-[var(--accent)]"
            autoFocus
          />
          <button
            onClick={handleAddAlert}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition-colors font-medium"
          >
            Save
          </button>
          <button
            onClick={() => { setIsAdding(false); setNewThreshold(''); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No alerts configured. Add one to get notified when daily spend exceeds a threshold.
        </p>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const isTriggered = triggeredAlerts.some(t => t.id === alert.id);
            return (
              <div
                key={alert.id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  isTriggered ? 'bg-amber-500/5 border border-amber-500/20' : 'hover:bg-white/[0.03]'
                } transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(alert.id, alert.enabled)}
                    className={`w-8 h-5 rounded-full relative transition-colors ${
                      alert.enabled ? 'bg-green-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        alert.enabled ? 'left-3.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-sm">
                    Alert when daily cost exceeds{' '}
                    <span className="font-mono font-medium text-[var(--accent-light)]">
                      ${alert.threshold_usd.toFixed(2)}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors p-1"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
