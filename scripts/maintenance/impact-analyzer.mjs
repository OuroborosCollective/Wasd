import fs from 'fs';
import path from 'path';

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m"
};

function getStatus(target, actual) {
  if (actual === 'Missing') return `${colors.red}MISSING${colors.reset}`;
  
  const cleanTarget = target.replace(/[\^~]/, '');
  if (actual === cleanTarget || target === '*') {
    return `${colors.green}MATCH${colors.reset}`;
  }
  
  return `${colors.yellow}MISMATCH${colors.reset}`;
}

function runAnalysis() {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const lockPath = path.resolve(process.cwd(), 'package-lock.json');

  if (!fs.existsSync(pkgPath) || !fs.existsSync(lockPath)) {
    console.error(`${colors.red}Error: package.json or package-lock.json not found.${colors.reset}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

  const dependencies = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };

  const results = Object.entries(dependencies).map(([name, target]) => {
    let actual = 'Missing';
    
    if (lock.packages && lock.packages[`node_modules/${name}`]) {
      actual = lock.packages[`node_modules/${name}`].version;
    } else if (lock.dependencies && lock.dependencies[name]) {
      actual = lock.dependencies[name].version;
    }

    return {
      package: name,
      target: target,
      actual: actual,
      status: getStatus(target, actual)
    };
  });

  const colWidths = {
    package: Math.max(...results.map(r => r.package.length), 20),
    target: Math.max(...results.map(r => r.target.length), 15),
    actual: Math.max(...results.map(r => r.actual.length), 15),
    status: 10
  };

  const hr = `+${"-".repeat(colWidths.package + 2)}+${"-".repeat(colWidths.target + 2)}+${"-".repeat(colWidths.actual + 2)}+${"-".repeat(colWidths.status + 2)}+`;

  console.log(`\n${colors.bold}${colors.cyan}Impact Analysis: Dependency Consistency Check${colors.reset}\n`);
  console.log(hr);
  console.log(
    `| ${colors.bold}${"Package".padEnd(colWidths.package)}${colors.reset} | ` +
    `${colors.bold}${"Target (pkg)".padEnd(colWidths.target)}${colors.reset} | ` +
    `${colors.bold}${"Actual (lock)".padEnd(colWidths.actual)}${colors.reset} | ` +
    `${colors.bold}${"Status".padEnd(colWidths.status)}${colors.reset} |`
  );
  console.log(hr);

  results.forEach(row => {
    const statusPadding = row.status.includes('\x1b') ? 9 : 0;
    console.log(
      `| ${row.package.padEnd(colWidths.package)} | ` +
      `${row.target.padEnd(colWidths.target)} | ` +
      `${row.actual.padEnd(colWidths.actual)} | ` +
      `${row.status.padEnd(colWidths.status + statusPadding)} |`
    );
  });

  console.log(hr);
  console.log(`\n${colors.dim}Analysis completed at: ${new Date().toISOString()}${colors.reset}\n`);
}

runAnalysis();