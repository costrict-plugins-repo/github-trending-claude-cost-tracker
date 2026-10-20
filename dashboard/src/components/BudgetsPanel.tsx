'use client';

import { useState } from 'react';

interface BudgetStatus {
  id: number;
  type: string;
  limit_usd: number;
  current_spend: number;
  percentage: number;
  created_at: string;
}

interface BudgetsPanelProps {
  budgets: BudgetStatus[];
  onRefresh: () => void;
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(5)}`;
}

function getBarColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-500';
  return 'bg-green-500';
}

export default function BudgetsPanel({ budgets, onRefresh }: BudgetsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLimit, setNewLimit] = useState('');
  const [newType, setNewType] = useState('daily');

  async function handleAdd() {
    const value = parseFloat(newLimit);
    if (isNaN(value) || value <= 0) return;
    try {
      await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, limit_usd: value }),
      });
      setNewLimit('');
      setIsAdding(false);
      onRefresh();
    } catch { /* silently fail */ }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch { /* silently fail */ }
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Budgets</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors font-medium"
          >
            + Add Budget
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <select
            value={newType}
            onChange={e => setNewType(e.target.value)}
            className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <span className="text-sm text-[var(--muted)]">limit $</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={newLimit}
            onChange={e => setNewLimit(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="5.00"
            className="w-24 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-[var(--accent)]"
            autoFocus
          />
          <button onClick={handleAdd} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 transition-colors font-medium">Save</button>
          <button onClick={() => { setIsAdding(false); setNewLimit(''); }} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors font-medium">Cancel</button>
        </div>
      )}

      {budgets.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No budgets set. Add one to track spend limits.</p>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => (
            <div key={b.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] bg-zinc-800 px-2 py-0.5 rounded">
                    {b.type}
                  </span>
                  <span className="text-sm">
                    {formatCost(b.current_spend)} / <span className="font-mono text-[var(--accent-light)]">{formatCost(b.limit_usd)}</span>
                  </span>
                  {b.percentage >= 100 && (
                    <span className="text-xs text-red-400 font-medium">EXCEEDED</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors p-1"
                >
                  Remove
                </button>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(b.percentage)}`}
                  style={{ width: `${Math.min(b.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--muted)]">{b.percentage.toFixed(0)}% used</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
