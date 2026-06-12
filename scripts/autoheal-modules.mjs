#!/usr/bin/env node
/**
 * ARE AutoHeal Module
 *
 * Phase 3: Build heal plan from scanner results
 * Phase 4: Apply only allowed actions with verification
 *
 * Usage:
 *   node scripts/autoheal-modules.mjs --plan
 *   node scripts/autoheal-modules.mjs --apply
 *   node scripts/autoheal-modules.mjs --apply --max-risk=LOW_SEMANTIC
 *   node scripts/autoheal-modules.mjs --plan --apply --max-risk=SAFE_MECHANICAL
 */


import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { argv, cwd, exit, stdout } from 'node:process';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';


// ─────────────────────────────────────────────────────────────────────────────
// Risk Levels
// ─────────────────────────────────────────────────────────────────────────────

export const AutoHealRisk = {
  SAFE_MECHANICAL: 'SAFE_MECHANICAL',
  LOW_SEMANTIC: 'LOW_SEMANTIC',
  MEDIUM_SEMANTIC: 'MEDIUM_SEMANTIC',
  HIGH_SEMANTIC: 'HIGH_SEMANTIC',
  FORBIDDEN: 'FORBIDDEN',
};

// Risk ordering for max-risk filtering
const RISK_ORDER = [
  AutoHealRisk.SAFE_MECHANICAL,
  AutoHealRisk.LOW_SEMANTIC,
  AutoHealRisk.MEDIUM_SEMANTIC,
  AutoHealRisk.HIGH_SEMANTIC,
  AutoHealRisk.FORBIDDEN,
];

function riskOrder(risk) {
  return RISK_ORDER.indexOf(risk);
}

function canApply(risk, maxRisk) {
  return riskOrder(risk) <= riskOrder(maxRisk);
}


// ─────────────────────────────────────────────────────────────────────────────
// Action Types
// ─────────────────────────────────────────────────────────────────────────────

export const ActionKind = {
  FIX_TYPE_TYPO: 'FIX_TYPE_TYPO',
  FIX_ESM_IMPORT_EXTENSION: 'FIX_ESM_IMPORT_EXTENSION',
  FIX_TYPE_ONLY_IMPORT: 'FIX_TYPE_ONLY_IMPORT',
  REPLACE_MATH_RANDOM_WITH_CONTEXT_RNG: 'REPLACE_MATH_RANDOM_WITH_CONTEXT_RNG',
  MARK_DATE_NOW_TELEMETRY: 'MARK_DATE_NOW_TELEMETRY',
  INSERT_CATEGORY_HEADER: 'INSERT_CATEGORY_HEADER',
  UPDATE_MANIFEST: 'UPDATE_MANIFEST',
  QUARANTINE_STUB: 'QUARANTINE_STUB',
  MANUAL_REQUIRED: 'MANUAL_REQUIRED',
};


// ─────────────────────────────────────────────────────────────────────────────
// Type/Dictionary Fixes (from autofix-modules.mjs)
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_TYPO_FIXES = new Map([
  ['TickSytem', 'TickSystem'],
  ['TickSysten', 'TickSystem'],
  ['Ticksystem', 'TickSystem'],
  ['TickContex', 'TickSystemContext'],
  ['TickContext', 'TickSystemContext'],
  ['TickSytemContext', 'TickSystemContext'],
  ['Kapa', 'Kappa'],
  ['KappaPositon', 'KappaPosition'],
  ['KappaPostion', 'KappaPosition'],
  ['Kappa100', 'Kappa1000'],
  ['TickID', 'TickId'],
  ['TicId', 'TickId'],
  ['TiclId', 'TickId'],
  ['StateHahs', 'StateHash'],
  ['Statehash', 'StateHash'],
  ['PreviousStatehash', 'PreviousStateHash'],
  ['Chunkkey', 'ChunkKey'],
  ['ChunKey', 'ChunkKey'],
  ['DeterministicPRNG', 'DeterministicPrng'],
  ['DeterministicPng', 'DeterministicPrng'],
  ['SeededARErng', 'SeededARERng'],
  ['Worldtick', 'WorldTick'],
  ['WorldTic', 'WorldTick'],
]);

const CATEGORY_TYPO_FIXES = new Map([
  ['ARE_ALINGED', 'ARE_ALIGNED'],
  ['ARE_ALIGND', 'ARE_ALIGNED'],
  ['DETERMINISTIC_READY', 'DETERMINISTIC_READY'],
  ['DETERMINSTIC_READY', 'DETERMINISTIC_READY'],
  ['NON_DETERMINSTIC', 'NON_DETERMINISTIC'],
  ['NON_DETERMINISTIC', 'NON_DETERMINISTIC'],
  ['STUB_FAKE', 'STUB_FAKE'],
  ['STUB_FAKEE', 'STUB_FAKE'],
]);


// ─────────────────────────────────────────────────────────────────────────────
// Patterns
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS = {
  TICK_SYSTEM: /\b(?:implements\s+TickSystem|extends\s+TickSystem|registerTickSystem)\b/,
  TICK_CONTEXT: /\bTickSystemContext\b|\bcontext\.tick\b|\bctx\.tick\b/,
  TICK_PRIORITY: /\bTickSystemPriority\./,
  KAPPA: /\b(?:Kappa|Kappa1000|TickId|StateHash|ChunkKey|KappaPosition)\b/,
  DETERMINISTIC_PRNG: /\b(?:DeterministicPrng|createDeterministicPrng|SeededARERng|deterministicRandom)\b/,
  DELTA: /\b(?:Delta|StateDelta|generateDelta|applyDelta|WorldDelta)\b/,
  ARE_IMPORT: /from\s+['"][^'"]*(?:core\/are|\/are\/|AREGuard|TickSystem)[^'"]*['"]/,

  MATH_RANDOM: /\bMath\.random\s*\(/,
  DATE_NOW: /\bDate\.now\s*\(/,
  NEW_DATE_EMPTY: /\bnew\s+Date\s*\(\s*\)/,
  PERFORMANCE_NOW: /\bperformance\.now\s*\(/,
  RANDOM_UUID: /\bcrypto\.randomUUID\s*\(/,
  RANDOM_BYTES: /\brandomBytes\s*\(/,

  STUB_THROW: /throw\s+new\s+Error\s*\(\s*['"`](?:Not implemented|TODO|stub|placeholder)/i,
  STUB_PLACEHOLDER: /(?:placeholder|stub|fake|mock)/i,
  STUB_RETURN_NULL: /\breturn\s+null\s*;?/,
  STUB_RETURN_UNDEFINED: /\breturn\s+undefined\s*;?/,
  STUB_EMPTY_ARRAY: /\breturn\s*\[\s*\]\s*;?/,
  STUB_EMPTY_OBJECT: /\breturn\s*\{\s*\}\s*;?/,

  GAME_LOGIC: /\b(?:player|npc|quest|loot|combat|inventory|guild|economy|skill|craft|world|chunk|biome|item|equipment|dialogue|movement|pathfinding|trade|market|damage|spawn)\b/i,

  HAS_CONTEXT_RNG: /\bctx\.rng|\bcontext\.rng|\brng\.nextFloat/,
  HAS_TICK_CONTEXT: /\bctx\.tick\b|\bctx\.kappa\b|\bTickSystemContext\b/,
  HAS_SEED: /\bseed\b|\bWorldSeed\b|\bcreateARESeed\b/,
  HAS_TELEMETRY_SIDECHANNEL: /@are-telemetry-side-channel/,
};


// ─────────────────────────────────────────────────────────────────────────────
// Policy Loading
// ─────────────────────────────────────────────────────────────────────────────

function loadPolicy(policyPath) {
  if (!existsSync(policyPath)) {
    console.error(`Policy file not found: ${policyPath}`);
    exit(1);
  }
  return JSON.parse(readFileSync(policyPath, 'utf8'));
}


// ─────────────────────────────────────────────────────────────────────────────
// Argument Parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(rawArgs) {
  const has = (flag) => rawArgs.includes(flag);
  const get = (name, fallback = undefined) => {
    const hit = rawArgs.find((arg) => arg.startsWith(`${name}=`));
    return hit ? hit.slice(name.length + 1) : fallback;
  };

  return {
    root: resolve(get('--root', cwd())),
    plan: has('--plan'),
    apply: has('--apply'),
    maxRisk: get('--max-risk', 'SAFE_MECHANICAL'),
    dryRun: !has('--apply') && has('--dry-run'),
    verbose: has('--verbose'),
    help: has('--help') || has('-h'),
  };
}

const options = parseArgs(argv.slice(2));

if (options.help) {
  console.log(`
ARE AutoHeal Module

Phase 3: Build heal plan from scanner results
Phase 4: Apply only allowed actions with verification

Usage:
  node scripts/autoheal-modules.mjs --plan
  node scripts/autoheal-modules.mjs --apply
  node scripts/autoheal-modules.mjs --apply --max-risk=LOW_SEMANTIC
  node scripts/autoheal-modules.mjs --plan --apply --max-risk=SAFE_MECHANICAL

Options:
  --plan                  Build heal plan (show what would be done)
  --apply                 Apply fixes (requires --write confirmation)
  --max-risk=<level>      Maximum risk level to apply:
                          SAFE_MECHANICAL | LOW_SEMANTIC | MEDIUM_SEMANTIC
  --dry-run               Equivalent to --plan (default if no --apply)
  --verbose               Show detailed analysis
  --root=<path>           Project root

Risk Levels:
  SAFE_MECHANICAL         Type typos, category typos, import extensions
  LOW_SEMANTIC            Math.random replacement when context RNG exists
  MEDIUM_SEMANTIC         Stub quarantine, telemetry marking
  HIGH_SEMANTIC           Requires PR, not auto-apply
  FORBIDDEN               Never auto-apply (stub filling, gameplay logic)
`);
  exit(0);
}


// ─────────────────────────────────────────────────────────────────────────────
// Source Analysis Helpers
// ─────────────────────────────────────────────────────────────────────────────

function stripStringsAndComments(source) {
  let output = '';
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      output += '  ';
      i += 2;
      while (i < source.length && source[i] !== '\n') {
        output += ' ';
        i += 1;
      }
      continue;
    }

    if (ch === '/' && next === '*') {
      output += '  ';
      i += 2;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') {
          output += '  ';
          i += 2;
          break;
        }
        output += ' ';
        i += 1;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      output += quote;
      i += 1;

      while (i < source.length) {
        if (source[i] === '\\') {
          output += source[i];
          if (i + 1 < source.length) output += source[i + 1];
          i += 2;
          continue;
        }
        output += source[i];
        i += 1;
        if (source[i - 1] === quote) break;
      }
      continue;
    }

    output += ch;
    i += 1;
  }

  return output;
}

function findIdentifiers(source) {
  const code = stripStringsAndComments(source);
  const matches = new Set();
  const re = /\b([A-Z][A-Za-z0-9_]*)\b/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    matches.add(m[1]);
  }
  return matches;
}

function findImperfectImports(source) {
  const code = stripStringsAndComments(source);
  const fixes = [];

  // Pattern: import { X } from 'path/TickSystem'; (missing .js)
  const importWithExtRe = /import\s+(?:type\s+)?\{[^}]+\}\s+from\s+['"]([^'"]*)['"]/g;
  let m;
  while ((m = importWithExtRe.exec(code)) !== null) {
    const path = m[1];
    if (
      !path.endsWith('.js') &&
      !path.startsWith('.') &&
      !path.includes('://') &&
      path.includes('are') &&
      (path.endsWith('TickSystem') || path.endsWith('TickSystemContext') || path.endsWith('StateHash'))
    ) {
      fixes.push({
        importPath: path,
        suggested: `${path}.js`,
      });
    }
  }

  return fixes;
}

function findMissingTypeOnly(source) {
  const code = stripStringsAndComments(source);
  const fixes = [];

  // Pattern: import { SomeInterface } from '...';
  // where SomeInterface looks like a type (PascalCase, often ends with /Type/, /Interface/, etc.)
  const importRe = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]*)['"]/g;
  let m;
  while ((m = importRe.exec(code)) !== null) {
    const spec = m[1];
    const path = m[2];

    // Check if any imported specifier looks like a type
    const parts = spec.split(',').map((p) => p.trim());
    const typeParts = parts.filter((p) => {
      // Likely a type: ends with Type, Interface, abstract names
      return /^[A-Z].*(?:Type|Interface|Props|Options|Config|Args|Result)$/.test(p);
    });

    if (typeParts.length > 0 && !path.includes('.js')) {
      fixes.push({
        current: m[0],
        suggested: `import type { ${typeParts.join(', ')} } from '${path}.js'`,
      });
    }
  }

  return fixes;
}

function hasContextRng(source) {
  const code = stripStringsAndComments(source);
  return PATTERNS.HAS_CONTEXT_RNG.test(code);
}

function hasTickContext(source) {
  const code = stripStringsAndComments(source);
  return PATTERNS.HAS_TICK_CONTEXT.test(code) || PATTERNS.TICK_SYSTEM.test(code);
}

function hasTelemetrySideChannel(source) {
  return PATTERNS.HAS_TELEMETRY_SIDECHANNEL.test(source);
}

function hasCategoryHeader(source) {
  return /@are-module-category\s+[A-E]\b/.test(source);
}


// ─────────────────────────────────────────────────────────────────────────────
// Plan Building
// ─────────────────────────────────────────────────────────────────────────────

function buildPlan(files, policy) {
  const plan = {
    runId: `autoheal-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    createdAt: new Date().toISOString(),
    safeActions: [],
    lowActions: [],
    mediumActions: [],
    forbiddenActions: [],
    summary: {
      SAFE_MECHANICAL: 0,
      LOW_SEMANTIC: 0,
      MEDIUM_SEMANTIC: 0,
      HIGH_SEMANTIC: 0,
      FORBIDDEN: 0,
    },
  };

  for (const file of files) {
    const { path, source, category } = file;

    // ── SAFE_MECHANICAL: Type typos ──────────────────────────────────────────
    const identifiers = findIdentifiers(source);
    for (const [typo, correct] of TYPE_TYPO_FIXES.entries()) {
      if (identifiers.has(typo)) {
        plan.safeActions.push({
          kind: ActionKind.FIX_TYPE_TYPO,
          file: path,
          from: typo,
          to: correct,
          risk: AutoHealRisk.SAFE_MECHANICAL,
        });
        plan.summary.SAFE_MECHANICAL++;
      }
    }

    // ── SAFE_MECHANICAL: Category typos in strings/comments ─────────────────
    for (const [wrong, right] of CATEGORY_TYPO_FIXES.entries()) {
      if (source.includes(wrong)) {
        plan.safeActions.push({
          kind: ActionKind.FIX_TYPE_TYPO,
          file: path,
          from: wrong,
          to: right,
          risk: AutoHealRisk.SAFE_MECHANICAL,
          note: 'category typo',
        });
        plan.summary.SAFE_MECHANICAL++;
      }
    }

    // ── SAFE_MECHANICAL: ESM import extensions ───────────────────────────────
    if (policy.safeFixes?.esmImportExtensions) {
      const imperfectImports = findImperfectImports(source);
      for (const fix of imperfectImports) {
        plan.safeActions.push({
          kind: ActionKind.FIX_ESM_IMPORT_EXTENSION,
          file: path,
          importPath: fix.importPath,
          suggested: fix.suggested,
          risk: AutoHealRisk.SAFE_MECHANICAL,
        });
        plan.summary.SAFE_MECHANICAL++;
      }
    }

    // ── SAFE_MECHANICAL: Type-only imports ──────────────────────────────────
    if (policy.safeFixes?.typeOnlyImports) {
      const missingTypeOnly = findMissingTypeOnly(source);
      for (const fix of missingTypeOnly) {
        plan.safeActions.push({
          kind: ActionKind.FIX_TYPE_ONLY_IMPORT,
          file: path,
          current: fix.current,
          suggested: fix.suggested,
          risk: AutoHealRisk.SAFE_MECHANICAL,
        });
        plan.summary.SAFE_MECHANICAL++;
      }
    }

    // ── SAFE_MECHANICAL: Category header insertion ─────────────────────────
    if (policy.autonomy?.writeHeaders && !hasCategoryHeader(source)) {
      plan.safeActions.push({
        kind: ActionKind.INSERT_CATEGORY_HEADER,
        file: path,
        category,
        risk: AutoHealRisk.SAFE_MECHANICAL,
      });
      plan.summary.SAFE_MECHANICAL++;
    }

    // ── LOW_SEMANTIC: Math.random replacement ────────────────────────────────
    if (policy.determinismFixes?.replaceMathRandomOnlyWithExistingContextRng) {
      const code = stripStringsAndComments(source);
      if (PATTERNS.MATH_RANDOM.test(code)) {
        if (hasContextRng(source) && hasTickContext(source)) {
          plan.lowActions.push({
            kind: ActionKind.REPLACE_MATH_RANDOM_WITH_CONTEXT_RNG,
            file: path,
            reason: 'Math.random found but ctx.rng exists in scope',
            requiresReplay: true,
            risk: AutoHealRisk.LOW_SEMANTIC,
          });
          plan.summary.LOW_SEMANTIC++;
        } else {
          plan.forbiddenActions.push({
            kind: ActionKind.MANUAL_REQUIRED,
            file: path,
            reason: 'Math.random found but no ctx.rng in scope. Needs manual ARE seed binding.',
            risk: AutoHealRisk.FORBIDDEN,
          });
          plan.summary.FORBIDDEN++;
        }
      }
    }

    // ── LOW_SEMANTIC: Date.now in non-telemetry ──────────────────────────────
    if (policy.determinismFixes?.replaceDateNowOnlyInTelemetrySideChannel) {
      const code = stripStringsAndComments(source);
      if (PATTERNS.DATE_NOW.test(code) || PATTERNS.NEW_DATE_EMPTY.test(code)) {
        if (hasTelemetrySideChannel(source)) {
          plan.lowActions.push({
            kind: ActionKind.MARK_DATE_NOW_TELEMETRY,
            file: path,
            reason: 'Date.now in @are-telemetry-side-channel file',
            risk: AutoHealRisk.LOW_SEMANTIC,
          });
          plan.summary.LOW_SEMANTIC++;
        } else {
          // Date.now outside telemetry is MEDIUM (marking only, not replacing)
          plan.mediumActions.push({
            kind: ActionKind.MARK_DATE_NOW_TELEMETRY,
            file: path,
            reason: 'Date.now found outside telemetry side-channel',
            risk: AutoHealRisk.MEDIUM_SEMANTIC,
          });
          plan.summary.MEDIUM_SEMANTIC++;
        }
      }
    }

    // ── MEDIUM_SEMANTIC: Stub quarantine ────────────────────────────────────
    if (policy.stubPolicy?.quarantineStubAutomatically) {
      const code = stripStringsAndComments(source);
      const lines = source.split(/\r?\n/).length;
      const isStub =
        PATTERNS.STUB_THROW.test(source) ||
        PATTERNS.STUB_PLACEHOLDER.test(source) ||
        (lines <= 40 && (
          PATTERNS.STUB_RETURN_NULL.test(code) ||
          PATTERNS.STUB_RETURN_UNDEFINED.test(code) ||
          PATTERNS.STUB_EMPTY_ARRAY.test(code) ||
          PATTERNS.STUB_EMPTY_OBJECT.test(code)
        ));

      if (isStub && category !== 'E') {
        plan.mediumActions.push({
          kind: ActionKind.QUARANTINE_STUB,
          file: path,
          reason: 'Stub pattern detected, recommend quarantine',
          risk: AutoHealRisk.MEDIUM_SEMANTIC,
        });
        plan.summary.MEDIUM_SEMANTIC++;
      }
    }

    // ── FORBIDDEN: Stub filling ───────────────────────────────────────────────
    if (category === 'E' && !PATTERNS.STUB_PLACEHOLDER.test(source)) {
      plan.forbiddenActions.push({
        kind: ActionKind.MANUAL_REQUIRED,
        file: path,
        reason: 'Category E stub detected - do NOT auto-fill with fake logic',
        risk: AutoHealRisk.FORBIDDEN,
      });
      plan.summary.FORBIDDEN++;
    }
  }

  return plan;
}


// ─────────────────────────────────────────────────────────────────────────────
// Action Application
// ─────────────────────────────────────────────────────────────────────────────

function applyAction(action, dryRun = true) {
  const { kind, file, ...rest } = action;

  if (!existsSync(file)) {
    return { success: false, error: `File not found: ${file}` };
  }

  let source = readFileSync(file, 'utf8');
  let modified = false;

  switch (kind) {
    case ActionKind.FIX_TYPE_TYPO: {
      const { from, to } = rest;
      const re = new RegExp(`\\b${from}\\b`, 'g');
      const next = source.replace(re, to);
      if (next !== source) {
        source = next;
        modified = true;
      }
      break;
    }

    case ActionKind.FIX_ESM_IMPORT_EXTENSION: {
      const { importPath, suggested } = rest;
      const re = new RegExp(`(['"])${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'g');
      const next = source.replace(re, `$1${suggested}$2`);
      if (next !== source) {
        source = next;
        modified = true;
      }
      break;
    }

    case ActionKind.INSERT_CATEGORY_HEADER: {
      const { category } = rest;
      const catName = {
        A: 'ARE_ALIGNED',
        B: 'DETERMINISTIC_READY',
        C: 'UTILITY_LOW_RISK',
        D: 'NON_DETERMINISTIC',
        E: 'STUB_FAKE',
      }[category] ?? 'UNKNOWN';

      const header = `/**
 * @are-module-category ${category}
 * @are-module-category-name ${catName}
 * @are-module-source autoheal-scanner
 * @are-module-note Auto-detected metadata only. Not a green-state proof.
 */


`;

      if (source.startsWith('#!')) {
        const nlIdx = source.indexOf('\n');
        if (nlIdx !== -1) {
          source = source.slice(0, nlIdx + 1) + header + source.slice(nlIdx + 1);
          modified = true;
        }
      } else {
        source = header + source;
        modified = true;
      }
      break;
    }

    case ActionKind.FIX_TYPE_ONLY_IMPORT: {
      const { current, suggested } = rest;
      if (current && suggested) {
        const re = new RegExp(current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const next = source.replace(re, suggested);
        if (next !== source) {
          source = next;
          modified = true;
        }
      }
      break;
    }

    default:
      return { success: false, error: `Unknown action kind: ${kind}` };
  }

  if (!modified) {
    return { success: true, applied: false, reason: 'no change needed' };
  }

  if (dryRun) {
    return { success: true, applied: false, reason: 'dry-run' };
  }

  writeFileSync(file, source, 'utf8');
  return { success: true, applied: true };
}


// ─────────────────────────────────────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────────────────────────────────────

async function runVerification(commands, verbose = false) {
  const results = [];

  for (const cmd of commands) {
    if (verbose) console.log(`  Running: ${cmd}`);
    const start = Date.now();
    const output = [];
    const errors = [];

    const child = spawn(cmd, [], {
      shell: true,
      cwd: options.root,
    });

    child.stdout.on('data', (d) => output.push(d.toString()));
    child.stderr.on('data', (d) => errors.push(d.toString()));

    const exitCode = await new Promise((resolve) => child.on('close', resolve));
    const elapsed = Date.now() - start;

    const result = {
      command: cmd,
      exitCode,
      elapsed,
      stdout: output.join(''),
      stderr: errors.join(''),
      passed: exitCode === 0,
    };

    results.push(result);

    if (verbose) {
      console.log(`  Exit code: ${exitCode} (${elapsed}ms)`);
    }
  }

  return results;
}


// ─────────────────────────────────────────────────────────────────────────────
// Ledger
// ─────────────────────────────────────────────────────────────────────────────

function writeLedger(plan, results, verdict) {
  const ledgerPath = join(options.root, 'server/src/modules/autoheal-ledger.json');
  const ledger = {
    runId: plan.runId,
    mode: 'strict',
    createdAt: plan.createdAt,
    completedAt: new Date().toISOString(),
    actions: [
      ...plan.safeActions,
      ...plan.lowActions,
      ...plan.mediumActions,
    ].map((a) => ({
      kind: a.kind,
      file: a.file,
      risk: a.risk,
      ...a,
    })),
    forbidden: plan.forbiddenActions,
    verification: results.reduce((acc, r) => {
      acc[r.command.split(' ').pop()] = r.passed ? 'passed' : 'failed';
      return acc;
    }, {}),
    verdict,
  };

  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  return ledgerPath;
}


// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const policy = loadPolicy(join(options.root, 'scripts/autoheal-policy.json'));
  const manifestPath = join(options.root, 'server/src/modules/module-categories.generated.json');

  if (!existsSync(manifestPath)) {
    console.error('Manifest not found. Run: pnpm modules:fix --manifest first');
    exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // Load source files
  // f.path is like "server/src/modules/WeatherResonance.ts" (full from root)
  const files = manifest.files.map((f) => {
    const fullPath = join(options.root, f.path);
    if (!existsSync(fullPath)) return null;
    return {
      path: f.path,
      fullPath,
      source: readFileSync(fullPath, 'utf8'),
      category: f.category,
    };
  }).filter(Boolean);

  console.log('');
  console.log('=== ARE AUTOHEAL ===');
  console.log(`Run ID: autoheal-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  console.log(`Files: ${files.length}`);
  console.log(`Max Risk Level: ${options.maxRisk}`);
  console.log('');

  // Build plan
  const plan = buildPlan(files, policy);

  console.log('─── PLAN SUMMARY ───');
  console.log(`SAFE_MECHANICAL:  ${plan.summary.SAFE_MECHANICAL}`);
  console.log(`LOW_SEMANTIC:     ${plan.summary.LOW_SEMANTIC}`);
  console.log(`MEDIUM_SEMANTIC:  ${plan.summary.MEDIUM_SEMANTIC}`);
  console.log(`HIGH_SEMANTIC:    ${plan.summary.HIGH_SEMANTIC}`);
  console.log(`FORBIDDEN:        ${plan.summary.FORBIDDEN}`);
  console.log('');

  // Show forbidden (important!)
  if (plan.forbiddenActions.length > 0) {
    console.log('─── FORBIDDEN (requires manual intervention) ───');
    for (const a of plan.forbiddenActions) {
      console.log(`  ✗ ${a.file}: ${a.reason}`);
    }
    console.log('');
  }

  // Show plan details if verbose
  if (options.verbose) {
    if (plan.safeActions.length > 0) {
      console.log('─── SAFE ACTIONS ───');
      for (const a of plan.safeActions) {
        if (a.kind === ActionKind.FIX_TYPE_TYPO) {
          console.log(`  ✓ ${a.file}: ${a.from} → ${a.to}`);
        } else if (a.kind === ActionKind.FIX_ESM_IMPORT_EXTENSION) {
          console.log(`  ✓ ${a.file}: ${a.importPath} → ${a.suggested}`);
        } else {
          console.log(`  ✓ ${a.file}: ${a.kind}`);
        }
      }
      console.log('');
    }
  }

  // Apply if requested
  if (options.apply) {
    console.log('─── APPLYING ACTIONS ───');
    const maxRisk = options.maxRisk;

    const allowedActions = [
      ...plan.safeActions,
      ...plan.lowActions,
    ].filter((a) => canApply(a.risk, maxRisk));

    if (allowedActions.length === 0) {
      console.log('No actions to apply at max-risk level:', maxRisk);
    } else {
      console.log(`Applying ${allowedActions.length} actions...`);
    }

    const applied = [];
    for (const action of allowedActions) {
      const fullPath = join(options.root, action.file);
      const result = applyAction({ ...action, file: fullPath }, false);
      if (result.success && result.applied) {
        applied.push(action);
        console.log(`  ✓ Applied: ${action.file} (${action.kind})`);
      }
    }

    // Run verification
    if (policy.verification?.requiredCommands) {
      console.log('');
      console.log('─── VERIFICATION ───');
      const results = await runVerification(policy.verification.requiredCommands, options.verbose);

      const allPassed = results.every((r) => r.passed);
      const verdict = allPassed ? 'GREEN_BY_PROOF' : 'VERIFICATION_FAILED';

      // Write ledger
      const ledgerPath = writeLedger(plan, results, verdict);
      console.log('');
      console.log(`Verdict: ${verdict}`);
      console.log(`Ledger: ${ledgerPath}`);

      if (!allPassed) {
        console.log('');
        console.log('Verification failures:');
        for (const r of results.filter((x) => !x.passed)) {
          console.log(`  ✗ ${r.command}: exit code ${r.exitCode}`);
          if (r.stderr) console.log(`    ${r.stderr.split('\n').slice(0, 3).join('\n    ')}`);
        }
      }
    }

    console.log('');
    console.log(`Applied ${applied.length} actions.`);
  }

  // Dry-run info
  if (!options.apply) {
    console.log('Dry-run only. Use --apply to apply fixes.');
    console.log('');
  }
}

main().catch((err) => {
  console.error('AutoHeal error:', err);
  exit(1);
});