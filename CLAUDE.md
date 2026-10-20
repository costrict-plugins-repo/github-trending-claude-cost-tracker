# Claude Cost Tracker Plugin — Project Handoff

## What This Project Is

A Claude Code **plugin** that tracks token usage and cost in real-time, per developer, per project, per session — with budgets, alerts, and an optional local dashboard. Think of it as "Google Analytics for your Claude Code spend."

This is packaged as a **Claude Code plugin** following the official plugin format (`.claude-plugin/plugin.json`, `hooks/hooks.json`, `skills/`, `commands/`), and also supports standalone mode for older Claude Code versions.

---

## Plugin Architecture

```
User installs plugin (via /plugin install or --plugin-dir)
        ↓
Claude Code reads hooks/hooks.json on session start
        ↓
PostToolUse hook fires after every tool call
        ↓
hooks/cost-tracker.js captures tokens, calculates cost
        ↓
Writes to ~/.claude-cost-tracker/usage.db (SQLite)
        ↓
User queries via slash command, skill, or dashboard
```

### Two Modes of Operation

1. **Plugin mode** (recommended): Install via `/plugin install`. Claude Code reads `hooks/hooks.json` and registers the PostToolUse hook automatically. The `skills/` and `commands/` directories provide agent skill and slash command integration.

2. **Standalone mode** (legacy): Run `npm run setup` to manually patch `~/.claude/settings.json` with the hook entry. Works with older Claude Code versions without plugin support.

---

## Project Structure

```
claude-cost-tracker-plugin/
├── .claude-plugin/
│   └── plugin.json              ← Plugin manifest (name, version, author)
├── hooks/
│   ├── hooks.json               ← PostToolUse hook definition (read by Claude Code)
│   └── cost-tracker.js          ← Hook script (plain JS, no build step)
├── skills/
│   └── cost-status/
│       └── SKILL.md             ← Agent skill: check costs on demand
├── commands/
│   └── cost-report.md           ← Slash command: /claude-cost-tracker:cost-report
├── db/
│   └── database.ts              ← SQLite schema, queries, alerts, developer tracking
├── server/
│   └── index.ts                 ← Team server (HTTP ingest endpoint, port 4567)
├── scripts/
│   ├── setup.ts                 ← Standalone setup (not needed in plugin mode)
│   ├── reset-db.ts              ← Wipes and recreates the database
│   ├── configure-remote.ts      ← Configure remote team server URL
│   ├── seed-demo.ts             ← Populates 60-80 realistic demo records
│   ├── set-model.ts             ← Switch pricing model (sonnet-4.5/opus/haiku)
│   └── status.ts                ← CLI dashboard (terminal status view)
├── dashboard/                   ← Next.js 14 app (App Router) — optional
│   └── src/
│       ├── app/
│       │   ├── page.tsx         ← Redirects to /dashboard
│       │   ├── layout.tsx       ← Root layout with Navbar
│       │   ├── dashboard/       ← Usage dashboard with charts
│       │   └── api/             ← stats, alerts, budgets, sessions, audit, export, health
│       ├── lib/db.ts            ← SQLite queries (singleton connection)
│       └── components/          ← Dashboard UI components
├── package.json
├── tsconfig.json
├── LICENSE
├── README.md
└── CLAUDE.md                    ← This file
```

---

## Plugin Components

### .claude-plugin/plugin.json
The manifest that identifies this as a Claude Code plugin. Contains name, description, version, author, and repository URL. Claude Code reads this to register the plugin.

### hooks/hooks.json
Defines the PostToolUse hook that fires after every tool call. Uses `${CLAUDE_PLUGIN_ROOT}` to reference the hook script portably. This replaces the manual `scripts/setup.ts` approach for plugin-mode users.

### hooks/cost-tracker.js
The core hook script. Plain CommonJS — no build step required. Reads JSON from stdin (Claude Code's hook payload), calculates cost, writes to SQLite, passes through to stdout. Also checks alert/budget thresholds and fires macOS notifications.

Dependency resolution: tries global `better-sqlite3` first, then falls back to `${CLAUDE_PLUGIN_ROOT}/node_modules/better-sqlite3`.

### skills/cost-status/SKILL.md
Agent skill that Claude invokes automatically when users ask about costs, spending, or budgets. Queries the SQLite database directly using `sqlite3` CLI.

### commands/cost-report.md
Slash command (`/claude-cost-tracker:cost-report`) that generates a formatted cost report with breakdowns by project, tool, and date. Supports CSV export via argument.

---

## Key Implementation Details

### Hook (hooks/cost-tracker.js)
- Plain CommonJS — Claude Code runs hooks directly with `node`
- Reads JSON from stdin, calculates cost, writes to SQLite, passes through to stdout
- Captures: developer username, developer email (git), project name (git), tool name, file path, all token types, session ID, model
- Multi-model pricing: configurable via `npm run set-model` (sonnet-4.5, opus, haiku)
- After each DB insert, checks alert thresholds AND budget caps
- Forwards to remote team server if configured in `~/.claude-cost-tracker/config.json`

### Token Pricing
| Model | Input (/1M) | Output (/1M) | Cache Read (/1M) | Cache Create (/1M) |
|-------|-------------|---------------|-------------------|---------------------|
| Sonnet 4.5 (default) | $3.00 | $15.00 | $0.30 | $3.75 |
| Opus | $15.00 | $75.00 | $1.50 | $18.75 |
| Haiku | $0.80 | $4.00 | $0.08 | $1.00 |

### Database
- Path: `~/.claude-cost-tracker/usage.db`
- Tables: `usage`, `alerts`, `budgets` (created by hook); `audit_log` (created by dashboard/server)
- Dashboard and server both use singleton DB connection pattern
- Schema includes `developer_email` and `model` columns with automatic migration

---

## Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Distribution | Claude Code plugin format | Native install via `/plugin install`, automatic hook registration |
| Hook type | PostToolUse async | Non-blocking, captures after tool runs |
| Language for hook | Plain JS (CommonJS) | Claude Code runs hooks with node directly, no build step |
| Language for everything else | TypeScript | Type safety for DB layer and dashboard |
| Database | SQLite via better-sqlite3 | Simple, local, no infra |
| Dashboard | Next.js 14 App Router | Fast to build, API routes built in |
| Charts | Recharts | Works well with React, simple API |
| Styling | Tailwind CSS | Fast, consistent |

---

## Commands

```bash
# Plugin mode (recommended)
claude /plugin install https://github.com/MayurBhavsar/claude-cost-tracker-plugin
# Or for local development:
claude --plugin-dir /path/to/claude-cost-tracker-plugin

# Standalone mode (legacy, without plugin support)
npm run setup

# CLI tools
npm run status                              # CLI cost summary
npm run set-model sonnet-4.5                # Switch pricing model
npm run seed-demo                           # Populate demo data
npm run reset-db                            # Wipe database

# Dashboard (optional)
npm run dashboard                           # http://localhost:3000/dashboard

# Team server (optional)
npm run server                              # Start on port 4567
npm run configure-remote http://<ip>:4567   # Point hook at team server

# Test the hook manually
echo '{"tool_name":"Edit","tool_input":{"file_path":"/src/app.ts"},"tool_output":{"usage":{"input_tokens":2000,"output_tokens":500,"cache_read_input_tokens":1000,"cache_creation_input_tokens":0}}}' | node hooks/cost-tracker.js > /dev/null
```

---

## Tone / Code Style

- TypeScript strict mode, no `any`
- Functional style preferred, small focused functions
- Error handling: always try/catch in the hook (never crash), throw in DB layer
- Comments only where the WHY is not obvious
- File size: keep files under 200 lines
- No console.log in production code — use stderr in hooks

---

## Environment & Assumptions

- Node.js 18+
- Claude Code CLI installed and working
- Git is available (for detecting project name and developer email)
- OS: macOS or Linux

---

## Troubleshooting

- Hook not firing: run `/reload-plugins` in Claude Code, or check `/plugin list`
- In standalone mode: check `~/.claude/settings.json` has the PostToolUse entry
- SQLite errors: check `~/.claude-cost-tracker/` directory exists and is writable
- `better-sqlite3` not found: run `npm install` in the plugin directory
- Dashboard not showing data: check the API route, try `curl http://localhost:3000/api/health`
