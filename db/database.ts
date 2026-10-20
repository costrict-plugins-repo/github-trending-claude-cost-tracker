import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.claude-cost-tracker');
const DB_PATH = path.join(DB_DIR, 'usage.db');

let _db: Database.Database | null = null;

function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

export function getDb(): Database.Database {
  if (_db && _db.open) return _db;

  ensureDbDir();
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
      developer_email TEXT,
      model TEXT
    )
  `);

  try { _db.exec(`ALTER TABLE usage ADD COLUMN developer_email TEXT`); } catch { /* exists */ }
  try { _db.exec(`ALTER TABLE usage ADD COLUMN model TEXT`); } catch { /* exists */ }

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

export interface UsageRecord {
  id?: number;
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
  model?: string | null;
}

export interface DeveloperCost {
  developer: string;
  developer_email: string | null;
  cost: number;
  calls: number;
}

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

export interface Alert {
  id: number;
  type: string;
  threshold_usd: number;
  enabled: number;
  created_at: string;
  last_triggered_at: string | null;
}

// --- Query Functions ---

export function insertUsage(record: Omit<UsageRecord, 'id'>): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO usage (
      timestamp, developer, developer_email, project, tool_name, file_path,
      input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
      cost_usd, session_id, model
    ) VALUES (
      @timestamp, @developer, @developer_email, @project, @tool_name, @file_path,
      @input_tokens, @output_tokens, @cache_read_tokens, @cache_creation_tokens,
      @cost_usd, @session_id, @model
    )
  `).run({ ...record, model: record.model ?? null });
}

export function getDailyCosts(days: number = 14): DailyCost[] {
  return getDb().prepare(`
    SELECT date(timestamp) as date, ROUND(SUM(cost_usd), 6) as cost,
      SUM(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens) as tokens
    FROM usage WHERE timestamp >= datetime('now', ?)
    GROUP BY date(timestamp) ORDER BY date ASC
  `).all(`-${days} days`) as DailyCost[];
}

export function getTotalStats(): TotalStats {
  const db = getDb();
  const allTime = db.prepare(`
    SELECT COALESCE(ROUND(SUM(cost_usd), 6), 0) as total_cost,
      COALESCE(SUM(input_tokens + output_tokens + cache_read_tokens + cache_creation_tokens), 0) as total_tokens,
      COUNT(*) as total_calls, COUNT(DISTINCT session_id) as unique_sessions
    FROM usage
  `).get() as { total_cost: number; total_tokens: number; total_calls: number; unique_sessions: number };

  const today = db.prepare(`
    SELECT COALESCE(ROUND(SUM(cost_usd), 6), 0) as today_cost, COUNT(*) as today_calls
    FROM usage WHERE date(timestamp) = date('now')
  `).get() as { today_cost: number; today_calls: number };

  const yesterday = db.prepare(`
    SELECT COALESCE(ROUND(SUM(cost_usd), 6), 0) as yesterday_cost
    FROM usage WHERE date(timestamp) = date('now', '-1 day')
  `).get() as { yesterday_cost: number };

  return { ...allTime, ...today, yesterday_cost: yesterday.yesterday_cost };
}

export function getRecentActivity(limit: number = 20): UsageRecord[] {
  return getDb().prepare(`SELECT * FROM usage ORDER BY timestamp DESC LIMIT ?`).all(limit) as UsageRecord[];
}

export function getCostByProject(): ProjectCost[] {
  return getDb().prepare(`
    SELECT project, ROUND(SUM(cost_usd), 6) as cost, COUNT(*) as calls
    FROM usage GROUP BY project ORDER BY cost DESC
  `).all() as ProjectCost[];
}

export function getCostByTool(): ToolCost[] {
  return getDb().prepare(`
    SELECT tool_name, ROUND(SUM(cost_usd), 6) as cost, COUNT(*) as calls
    FROM usage GROUP BY tool_name ORDER BY cost DESC
  `).all() as ToolCost[];
}

export function getCostByDeveloper(): DeveloperCost[] {
  return getDb().prepare(`
    SELECT developer, MAX(developer_email) as developer_email,
      ROUND(SUM(cost_usd), 6) as cost, COUNT(*) as calls
    FROM usage GROUP BY developer ORDER BY cost DESC
  `).all() as DeveloperCost[];
}

export function getAlerts(): Alert[] {
  return getDb().prepare(`SELECT * FROM alerts ORDER BY created_at DESC`).all() as Alert[];
}

export function createAlert(thresholdUsd: number): Alert {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO alerts (type, threshold_usd, enabled, created_at) VALUES ('daily_spend', ?, 1, ?)
  `).run(thresholdUsd, now);
  return { id: Number(result.lastInsertRowid), type: 'daily_spend', threshold_usd: thresholdUsd, enabled: 1, created_at: now, last_triggered_at: null };
}

export function deleteAlert(id: number): void {
  getDb().prepare(`DELETE FROM alerts WHERE id = ?`).run(id);
}

export function toggleAlert(id: number, enabled: boolean): void {
  getDb().prepare(`UPDATE alerts SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}

export function checkAlerts(): { triggered: Alert[]; todayCost: number } {
  const db = getDb();
  const todayCost = (db.prepare(
    `SELECT COALESCE(SUM(cost_usd), 0) as c FROM usage WHERE date(timestamp) = date('now')`
  ).get() as { c: number }).c;
  const todayDate = new Date().toISOString().split('T')[0];
  const active = db.prepare(
    `SELECT * FROM alerts WHERE enabled = 1 AND (last_triggered_at IS NULL OR date(last_triggered_at) != ?)`
  ).all(todayDate) as Alert[];
  const triggered = active.filter(a => todayCost >= a.threshold_usd);
  if (triggered.length > 0) {
    const stmt = db.prepare(`UPDATE alerts SET last_triggered_at = ? WHERE id = ?`);
    const now = new Date().toISOString();
    for (const a of triggered) stmt.run(now, a.id);
  }
  return { triggered, todayCost };
}

export function resetDatabase(): void {
  ensureDbDir();
  if (_db && _db.open) { _db.close(); _db = null; }
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  getDb();
}

export { DB_PATH, DB_DIR };
