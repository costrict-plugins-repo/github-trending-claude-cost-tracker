import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import chalk from 'chalk';

const DB_DIR = path.join(os.homedir(), '.claude-cost-tracker');
const DB_PATH = path.join(DB_DIR, 'usage.db');

const PRICING = {
  input: 0.000003,
  output: 0.000015,
  cache_read: 0.0000003,
  cache_creation: 0.00000375,
};

const PROJECTS = ['claude-cost-tracker', 'web-app', 'backend-api'];
const DEVELOPERS = [
  { name: 'alice', email: 'alice@company.com' },
  { name: 'bob', email: 'bob@company.com' },
];
const TOOLS = ['Edit', 'Bash', 'Read', 'Write', 'Search', 'Glob'];
const FILE_PATHS = [
  '/src/app.tsx', '/src/components/Button.tsx', '/src/lib/api.ts',
  '/src/hooks/useAuth.ts', '/package.json', '/README.md',
  '/tests/app.test.ts', '/src/styles/globals.css', null, null,
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRecord(dayOffset: number) {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  date.setHours(rand(8, 22), rand(0, 59), rand(0, 59), rand(0, 999));

  const inputTokens = rand(200, 8000);
  const outputTokens = rand(50, 2000);
  const cacheRead = rand(0, 3000);
  const cacheCreation = Math.random() > 0.7 ? rand(0, 500) : 0;

  const costUsd =
    inputTokens * PRICING.input +
    outputTokens * PRICING.output +
    cacheRead * PRICING.cache_read +
    cacheCreation * PRICING.cache_creation;

  const dev = pick(DEVELOPERS);

  return {
    timestamp: date.toISOString(),
    developer: dev.name,
    developer_email: dev.email,
    project: pick(PROJECTS),
    tool_name: pick(TOOLS),
    file_path: pick(FILE_PATHS),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_tokens: cacheRead,
    cache_creation_tokens: cacheCreation,
    cost_usd: costUsd,
    session_id: `demo-session-${dayOffset}-${rand(1, 3)}`,
  };
}

function main(): void {
  console.log(chalk.bold('\nClaude Cost Tracker — Seed Demo Data\n'));

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
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

  try { db.exec(`ALTER TABLE usage ADD COLUMN developer_email TEXT`); }
  catch { /* already exists */ }

  const stmt = db.prepare(`
    INSERT INTO usage (
      timestamp, developer, developer_email, project, tool_name, file_path,
      input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
      cost_usd, session_id
    ) VALUES (
      @timestamp, @developer, @developer_email, @project, @tool_name, @file_path,
      @input_tokens, @output_tokens, @cache_read_tokens, @cache_creation_tokens,
      @cost_usd, @session_id
    )
  `);

  const totalRecords = rand(60, 80);
  const insertMany = db.transaction((records: ReturnType<typeof generateRecord>[]) => {
    for (const r of records) stmt.run(r);
  });

  const records: ReturnType<typeof generateRecord>[] = [];
  for (let i = 0; i < totalRecords; i++) {
    // Weight towards recent days: more records in recent days
    const dayOffset = Math.floor(Math.pow(Math.random(), 1.5) * 14);
    records.push(generateRecord(dayOffset));
  }

  insertMany(records);
  db.close();

  console.log(chalk.green(`  Inserted ${totalRecords} demo records across 14 days`));
  console.log(chalk.gray(`  Projects: ${PROJECTS.join(', ')}`));
  console.log(chalk.gray(`  Developers: ${DEVELOPERS.map(d => d.name).join(', ')}`));
  console.log(chalk.gray(`  DB: ${DB_PATH}\n`));
}

main();
