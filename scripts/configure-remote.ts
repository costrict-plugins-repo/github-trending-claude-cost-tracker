import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const DB_DIR = path.join(os.homedir(), '.claude-cost-tracker');
const CONFIG_PATH = path.join(DB_DIR, 'config.json');

function loadConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Record<string, unknown>;
    }
  } catch { /* ignore */ }
  return {};
}

function main(): void {
  const remoteUrl = process.argv[2];

  if (!remoteUrl) {
    const config = loadConfig();
    if (config.remote_url) {
      console.log(chalk.cyan(`\nCurrent remote: ${config.remote_url as string}`));
      console.log(chalk.gray('\nTo change:  npm run configure-remote <url>'));
      console.log(chalk.gray('To remove:  npm run configure-remote --clear\n'));
    } else {
      console.log(chalk.yellow('\nNo remote server configured.'));
      console.log(chalk.gray('\nUsage: npm run configure-remote http://<team-server-ip>:4567'));
      console.log(chalk.gray('This will send usage data to a shared team server in addition to local storage.\n'));
    }
    return;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const config = loadConfig();

  if (remoteUrl === '--clear') {
    delete config.remote_url;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(chalk.green('\nRemote server cleared. Usage data will only be stored locally.\n'));
    return;
  }

  try {
    new URL(remoteUrl);
  } catch {
    console.error(chalk.red(`\nInvalid URL: ${remoteUrl}\n`));
    process.exit(1);
  }

  config.remote_url = remoteUrl;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log(chalk.green(`\nRemote server configured: ${remoteUrl}`));
  console.log(chalk.gray('Usage data will now be sent to the team server in addition to local storage.'));
  console.log(chalk.gray('Run `npm run configure-remote --clear` to disable.\n'));
}

main();
