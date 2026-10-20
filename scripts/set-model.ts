import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const DB_DIR = path.join(os.homedir(), '.claude-cost-tracker');
const CONFIG_PATH = path.join(DB_DIR, 'config.json');

const VALID_MODELS = ['sonnet-4.5', 'opus', 'haiku'];

function main(): void {
  const model = process.argv[2];

  if (!model || model === '--help') {
    console.log(chalk.bold('\nClaude Cost Tracker — Set Model\n'));
    console.log(`Usage: npm run set-model <model>\n`);
    console.log('Available models:');
    console.log('  sonnet-4.5  — Claude Sonnet 4.5 (default)');
    console.log('  opus        — Claude Opus');
    console.log('  haiku       — Claude Haiku\n');
    return;
  }

  if (!VALID_MODELS.includes(model)) {
    console.error(chalk.red(`\nInvalid model: "${model}"`));
    console.error(`Valid models: ${VALID_MODELS.join(', ')}\n`);
    process.exit(1);
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  let config: Record<string, unknown> = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch { /* start fresh */ }

  config.model = model;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log(chalk.bold('\nClaude Cost Tracker — Model Updated\n'));
  console.log(chalk.green(`  Model set to: ${model}`));
  console.log(chalk.gray(`  Config: ${CONFIG_PATH}\n`));
}

main();
