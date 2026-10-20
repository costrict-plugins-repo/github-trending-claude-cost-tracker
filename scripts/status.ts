import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import chalk from 'chalk';

const DB_DIR = path.join(os.homedir(), '.claude-cost-tracker');
const DB_PATH = path.join(DB_DIR, 'usage.db');

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(5)}`;
}

function main(): void {
  console.log(chalk.bold('\n  Claude Cost Tracker — Status\n'));

  if (!fs.existsSync(DB_PATH)) {
    console.log(chalk.yellow('  No database found. Run npm run setup first.\n'));
    return;
  }

  const db = new Database(DB_PATH, { readonly: true });

  const totals = db.prepare(`
    SELECT
      COALESCE(ROUND(SUM(cost_usd), 6), 0) as total_cost,
      COUNT(*) as total_calls,
      COUNT(DISTINCT developer) as developers,
      COUNT(DISTINCT project) as projects
    FROM usage
  `).get() as { total_cost: number; total_calls: number; developers: number; projects: number };

  const today = db.prepare(`
    SELECT COALESCE(ROUND(SUM(cost_usd), 6), 0) as cost, COUNT(*) as calls
    FROM usage WHERE date(timestamp) = date('now')
  `).get() as { cost: number; calls: number };

  const topProject = db.prepare(`
    SELECT project, ROUND(SUM(cost_usd), 6) as cost
    FROM usage GROUP BY project ORDER BY cost DESC LIMIT 1
  `).get() as { project: string; cost: number } | undefined;

  const recent = db.prepare(`
    SELECT tool_name, file_path, cost_usd, timestamp
    FROM usage ORDER BY timestamp DESC LIMIT 5
  `).all() as Array<{ tool_name: string; file_path: string | null; cost_usd: number; timestamp: string }>;

  // Efficiency
  const eff = db.prepare(`
    SELECT COALESCE(SUM(input_tokens), 0) as inp, COALESCE(SUM(cache_read_tokens), 0) as cache
    FROM usage
  `).get() as { inp: number; cache: number };
  const denom = eff.inp + eff.cache;
  const effPct = denom > 0 ? ((eff.cache / denom) * 100).toFixed(0) : '—';

  db.close();

  const divider = chalk.gray('  ─────────────────────────────────────');

  console.log(`  ${chalk.cyan('Today')}       ${chalk.bold(formatCost(today.cost))}  (${today.calls} calls)`);
  console.log(`  ${chalk.cyan('All Time')}    ${chalk.bold(formatCost(totals.total_cost))}  (${totals.total_calls} calls)`);
  console.log(`  ${chalk.cyan('Developers')}  ${totals.developers}   ${chalk.cyan('Projects')}  ${totals.projects}`);
  console.log(`  ${chalk.cyan('Efficiency')}  ${effPct}% cache hit ratio`);
  if (topProject) {
    console.log(`  ${chalk.cyan('Top Project')} ${topProject.project}  (${formatCost(topProject.cost)})`);
  }

  console.log(divider);
  console.log(chalk.gray('  Recent Activity'));

  if (recent.length === 0) {
    console.log(chalk.gray('  No activity yet'));
  } else {
    for (const r of recent) {
      const filePart = r.file_path ? chalk.gray(` ${r.file_path.split('/').slice(-2).join('/')}`) : '';
      const timePart = new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      console.log(`  ${chalk.white(r.tool_name.padEnd(8))} ${formatCost(r.cost_usd).padStart(10)}${filePart}  ${chalk.gray(timePart)}`);
    }
  }

  console.log('');
}

main();
