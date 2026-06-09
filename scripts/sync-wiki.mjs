import { cpSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const sha = process.env.GITHUB_SHA ?? 'unknown';
const requestedSourceDir = process.env.WIKI_SOURCE_DIR ?? 'docs/wiki';
const requestedWikiBranch = process.env.WIKI_BRANCH;

if (!repo) {
  throw new Error('GITHUB_REPOSITORY is missing.');
}

if (!token) {
  throw new Error('GITHUB_TOKEN is missing.');
}

const sourceDir = path.resolve(requestedSourceDir);
const wikiDir = path.resolve('.wiki-sync');

if (!existsSync(sourceDir)) {
  throw new Error(`Wiki source directory not found: ${sourceDir}`);
}

function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

function output(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

rmSync(wikiDir, { recursive: true, force: true });

const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.wiki.git`;

run('git', ['clone', remoteUrl, wikiDir]);

const activeWikiBranch = requestedWikiBranch || output('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: wikiDir }) || 'master';

run('bash', ['-lc', `find "${wikiDir}" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +`]);

cpSync(sourceDir, wikiDir, {
  recursive: true,
  force: true,
});

run('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: wikiDir });
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], { cwd: wikiDir });
run('git', ['add', '--all'], { cwd: wikiDir });

const status = output('git', ['status', '--porcelain'], { cwd: wikiDir });

if (!status) {
  console.log('Wiki already up to date. Nothing to commit.');
  process.exit(0);
}

run('git', ['commit', '-m', `docs: sync wiki from ${sha.slice(0, 7)}`], { cwd: wikiDir });
run('git', ['push', 'origin', `HEAD:${activeWikiBranch}`], { cwd: wikiDir });

console.log(`Wiki sync complete from ${requestedSourceDir} to ${repo}.wiki:${activeWikiBranch}.`);
