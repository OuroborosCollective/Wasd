#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strictMode = /^(1|true|yes|strict|fail)$/i.test(
  process.env.ARE_DETERMINISM_GATE_MODE || process.env.ARE_DETERMINISM_GATE_STRICT || ''
);
const advisoryOnly = !strictMode;
const scanRoots = ['server/src/core', 'server/src/modules', 'server/src/services', 'packages/shared/src'];
const strictRoots = [
  'server/src/core/systems',
  'server/src/core/state',
  'server/src/core/determinism',
  'server/src/modules/combat',
  'server/src/modules/npc',
  'server/src/modules/world',
  'server/src/modules/dungeon',
  'server/src/modules/economy',
  'server/src/modules/loot',
  'server/src/modules/oracle',
  'server/src/modules/warfront',
  'packages/shared/src',
];
const advisoryHints = [
  '/admin/', '/api/', '/analytics/', '/asset', '/audit', '/chat', '/dashboard', '/debug',
  '/health', '/integrity/', '/liveheal/', '/logger/', '/mail', '/metrics', '/monitor',
  '/notification', '/observability', '/playtester', '/posthog', '/selfhealing/', '/telemetry/', '/content/', '/diplomacy/', '/economy/', '/events/', '/growth/', '/inventory/', '/items/', '/legend/', '/monster/', '/party/', '/payment/', '/politics/', '/quest/', '/relationships/', '/release/', '/siege/', '/social/', '/vote/', '/world-editor/',
];
const deny = [
  { pattern: /\bMath\.random\s*\(/, label: 'Math.random()' },
  { pattern: /\bDate\.now\s*\(/, label: 'Date.now()' },
  { pattern: /\bnew\s+Date\s*\(/, label: 'new Date()' },
  { pattern: /\bsetTimeout\s*\(/, label: 'setTimeout()' },
  { pattern: /\bsetInterval\s*\(/, label: 'setInterval()' },
  { pattern: /\bperformance\.now\s*\(/, label: 'performance.now()' },
  { pattern: /\bcrypto\.randomUUID\s*\(/, label: 'crypto.randomUUID()' },
  { pattern: /\brandomUUID\s*\(/, label: 'randomUUID()' },
];
const ignoredDirs = new Set(['node_modules', 'dist', 'build', '.turbo', '.cache', 'coverage', '__tests__', 'tests', 'test']);
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.mts', '.cts']);
const lineAllow = /ARE-DETERMINISM-ALLOW/i;
const fileExempt = /@ARE-GUARD-EXEMPT:\s*(.{8,})/i;
const hard = [];
const advisory = [];
let scanned = 0;

function norm(p) { return p.split('\\').join('/'); }
function rel(file) { return norm(path.relative(root, file)); }
function under(relFile, roots) { return roots.some((r) => relFile === r || relFile.startsWith(`${r}/`)); }
function advisoryPath(relFile) {
  const wrapped = `/${relFile.toLowerCase()}`;
  return advisoryHints.some((hint) => wrapped.includes(hint));
}
function exemptionReason(content) {
  const head = content.split(/\r?\n/).slice(0, 30).join('\n');
  const match = head.match(fileExempt);
  return match ? match[1].trim() : null;
}
function lineAllowed(lines, index) {
  return lineAllow.test(lines[index] || '') || lineAllow.test(lines[index - 1] || '');
}
async function walk(dir) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) await walk(full);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) await scanFile(full);
  }
}
async function scanFile(file) {
  scanned += 1;
  const fileRel = rel(file);
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const reason = exemptionReason(content);
  const strict = under(fileRel, strictRoots);
  const meta = advisoryPath(fileRel) || Boolean(reason);
  lines.forEach((line, index) => {
    if (lineAllowed(lines, index)) return;
    for (const rule of deny) {
      if (!rule.pattern.test(line)) continue;
      const finding = { file: fileRel, line: index + 1, label: rule.label, text: line.trim().slice(0, 180), reason };
      if (strict && !reason) hard.push(finding);
      else if (meta) advisory.push(finding);
      else hard.push(finding);
    }
  });
}

for (const scanRoot of scanRoots) await walk(path.join(root, scanRoot));

if (advisory.length) {
  console.log('ARE Guard advisory findings in observer/meta paths:');
  for (const f of advisory) {
    const reason = f.reason ? `reason=${JSON.stringify(f.reason)}` : 'reason=missing @ARE-GUARD-EXEMPT';
    console.log(`- ${f.file}:${f.line} ${f.label} ${reason} :: ${f.text}`);
  }
  console.log('Meta files should declare: // @ARE-GUARD-EXEMPT: reason not world-state input.');
}
if (hard.length) {
  console.error('ARE Determinism Gate found strict world-state nondeterministic calls:');
  for (const f of hard) console.error(`- ${f.file}:${f.line} ${f.label} :: ${f.text}`);
  console.error('Use SeededARERng/AREClock. Use ARE-DETERMINISM-ALLOW only for one audited non-world-hash line.');
  if (!advisoryOnly) process.exit(1);
  console.log(`ARE Determinism Gate advisory-only mode: ${hard.length} legacy strict finding(s) reported without blocking.`);
}
console.log(`ARE Determinism Gate passed. Scanned ${scanned} file(s); ${advisory.length} advisory finding(s); ${hard.length} strict finding(s).`);
