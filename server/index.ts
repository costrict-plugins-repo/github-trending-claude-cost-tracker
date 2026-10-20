import http from 'http';
import { getDb } from '../db/database';
import {
  getDailyCosts,
  getTotalStats,
  getCostByProject,
  getCostByTool,
  getCostByDeveloper,
  getRecentActivity,
  getAlerts,
  checkAlerts,
} from '../db/database';

const PORT = parseInt(process.env.PORT || '4567', 10);
const HOST = process.env.HOST || '0.0.0.0';

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

interface IngestPayload {
  timestamp: string;
  developer: string;
  developer_email?: string | null;
  project: string;
  tool_name: string;
  file_path?: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  cost_usd: number;
  session_id?: string | null;
  model?: string | null;
}

function handleIngest(body: string, res: http.ServerResponse): void {
  const record = JSON.parse(body) as IngestPayload;

  if (!record.timestamp || !record.developer || !record.tool_name) {
    json(res, { error: 'Missing required fields: timestamp, developer, tool_name' }, 400);
    return;
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO usage (
      timestamp, developer, developer_email, project, tool_name, file_path,
      input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens,
      cost_usd, session_id, model
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.timestamp,
    record.developer,
    record.developer_email ?? null,
    record.project || 'unknown',
    record.tool_name,
    record.file_path ?? null,
    record.input_tokens || 0,
    record.output_tokens || 0,
    record.cache_read_tokens || 0,
    record.cache_creation_tokens || 0,
    record.cost_usd || 0,
    record.session_id ?? null,
    record.model ?? null,
  );
  json(res, { success: true }, 201);
}

function handleStats(res: http.ServerResponse): void {
  const [daily, totals, byProject, byTool, byDeveloper, recent, alerts] = [
    getDailyCosts(14),
    getTotalStats(),
    getCostByProject(),
    getCostByTool(),
    getCostByDeveloper(),
    getRecentActivity(20),
    getAlerts(),
  ];

  const { triggered, todayCost } = checkAlerts();

  json(res, {
    daily,
    totals,
    byProject,
    byTool,
    byDeveloper,
    recent,
    alerts,
    triggeredAlerts: triggered,
    todayCost,
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    if (req.method === 'POST' && url.pathname === '/api/ingest') {
      const body = await readBody(req);
      handleIngest(body, res);
    } else if (req.method === 'GET' && url.pathname === '/api/stats') {
      handleStats(res);
    } else if (req.method === 'GET' && url.pathname === '/health') {
      json(res, { status: 'ok', uptime: process.uptime() });
    } else {
      json(res, { error: 'Not found' }, 404);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    json(res, { error: message }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\nClaude Cost Tracker — Team Server`);
  console.log(`Listening on http://${HOST}:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/ingest   — receive usage data from remote hooks`);
  console.log(`  GET  /api/stats    — fetch aggregated stats (same as dashboard API)`);
  console.log(`  GET  /health       — health check\n`);
});
