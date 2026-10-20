import chalk from 'chalk';
import { resetDatabase, DB_PATH } from '../db/database';

function main(): void {
  console.log(chalk.bold('\n🗑  Claude Cost Tracker — Reset Database\n'));

  try {
    resetDatabase();
    console.log(chalk.green('✅ Database reset successfully!'));
    console.log(chalk.gray(`   Path: ${DB_PATH}\n`));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`❌ Failed to reset database: ${message}\n`));
    process.exit(1);
  }
}

main();
