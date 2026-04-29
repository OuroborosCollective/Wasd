import chalk from 'chalk';
import Table from 'cli-table3';

export interface ImpactEntry {
  packageName: string;
  oldVersion: string;
  newVersion: string;
  status: 'success' | 'failure' | 'skipped';
}

export interface SummaryStats {
  success: number;
  failure: number;
  skipped: number;
}

export class LockfileUI {
  public static renderImpactTable(entries: ImpactEntry[]): void {
    const table = new Table({
      head: [
        chalk.cyan('Package Name'),
        chalk.cyan('Old Version'),
        chalk.cyan('New Version'),
        chalk.cyan('Status')
      ],
      style: {
        head: [],
        border: []
      }
    });

    entries.forEach((entry) => {
      let statusFormatted: string;

      switch (entry.status) {
        case 'success':
          statusFormatted = chalk.green('✔ SUCCESS');
          break;
        case 'failure':
          statusFormatted = chalk.red('✘ FAILURE');
          break;
        case 'skipped':
          statusFormatted = chalk.yellow('⚠ SKIPPED');
          break;
        default:
          statusFormatted = entry.status;
      }

      table.push([
        chalk.white(entry.packageName),
        entry.oldVersion,
        entry.newVersion,
        statusFormatted
      ]);
    });

    console.log('\n' + chalk.bold('Detailed Impact Analysis:'));
    console.log(table.toString());
  }

  public static renderDashboard(stats: SummaryStats): void {
    const total = stats.success + stats.failure + stats.skipped;
    
    console.log('\n' + chalk.bold.bgWhite.black(' LOCKFILE FIXER DASHBOARD '));
    
    const dashboardTable = new Table({
      colWidths: [20, 10]
    });

    dashboardTable.push(
      [chalk.green('Success'), chalk.bold(stats.success.toString())],
      [chalk.red('Failure'), chalk.bold(stats.failure.toString())],
      [chalk.yellow('Skipped'), chalk.bold(stats.skipped.toString())],
      [chalk.blue('Total'), chalk.bold(total.toString())]
    );

    console.log(dashboardTable.toString());

    if (stats.failure > 0) {
      console.log(chalk.red.bold(`\nAttention: ${stats.failure} issues could not be resolved automatically.`));
    } else if (total > 0) {
      console.log(chalk.green.bold('\nStatus: Lockfile optimization completed successfully.'));
    } else {
      console.log(chalk.blue.bold('\nStatus: No changes required.'));
    }
    console.log('');
  }
}