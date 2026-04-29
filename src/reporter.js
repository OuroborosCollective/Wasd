import { table } from 'table';
import chalk from 'chalk';

/**
 * Druckt eine formatierte Zusammenfassung der Refactoring-Ergebnisse aus.
 * 
 * @param {Array<{file: string, status: string, removedVersion: string|null}>} results - Array von Refactoring-Ergebnissen.
 * @param {string} globalPnpmVersion - Die global verwendete pnpm-Version.
 */
export function printSummary(results, globalPnpmVersion) {
  const data = [
    [
      chalk.bold('Datei'),
      chalk.bold('Status'),
      chalk.bold('Entfernte Version'),
      chalk.bold('Globaler Standard')
    ]
  ];

  results.forEach(result => {
    const statusText = result.status === 'success' 
      ? chalk.green('Erfolg') 
      : chalk.red('Fehler');

    data.push([
      result.file,
      statusText,
      result.removedVersion || chalk.gray('n/a'),
      chalk.blue(globalPnpmVersion)
    ]);
  });

  const config = {
    header: {
      alignment: 'center',
      content: chalk.bold.cyan('pnpm-Version Refactoring Report'),
    },
    columns: {
      0: { width: 40 },
      1: { width: 10, alignment: 'center' },
      2: { width: 20, alignment: 'center' },
      3: { width: 20, alignment: 'center' }
    }
  };

  console.log('\n');
  console.log(table(data, config));
}