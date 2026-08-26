#!/usr/bin/env node
/**
 * ARE Module Autofixer
 *
 * Safe mechanical autofixes only:
 * - fixes known identifier/type typos outside strings/comments
 * - writes a generated module category manifest
 * - optionally inserts scanner-detected category headers
 *
 * Usage:
 *   node scripts/autofix-modules.mjs
 *   node scripts/autofix-modules.mjs --write
 *   node scripts/autofix-modules.mjs --write --manifest
 *   node scripts/autofix-modules.mjs --write --headers
 *   node scripts/autofix-modules.mjs --module=inventory --write
 */


import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { argv, cwd, exit } from 'node:process';


const DEFAULT_MODULES_DIR = 'server/src/modules';
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);


const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.turbo',
  '.next',
  '.cache',
]);


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


  ['TickSystemContex', 'TickSystemContext'],
  ['TickSystenContext', 'TickSystemContext'],
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
  STUB_NULL: /\breturn\s+null\s*;?/,
  STUB_UNDEFINED: /\breturn\s+undefined\s*;?/,
  STUB_EMPTY_ARRAY: /\breturn\s*\[\s*\]\s*;?/,
  STUB_EMPTY_OBJECT: /\breturn\s*\{\s*\}\s*;?/,
  STUB_PLACEHOLDER: /(?:placeholder|stub|fake|mock)/i,


  GAME_LOGIC: /\b(?:player|npc|quest|loot|combat|inventory|guild|economy|skill|craft|world|chunk|biome|item|equipment|dialogue|movement|pathfinding|trade|market|damage|spawn)\b/i,
  UTILITY: /\b(?:Util|Utils|Math|Vector|Hash|Parser|Serializer|Resolver|Validator|Schema|Config|Factory)\b/,
};


function parseArgs(rawArgs) {
  const has = (flag) => rawArgs.includes(flag);
  const get = (name, fallback = undefined) => {
    const hit = rawArgs.find((arg) => arg.startsWith(`${name}=`));
    return hit ? hit.slice(name.length + 1) : fallback;
  };


  return {
    root: resolve(get('--root', cwd())),
    modulesDir: get('--modules-dir', DEFAULT_MODULES_DIR),
    module: get('--module', undefined),
    write: has('--write'),
    manifest: has('--manifest'),
    headers: has('--headers'),
    help: has('--help') || has('-h'),
  };
}


const options = parseArgs(argv.slice(2));


if (options.help) {
  console.log(`
ARE Module Autofixer


Usage:
  node scripts/autofix-modules.mjs
  node scripts/autofix-modules.mjs --write
  node scripts/autofix-modules.mjs --write --manifest
  node scripts/autofix-modules.mjs --write --headers
  node scripts/autofix-modules.mjs --module=inventory --write


Options:
  --write                 Apply fixes. Without this, dry-run only.
  --manifest              Write server/src/modules/module-categories.generated.json
  --headers               Insert @are-module-category headers if missing
  --module=<name>         Limit to one module folder
  --root=<path>           Project root
  --modules-dir=<path>    Modules directory
`);
  exit(0);
}


function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);


    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walkFiles(fullPath, out);
      }
      continue;
    }


    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(extname(entry.name))) continue;


    out.push(fullPath);
  }


  return out;
}


function moduleNameFor(filePath, modulesRoot) {
  const rel = relative(modulesRoot, filePath);
  return rel.split(sep)[0];
}


function replaceIdentifiersOutsideText(source, fixes) {
  let output = '';
  let changed = false;
  let i = 0;


  const isIdStart = (ch) => /[A-Za-z_$]/.test(ch);
  const isIdPart = (ch) => /[A-Za-z0-9_$]/.test(ch);


  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];


    if (ch === '/' && next === '/') {
      const start = i;
      i += 2;
      while (i < source.length && source[i] !== '\n') i += 1;
      output += source.slice(start, i);
      continue;
    }


    if (ch === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') {
          i += 2;
          break;
        }
        i += 1;
      }
      output += source.slice(start, i);
      continue;
    }


    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      const start = i;
      i += 1;


      while (i < source.length) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }


        if (source[i] === quote) {
          i += 1;
          break;
        }


        i += 1;
      }


      output += source.slice(start, i);
      continue;
    }


    if (isIdStart(ch)) {
      const start = i;
      i += 1;


      while (i < source.length && isIdPart(source[i])) {
        i += 1;
      }


      const ident = source.slice(start, i);
      const replacement = fixes.get(ident);


      if (replacement && replacement !== ident) {
        output += replacement;
        changed = true;
      } else {
        output += ident;
      }


      continue;
    }


    output += ch;
    i += 1;
  }


  return { content: output, changed };
}


function fixCategoryTypos(source) {
  let content = source;
  let changed = false;


  for (const [wrong, right] of CATEGORY_TYPO_FIXES.entries()) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'g');
    const next = content.replace(regex, right);


    if (next !== content) {
      content = next;
      changed = true;
    }
  }


  return { content, changed };
}


function stripStringsAndComments(source) {
  let output = '';
  let i = 0;


  const mask = (ch) => {
    output += ch === '\n' ? '\n' : ' ';
  };


  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];


    if (ch === '/' && next === '/') {
      output += '  ';
      i += 2;
      while (i < source.length && source[i] !== '\n') {
        mask(source[i]);
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
        mask(source[i]);
        i += 1;
      }
      continue;
    }


    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      mask(ch);
      i += 1;


      while (i < source.length) {
        if (source[i] === '\\') {
          mask(source[i]);
          if (i + 1 < source.length) mask(source[i + 1]);
          i += 2;
          continue;
        }


        const current = source[i];
        mask(current);
        i += 1;


        if (current === quote) break;
      }


      continue;
    }


    output += ch;
    i += 1;
  }


  return output;
}


function detectCategory(source) {
  const code = stripStringsAndComments(source);
  const lines = source.split(/\r?\n/).length;


  const isARE =
    PATTERNS.TICK_SYSTEM.test(code) ||
    PATTERNS.TICK_CONTEXT.test(code) ||
    PATTERNS.TICK_PRIORITY.test(code) ||
    PATTERNS.ARE_IMPORT.test(code);


  const hasKappa = PATTERNS.KAPPA.test(code);
  const hasPrng = PATTERNS.DETERMINISTIC_PRNG.test(code);
  const hasDelta = PATTERNS.DELTA.test(code);


  const nonDet =
    PATTERNS.MATH_RANDOM.test(code) ||
    PATTERNS.DATE_NOW.test(code) ||
    PATTERNS.NEW_DATE_EMPTY.test(code) ||
    PATTERNS.PERFORMANCE_NOW.test(code) ||
    PATTERNS.RANDOM_UUID.test(code) ||
    PATTERNS.RANDOM_BYTES.test(code);


  const stub =
    PATTERNS.STUB_THROW.test(code) ||
    PATTERNS.STUB_PLACEHOLDER.test(source) ||
    (
      lines <= 40 &&
      (
        PATTERNS.STUB_NULL.test(code) ||
        PATTERNS.STUB_UNDEFINED.test(code) ||
        PATTERNS.STUB_EMPTY_ARRAY.test(code) ||
        PATTERNS.STUB_EMPTY_OBJECT.test(code)
      )
    );


  if (stub && !isARE) return 'E';
  if (nonDet) return 'D';
  if (isARE && (hasKappa || hasPrng || hasDelta)) return 'A';
  if (isARE || hasDelta || PATTERNS.GAME_LOGIC.test(code)) return 'B';
  return 'C';
}


function categoryName(category) {
  return {
    A: 'ARE_ALIGNED',
    B: 'DETERMINISTIC_READY',
    C: 'UTILITY_LOW_RISK',
    D: 'NON_DETERMINISTIC',
    E: 'STUB_FAKE',
  }[category] ?? 'UNKNOWN';
}


function hasCategoryHeader(source) {
  return /@are-module-category\s+[A-E]\b/.test(source);
}


function insertCategoryHeader(source, category) {
  if (hasCategoryHeader(source)) return { content: source, changed: false };


  const header = `/**
 * @are-module-category ${category}
 * @are-module-category-name ${categoryName(category)}
 * @are-module-source scanner-detected
 * @are-module-note Auto-detected metadata only. Not a green-state proof.
 */


`;


  if (source.startsWith('#!')) {
    const newlineIndex = source.indexOf('\n');
    if (newlineIndex !== -1) {
      return {
        content: `${source.slice(0, newlineIndex + 1)}${header}${source.slice(newlineIndex + 1)}`,
        changed: true,
      };
    }
  }


  return {
    content: `${header}${source}`,
    changed: true,
  };
}


function analyzeAndFixFile(filePath, modulesRoot) {
  const original = readFileSync(filePath, 'utf8');
  let content = original;


  const changes = [];


  const typeFix = replaceIdentifiersOutsideText(content, TYPE_TYPO_FIXES);
  if (typeFix.changed) {
    content = typeFix.content;
    changes.push('fixed known type/name typos');
  }


  const categoryFix = fixCategoryTypos(content);
  if (categoryFix.changed) {
    content = categoryFix.content;
    changes.push('fixed known category spelling typos');
  }


  const category = detectCategory(content);


  if (options.headers) {
    const headerFix = insertCategoryHeader(content, category);
    if (headerFix.changed) {
      content = headerFix.content;
      changes.push(`inserted scanner category header ${category}`);
    }
  }


  const changed = content !== original;


  if (changed && options.write) {
    writeFileSync(filePath, content, 'utf8');
  }


  return {
    path: relative(options.root, filePath),
    module: moduleNameFor(filePath, modulesRoot),
    category,
    categoryName: categoryName(category),
    changed,
    changes,
  };
}


function main() {
  const modulesRoot = resolve(options.root, options.modulesDir);


  if (!existsSync(modulesRoot)) {
    console.error(`Modules directory not found: ${modulesRoot}`);
    exit(2);
  }


  let files = walkFiles(modulesRoot);


  if (options.module) {
    files = files.filter((filePath) => moduleNameFor(filePath, modulesRoot) === options.module);
  }


  const results = files.map((filePath) => analyzeAndFixFile(filePath, modulesRoot));


  const changed = results.filter((r) => r.changed);


  console.log('');
  console.log('=== ARE MODULE AUTOFIX ===');
  console.log(`Mode: ${options.write ? 'WRITE' : 'DRY-RUN'}`);
  console.log(`Files scanned: ${results.length}`);
  console.log(`Files changed: ${changed.length}`);
  console.log('');


  for (const result of changed) {
    console.log(`- ${result.path}`);
    for (const change of result.changes) {
      console.log(`  • ${change}`);
    }
  }


  if (changed.length === 0) {
    console.log('No safe mechanical fixes found.');
  }


  if (!options.write && changed.length > 0) {
    console.log('');
    console.log('Dry-run only. Re-run with --write to apply.');
  }


  if (options.manifest) {
    const manifestPath = join(modulesRoot, 'module-categories.generated.json');
    const manifest = {
      generatedBy: 'scripts/autofix-modules.mjs',
      warning: 'Generated scanner metadata. Not a green-state proof.',
      files: results.map((r) => ({
        path: r.path,
        module: r.module,
        category: r.category,
        categoryName: r.categoryName,
      })),
      summary: {
        A: results.filter((r) => r.category === 'A').length,
        B: results.filter((r) => r.category === 'B').length,
        C: results.filter((r) => r.category === 'C').length,
        D: results.filter((r) => r.category === 'D').length,
        E: results.filter((r) => r.category === 'E').length,
      },
    };


    if (options.write) {
      mkdirSync(dirname(manifestPath), { recursive: true });
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      console.log('');
      console.log(`Wrote manifest: ${relative(options.root, manifestPath)}`);
    } else {
      console.log('');
      console.log(`Manifest would be written to: ${relative(options.root, manifestPath)}`);
    }
  }


  console.log('');
}


main();