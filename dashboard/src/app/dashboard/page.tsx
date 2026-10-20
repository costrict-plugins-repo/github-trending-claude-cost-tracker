'use client';

import { useEffect, useState, useCallback } from 'react';
import StatsCards from '@/components/StatsCards';
import CostChart from '@/components/CostChart';
import CostProjection from '@/components/CostProjection';
import BreakdownCharts from '@/components/BreakdownCharts';
import RecentActivity from '@/components/RecentActivity';
import DeveloperBreakdown from '@/components/DeveloperBreakdown';
import AlertsPanel from '@/components/AlertsPanel';
import BudgetsPanel from '@/components/BudgetsPanel';
import SessionsView from '@/components/SessionsView';
import AuditLog from '@/components/AuditLog';

interface AlertData {
  id: number;
  type: string;
  threshold_usd: number;
  enabled: number;
  created_at: string;
  last_triggered_at: string | null;
}

interface BudgetData {
  id: number;
  type: string;
  limit_usd: number;
  current_spend: number;
  percentage: number;
  created_at: string;
}

interface SessionData {
  session_id: string;
  started_at: string;
  ended_at: string;
  tool_calls: number;
  total_cost: number;
  tools_used: string;
}

interface DashboardData {
  daily: Array<{ date: string; cost: number; tokens: number }>;
  totals: {
    total_cost: number;
    total_tokens: number;
    total_calls: number;
    today_cost: number;
    today_calls: number;
    yesterday_cost: number;
    unique_sessions: number;
  };
  byProject: Array<{ project: string; cost: number; calls: number }>;
  byTool: Array<{ tool_name: string; cost: number; calls: number }>;
  byDeveloper: Array<{ developer: string; developer_email: string | null; cost: number; calls: number }>;
  recent: Array<{
    id: number;
    timestamp: string;
    developer: string;
    developer_email: string | null;
    project: string;
    tool_name: string;
    file_path: string | null;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_creation_tokens: number;
    cost_usd: number;
    session_id: string | null;
  }>;
  alerts: AlertData[];
  triggeredAlerts: AlertData[];
  todayCost: number;
  budgets: BudgetData[];
  projection: {
    avg_daily_cost: number;
    projected_monthly_cost: number;
    days_remaining: number;
    days_sampled: number;
  };
  efficiency: {
    cache_hit_ratio: number;
    rating: string;
    total_input_tokens: number;
    total_cache_read_tokens: number;
  };
  developerCount: number;
}

const POLL_INTERVAL = 10_000;
const DATE_RANGES = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [days, setDays] = useState(14);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?days=${days}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json() as DashboardData;
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    }
  }, [days]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) setSessions(await res.json() as SessionData[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSessions();
    const interval = setInterval(() => { fetchData(); fetchSessions(); }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData, fetchSessions]);

  function handleExport(format: 'csv' | 'json') {
    window.open(`/api/export?format=${format}&days=${days}`, '_blank');
  }

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {todayStr}
            {data ? ` \u00b7 ${data.developerCount} developer${data.developerCount !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[var(--muted)]">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`} />
        </div>
      </header>

      {/* Date range filter + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
          {DATE_RANGES.map(range => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                days === range.days
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--muted)] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--card-border)] text-[var(--muted)] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--card-border)] text-[var(--muted)] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <StatsCards totals={data?.totals ?? null} efficiency={data?.efficiency ?? null} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <CostProjection projection={data?.projection ?? null} />
          <div className="lg:col-span-2">
            <AlertsPanel
              alerts={data?.alerts ?? []}
              triggeredAlerts={data?.triggeredAlerts ?? []}
              todayCost={data?.todayCost ?? 0}
              onRefresh={fetchData}
            />
          </div>
        </div>

        <BudgetsPanel budgets={data?.budgets ?? []} onRefresh={fetchData} />

        <CostChart data={data?.daily ?? []} days={days} />

        <BreakdownCharts
          byProject={data?.byProject ?? []}
          byTool={data?.byTool ?? []}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DeveloperBreakdown data={data?.byDeveloper ?? []} />
          <RecentActivity records={data?.recent ?? []} />
        </div>

        <SessionsView sessions={sessions} />

        <AuditLog />
      </div>

      <footer className="mt-10 pb-6 text-center text-xs text-[var(--muted)]">
        Polling every {POLL_INTERVAL / 1000}s &middot; Showing last {days} day{days !== 1 ? 's' : ''} &middot; Data stored locally in ~/.claude-cost-tracker/usage.db
      </footer>
    </main>
  );
}
