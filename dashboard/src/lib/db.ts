import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.claude-cost-tracker');
const DB_PATH = path.join(DB_DIR, 'usage.db');

const CLAUDE_SETTINGS_PATHS = [
  path.join(os.homedir(), '.claude', 'settings.json'),
  path.join(os.homedir(), '.claude.json'),
];

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db && _db.open) return _db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      developer TEXT NOT NULL,
      project TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      file_path TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_creation_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      session_id TEXT,
      developer_email TEXT
    )
  `);

  try {
    _db.exec(`ALTER TABLE usage ADD COLUMN developer_email TEXT`);
  } catch { /* already exists */ }

  try {
    _db.exec(`ALTER TABLE usage ADD COLUMN model TEXT`);
  } catch { /* already exists */ }

  _db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'daily_spend',
      threshold_usd REAL NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_triggered_at TEXT
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'daily',
      limit_usd REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      actor TEXT
    )
  `);

  return _db;
}

// --- Interfaces ---

export interface DailyCost {
  date: string;
  cost: number;
  tokens: number;
}

export interface TotalStats {
  total_cost: number;
  total_tokens: number;
  total_calls: number;
  today_cost: number;
  today_calls: number;
  yesterday_cost: number;
  unique_sessions: number;
}

export interface ProjectCost {
  project: string;
  cost: number;
  calls: number;
}

export interface ToolCost {
  tool_name: string;
  cost: number;
  calls: number;
}

export interface UsageRecord {
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
}

export interface DeveloperCost {
  developer: string;
  developer_email: string | null;
  cost: number;
  calls: number;
}

export interface Alert {
  id: number;
  type: string;
  threshold_usd: number;
  enabled: number;
  created_at: string;
  last_triggered_at: string | null;
}

export interface HealthStatus {
  db_exists: boolean;
  db_path: string;
  record_count: number;
  last_record_at: string | null;
  hook_installed: boolean;
  hook_path: string | null;
  settings_path: string | null;
  node_version: string;
}

export interface Budget {
  id: number;
  type: string;
  limit_usd: number;
  created_at: string;
}

export interface BudgetStatus extends Budget {
  current_spend: number;
  percentage: number;
}

export interface SessionSummary {
  session_id: string;
  started_at: string;
  ended_at: string;
  tool_calls: number;
  total_cost: number;
  tools_used: string;
}

export interface Projection {
  avg_daily_cost: number;
  projected_monthly_cost: number;
  days_remaining: number;
  days_sampled: number;
}

export interface EfficiencyScore {
  cache_hit_ratio: number;
  rating: string;
  total_input_tokens: number;
  total_cache_read_tokens: number;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  action: string;
  detail: string | null;
  actor: string | null;
}

// --- Query Functions ---

export function getDailyCosts(days: number = 14): DailyCost[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      date(timestamp) as date,
      ROUND(SUM(cost_usd), 6) as cost,
      SUM(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens) as tokens
    FROM usage
    WHERE timestamp >= datetime('now', ?)
    GROUP BY date(timestamp)
    ORDER BY date ASC
  `).all(`-${days} days`) as DailyCost[];
}

export function getTotalStats(): TotalStats {
  const db = getDb();

  const allTime = db.prepare(`
    SELECT
      COALESCE(ROUND(SUM(cost_usd), 6), 0) as total_cost,
      COALESCE(SUM(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens), 0) as total_tokens,
      COUNT(*) as total_calls,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM usage
  `).get() as { total_cost: number; total_tokens: number; total_calls: number; unique_sessions: number };

  const today = db.prepare(`
    SELECT
      COALESCE(ROUND(SUM(cost_usd), 6), 0) as today_cost,
      COUNT(*) as today_calls
    FROM usage
    WHERE date(timestamp) = date('now')
  `).get() as { today_cost: number; today_calls: number };

  const yesterday = db.prepare(`
    SELECT COALESCE(ROUND(SUM(cost_usd), 6), 0) as yesterday_cost
    FROM usage
    WHERE date(timestamp) = date('now', '-1 day')
  `).get() as { yesterday_cost: number };

  return {
    total_cost: allTime.total_cost,
    total_tokens: allTime.total_tokens,
    total_calls: allTime.total_calls,
    today_cost: today.today_cost,
    today_calls: today.today_calls,
    yesterday_cost: yesterday.yesterday_cost,
    unique_sessions: allTime.unique_sessions,
  };
}

export function getRecentActivity(limit: number = 20): UsageRecord[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM usage ORDER BY timestamp DESC LIMIT ?`
  ).all(limit) as UsageRecord[];
}

export function getCostByProject(): ProjectCost[] {
  const db = getDb();
  return db.prepare(`
    SELECT project, ROUND(SUM(cost_usd), 6) as cost, COUNT(*) as calls
    FROM usage GROUP BY project ORDER BY cost DESC
  `).all() as ProjectCost[];
}

export function getCostByTool(): ToolCost[] {
  const db = getDb();
  return db.prepare(`
    SELECT tool_name, ROUND(SUM(cost_usd), 6) as cost, COUNT(*) as calls
    FROM usage GROUP BY tool_name ORDER BY cost DESC
  `).all() as ToolCost[];
}

export function getCostByDeveloper(): DeveloperCost[] {
  const db = getDb();
  return db.prepare(`
    SELECT developer, MAX(developer_email) as developer_email,
      ROUND(SUM(cost_usd), 6) as cost, COUNT(*) as calls
    FROM usage GROUP BY developer ORDER BY cost DESC
  `).all() as DeveloperCost[];
}

export function getAlerts(): Alert[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM alerts ORDER BY created_at DESC`).all() as Alert[];
}

export function createAlert(thresholdUsd: number): Alert {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO alerts (type, threshold_usd, enabled, created_at)
    VALUES ('daily_spend', ?, 1, ?)
  `).run(thresholdUsd, now);
  logAudit('alert_created', `Threshold: $${thresholdUsd.toFixed(2)}`);
  return {
    id: Number(result.lastInsertRowid),
    type: 'daily_spend',
    threshold_usd: thresholdUsd,
    enabled: 1,
    created_at: now,
    last_triggered_at: null,
  };
}

export function deleteAlert(id: number): void {
  getDb().prepare(`DELETE FROM alerts WHERE id = ?`).run(id);
  logAudit('alert_deleted', `Alert #${id}`);
}

export function toggleAlert(id: number, enabled: boolean): void {
  getDb().prepare(`UPDATE alerts SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
  logAudit('alert_toggled', `Alert #${id} ${enabled ? 'enabled' : 'disabled'}`);
}

export function checkAlerts(): { triggered: Alert[]; todayCost: number } {
  const db = getDb();
  const todayResult = db.prepare(`
    SELECT COALESCE(SUM(cost_usd), 0) as today_cost
    FROM usage WHERE date(timestamp) = date('now')
  `).get() as { today_cost: number };

  const todayCost = todayResult.today_cost;
  const todayDate = new Date().toISOString().split('T')[0];

  const activeAlerts = db.prepare(`
    SELECT * FROM alerts
    WHERE enabled = 1 AND (last_triggered_at IS NULL OR date(last_triggered_at) != ?)
  `).all(todayDate) as Alert[];

  const triggered = activeAlerts.filter(a => todayCost >= a.threshold_usd);

  if (triggered.length > 0) {
    const updateStmt = db.prepare(`UPDATE alerts SET last_triggered_at = ? WHERE id = ?`);
    const now = new Date().toISOString();
    for (const alert of triggered) {
      updateStmt.run(now, alert.id);
    }
  }

  return { triggered, todayCost };
}

// --- Health Check ---

export function getHealthStatus(): HealthStatus {
  const dbExists = fs.existsSync(DB_PATH);

  let recordCount = 0;
  let lastRecordAt: string | null = null;
  if (dbExists) {
    const db = getDb();
    const countResult = db.prepare(`SELECT COUNT(*) as cnt FROM usage`).get() as { cnt: number };
    recordCount = countResult.cnt;
    if (recordCount > 0) {
      const lastResult = db.prepare(
        `SELECT timestamp FROM usage ORDER BY timestamp DESC LIMIT 1`
      ).get() as { timestamp: string };
      lastRecordAt = lastResult.timestamp;
    }
  }

  let hookInstalled = false;
  let hookPath: string | null = null;
  let settingsPath: string | null = null;

  for (const sp of CLAUDE_SETTINGS_PATHS) {
    if (fs.existsSync(sp)) {
      settingsPath = sp;
      try {
        const raw = fs.readFileSync(sp, 'utf8');
        const settings = JSON.parse(raw) as Record<string, unknown>;
        const hooks = settings.hooks as Record<string, unknown> | undefined;
        const postToolUse = settings.PostToolUse || (hooks && hooks.PostToolUse);
        if (Array.isArray(postToolUse)) {
          for (const entry of postToolUse) {
            const hooks = (entry as Record<string, unknown>).hooks;
            if (Array.isArray(hooks)) {
              for (const h of hooks) {
                const cmd = (h as Record<string, unknown>).command;
                if (typeof cmd === 'string' && cmd.includes('cost-tracker.js')) {
                  hookInstalled = true;
                  const match = cmd.match(/node\s+(.+cost-tracker\.js)/);
                  hookPath = match ? match[1] : cmd;
                }
              }
            }
          }
        }
      } catch { /* ignore parse errors */ }
      break;
    }
  }

  return {
    db_exists: dbExists,
    db_path: DB_PATH,
    record_count: recordCount,
    last_record_at: lastRecordAt,
    hook_installed: hookInstalled,
    hook_path: hookPath,
    settings_path: settingsPath,
    node_version: process.version,
  };
}

// --- Export ---

export function getAllRecords(days: number = 30): UsageRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM usage
    WHERE timestamp >= datetime('now', ?)
    ORDER BY timestamp DESC
  `).all(`-${days} days`) as UsageRecord[];
}

// --- Budgets ---

export function getBudgets(): BudgetStatus[] {
  const db = getDb();
  const budgets = db.prepare(`SELECT * FROM budgets ORDER BY created_at DESC`).all() as Budget[];
  const now = new Date();

  return budgets.map(b => {
    let spend = 0;
    if (b.type === 'daily') {
      spend = (db.prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) as s FROM usage WHERE date(timestamp) = date('now')`
      ).get() as { s: number }).s;
    } else if (b.type === 'weekly') {
      spend = (db.prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) as s FROM usage WHERE timestamp >= datetime('now', '-7 days')`
      ).get() as { s: number }).s;
    } else {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      spend = (db.prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) as s FROM usage WHERE date(timestamp) >= ?`
      ).get(monthStart) as { s: number }).s;
    }
    return { ...b, current_spend: spend, percentage: b.limit_usd > 0 ? (spend / b.limit_usd) * 100 : 0 };
  });
}

export function createBudget(type: string, limitUsd: number): Budget {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare(
    `INSERT INTO budgets (type, limit_usd, created_at) VALUES (?, ?, ?)`
  ).run(type, limitUsd, now);
  logAudit('budget_created', `${type} budget: $${limitUsd.toFixed(2)}`);
  return { id: Number(result.lastInsertRowid), type, limit_usd: limitUsd, created_at: now };
}

export function deleteBudget(id: number): void {
  getDb().prepare(`DELETE FROM budgets WHERE id = ?`).run(id);
  logAudit('budget_deleted', `Budget #${id}`);
}

// --- Sessions ---

export function getSessionSummaries(limit: number = 20): SessionSummary[] {
  const db = getDb();
  return db.prepare(`
    SELECT session_id, MIN(timestamp) as started_at, MAX(timestamp) as ended_at,
      COUNT(*) as tool_calls, ROUND(SUM(cost_usd), 6) as total_cost,
      GROUP_CONCAT(DISTINCT tool_name) as tools_used
    FROM usage WHERE session_id IS NOT NULL
    GROUP BY session_id ORDER BY started_at DESC LIMIT ?
  `).all(limit) as SessionSummary[];
}

export function getSessionDetails(sessionId: string): UsageRecord[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM usage WHERE session_id = ? ORDER BY timestamp ASC`
  ).all(sessionId) as UsageRecord[];
}

// --- Projection ---

export function getProjection(): Projection {
  const db = getDb();
  const result = db.prepare(`
    SELECT COALESCE(AVG(daily_cost), 0) as avg_daily, COUNT(*) as days_sampled
    FROM (
      SELECT date(timestamp) as d, SUM(cost_usd) as daily_cost
      FROM usage WHERE timestamp >= datetime('now', '-7 days')
      GROUP BY date(timestamp)
    )
  `).get() as { avg_daily: number; days_sampled: number };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();

  return {
    avg_daily_cost: result.avg_daily,
    projected_monthly_cost: result.avg_daily * daysInMonth,
    days_remaining: daysRemaining,
    days_sampled: result.days_sampled,
  };
}

// --- Token Efficiency ---

export function getEfficiencyScore(): EfficiencyScore {
  const db = getDb();
  const result = db.prepare(`
    SELECT
      COALESCE(SUM(input_tokens), 0) as total_input,
      COALESCE(SUM(cache_read_tokens), 0) as total_cache_read
    FROM usage
  `).get() as { total_input: number; total_cache_read: number };

  const denominator = result.total_input + result.total_cache_read;
  const ratio = denominator > 0 ? (result.total_cache_read / denominator) * 100 : 0;

  let rating = 'No data';
  if (denominator > 0) {
    if (ratio >= 60) rating = 'Excellent';
    else if (ratio >= 40) rating = 'Good';
    else if (ratio >= 20) rating = 'Fair';
    else rating = 'Poor';
  }

  return {
    cache_hit_ratio: ratio,
    rating,
    total_input_tokens: result.total_input,
    total_cache_read_tokens: result.total_cache_read,
  };
}

// --- Audit Log ---

export function logAudit(action: string, detail?: string, actor?: string): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_log (timestamp, action, detail, actor) VALUES (?, ?, ?, ?)`
    ).run(new Date().toISOString(), action, detail ?? null, actor ?? null);
  } catch { /* never fail on audit logging */ }
}

export function getAuditLog(limit: number = 50): AuditEntry[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?`
  ).all(limit) as AuditEntry[];
}

// --- Developer Count ---

export function getDeveloperCount(): number {
  const db = getDb();
  const result = db.prepare(
    `SELECT COUNT(DISTINCT developer) as cnt FROM usage`
  ).get() as { cnt: number };
  return result.cnt;
}
