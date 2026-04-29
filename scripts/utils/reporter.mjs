import chalk from 'chalk';

export const reporter = {
  success(message) {
    console.log(`${chalk.green('✔')} ${message}`);
  },

  error(message) {
    console.error(`${chalk.red('✘')} ${chalk.red.bold('Error:')} ${message}`);
  },

  warn(message) {
    console.warn(`${chalk.yellow('⚠')} ${message}`);
  },

  info(message) {
    console.log(`${chalk.blue('ℹ')} ${message}`);
  },

  printDiffTable(mismatches) {
    if (!mismatches || mismatches.length === 0) {
      return;
    }

    const headers = {
      name: 'Package',
      expected: 'Required (package.json)',
      actual: 'Found (pnpm-lock.yaml)'
    };

    const colWidths = {
      name: Math.max(...mismatches.map(m => m.name.length), headers.name.length),
      expected: Math.max(...mismatches.map(m => m.expected.length), headers.expected.length),
      actual: Math.max(...mismatches.map(m => m.actual.length), headers.actual.length)
    };

    const pad = (str, len) => str.padEnd(len);
    const line = `+${'-'.repeat(colWidths.name + 2)}+${'-'.repeat(colWidths.expected + 2)}+${'-'.repeat(colWidths.actual + 2)}+`;

    console.log(line);
    console.log(
      `| ${chalk.bold(pad(headers.name, colWidths.name))} | ` +
      `${chalk.bold(pad(headers.expected, colWidths.expected))} | ` +
      `${chalk.bold(pad(headers.actual, colWidths.actual))} |`
    );
    console.log(line);

    mismatches.forEach(m => {
      console.log(
        `| ${pad(m.name, colWidths.name)} | ` +
        `${chalk.yellow(pad(m.expected, colWidths.expected))} | ` +
        `${chalk.red(pad(m.actual, colWidths.actual))} |`
      );
    });

    console.log(line + '\n');
  }
};

export default reporter;