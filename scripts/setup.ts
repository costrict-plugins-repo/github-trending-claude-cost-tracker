// NOTE: In plugin mode (Claude Code plugin system), setup is automatic.
// The hooks/hooks.json file is read by Claude Code when the plugin is enabled.
// This script is only needed for standalone mode (older Claude Code versions
// without plugin support). It registers the hook directly in ~/.claude/settings.json.

import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const HOOK_SCRIPT = path.resolve(__dirname, '..', 'hooks', 'cost-tracker.js');

interface HookEntry {
  matcher: string;
  hooks: Array<{
    type: string;
    command: string;
    async: boolean;
    timeout: number;
  }>;
  description: string;
}

interface ClaudeSettings {
  PostToolUse?: HookEntry[];
  [key: string]: unknown;
}

function ensureClaudeDir(): void {
  const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH);
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
}

function loadSettings(): ClaudeSettings {
  if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) {
    return {};
  }
  const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
  return JSON.parse(raw) as ClaudeSettings;
}

function isAlreadyInstalled(settings: ClaudeSettings): boolean {
  const hooks = settings.PostToolUse || [];
  return hooks.some(entry =>
    entry.hooks?.some(h => h.command.includes('cost-tracker.js'))
  );
}

function main(): void {
  console.log(chalk.bold('\n🔧 Claude Cost Tracker — Setup\n'));

  ensureClaudeDir();
  const settings = loadSettings();

  if (isAlreadyInstalled(settings)) {
    console.log(chalk.yellow('⚠  Hook is already installed in ~/.claude/settings.json'));
    console.log(chalk.gray(`   Script: ${HOOK_SCRIPT}`));
    return;
  }

  const hookEntry: HookEntry = {
    matcher: '*',
    hooks: [
      {
        type: 'command',
        command: `node ${HOOK_SCRIPT}`,
        async: true,
        timeout: 5
      }
    ],
    description: 'Claude Cost Tracker — captures token usage'
  };

  if (!settings.PostToolUse) {
    settings.PostToolUse = [];
  }
  settings.PostToolUse.push(hookEntry);

  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');

  console.log(chalk.green('✅ Hook installed successfully!'));
  console.log(chalk.gray(`   Settings: ${CLAUDE_SETTINGS_PATH}`));
  console.log(chalk.gray(`   Script:   ${HOOK_SCRIPT}`));
  console.log(chalk.cyan('\n   Restart Claude Code for the hook to take effect.\n'));
}

main();
