import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function run(command) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, command, output: output.slice(-4000) };
  } catch (error) {
    return {
      ok: false,
      command,
      output: String(error?.stdout ?? '').slice(-4000),
      error: String(error?.stderr ?? error?.message ?? error).slice(-4000),
    };
  }
}

const checks = [
  { name: 'repo package', ok: existsSync('package.json') },
  { name: 'pnpm lockfile', ok: existsSync('pnpm-lock.yaml') },
  { name: 'ARE core directory', ok: existsSync('server/src/core/are') },
  { name: '2D client package', ok: existsSync('apps/client-2d/package.json') },
  { name: 'web package', ok: existsSync('apps/web/package.json') },
];

const commands = [
  run('node --version'),
  run('pnpm --version'),
  run('git rev-parse --short HEAD'),
];

const summary = {
  generatedAt: new Date().toISOString(),
  checks,
  commands,
  ok: checks.every((check) => check.ok) && commands.every((command) => command.ok),
};

mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/safe-test-summary.json', `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
