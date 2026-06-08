#!/usr/bin/env node
/**
 * Deterministic ESM TypeScript Build Script for @wasd/server.
 *
 * Features:
 * - Transpiles src/**/*.ts/.tsx/.mts/.cts to dist/**/*.js
 * - Rewrites relative ESM imports to include .js using es-module-lexer
 * - Avoids unsafe broad regex rewriting of comments/string literals
 * - Copies json/yaml/yml assets
 * - Skips tests, declarations, maps, hidden temp files and generated folders
 * - Uses deterministic file ordering
 * - Supports --clean and --verbose
 */

import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

const require = createRequire(import.meta.url);

const root = process.cwd();
const srcDir = resolve(root, 'src');
const outDir = resolve(root, 'dist');
const args = new Set(process.argv.slice(2));

const CONFIG = Object.freeze({
  clean: args.has('--clean'),
  verbose: args.has('--verbose'),
  target: 'es2022',
  format: 'esm',
  assetExts: new Set(['.json', '.yaml', '.yml']),
  tsExts: new Set(['.ts', '.tsx', '.mts', '.cts']),
  skipDirs: new Set([
    'assets',
    'tests',
    '__tests__',
    '__mocks__',
    'fixtures',
    'coverage',
    'dist',
    'build',
    'node_modules',
  ]),
});

function logVerbose(...parts) {
  if (CONFIG.verbose) console.log('[transpile-build]', ...parts);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function loadPackage(name, fallbackMatcher) {
  try {
    return require(name);
  } catch (_error) {
    const pnpmDir = join(root, '..', 'node_modules', '.pnpm');

    let entries;
    try {
      entries = await readdir(pnpmDir, { withFileTypes: true });
    } catch {
      throw new Error(
        `Could not load "${name}" and could not inspect fallback pnpm dir: ${pnpmDir}`,
      );
    }

    const match = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .find(fallbackMatcher);

    if (!match) {
      throw new Error(`Could not locate "${name}" in ${pnpmDir}`);
    }

    return require(join(pnpmDir, match, 'node_modules', name));
  }
}

const esbuild = await loadPackage('esbuild', (name) =>
  name.startsWith('esbuild@'),
);

const lexer = await loadPackage('es-module-lexer', (name) =>
  name.startsWith('es-module-lexer@'),
);

await lexer.init;

function normalizePathForLog(path) {
  return relative(root, path).split(sep).join('/');
}

function isDeclarationFile(file) {
  return (
    file.endsWith('.d.ts') ||
    file.endsWith('.d.mts') ||
    file.endsWith('.d.cts')
  );
}

function isLikelyGeneratedFile(file) {
  return (
    file.endsWith('.map') ||
    file.endsWith('.tmp') ||
    file.endsWith('.bak') ||
    file.includes(`${sep}.`)
  );
}

function loaderFor(file) {
  const ext = extname(file);

  switch (ext) {
    case '.ts':
    case '.mts':
    case '.cts':
      return 'ts';
    case '.tsx':
      return 'tsx';
    default:
      throw new Error(`Unsupported TypeScript extension: ${ext}`);
  }
}

function toOutFile(file, extension = '.js') {
  const rel = relative(srcDir, file);
  return join(outDir, rel.replace(/\.[cm]?tsx?$/, extension));
}

async function ensureParent(file) {
  await mkdir(dirname(file), { recursive: true });
}

function splitSpecifierSuffix(specifier) {
  const index = specifier.search(/[?#]/);

  if (index === -1) {
    return {
      base: specifier,
      suffix: '',
    };
  }

  return {
    base: specifier.slice(0, index),
    suffix: specifier.slice(index),
  };
}

function shouldRewriteSpecifier(specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return false;

  const { base } = splitSpecifierSuffix(specifier);

  if (!base) return false;
  if (base.endsWith('/')) return false;

  const ext = extname(base);

  /**
   * Only extensionless local imports need .js.
   * Keep explicit runtime assets/extensions untouched:
   * - ./foo.json
   * - ./foo.css
   * - ./foo.js
   * - ./foo.node
   */
  return ext === '';
}

function withJsExtension(specifier) {
  if (!shouldRewriteSpecifier(specifier)) return specifier;

  const { base, suffix } = splitSpecifierSuffix(specifier);
  return `${base}.js${suffix}`;
}

/**
 * Uses es-module-lexer ranges.
 * This avoids rewriting comments and unrelated string literals.
 */
function rewriteRelativeEsmSpecifiers(code) {
  const [imports] = lexer.parse(code);

  if (!imports.length) return code;

  const edits = [];

  for (const item of imports) {
    /**
     * item.n is the parsed module specifier when static enough.
     * item.s/item.e are the range of the specifier content without quotes.
     */
    if (!item.n) continue;
    if (!shouldRewriteSpecifier(item.n)) continue;

    edits.push({
      start: item.s,
      end: item.e,
      value: withJsExtension(item.n),
    });
  }

  if (!edits.length) return code;

  let output = '';
  let cursor = 0;

  for (const edit of edits.sort((a, b) => a.start - b.start)) {
    output += code.slice(cursor, edit.start);
    output += edit.value;
    cursor = edit.end;
  }

  output += code.slice(cursor);
  return output;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (CONFIG.skipDirs.has(entry.name)) {
        logVerbose('skip dir', normalizePathForLog(full));
        continue;
      }

      files.push(...(await walk(full)));
      continue;
    }

    if (!entry.isFile()) continue;
    if (isLikelyGeneratedFile(full)) continue;

    files.push(full);
  }

  return files.sort((a, b) =>
    normalizePathForLog(a).localeCompare(normalizePathForLog(b)),
  );
}

async function transpile(file) {
  const source = await readFile(file, 'utf8');

  let result;

  try {
    result = await esbuild.transform(source, {
      loader: loaderFor(file),
      format: CONFIG.format,
      target: CONFIG.target,
      sourcemap: false,
      sourcefile: normalizePathForLog(file),
      logLevel: 'silent',
      legalComments: 'none',
      charset: 'utf8',
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: false,
          useDefineForClassFields: false,
          importsNotUsedAsValues: 'remove',
          preserveValueImports: false,
        },
      },
    });
  } catch (error) {
    throw new Error(
      `Transpile failed for ${normalizePathForLog(file)}\n${
        error?.stack || error?.message || String(error)
      }`,
    );
  }

  const jsFile = toOutFile(file, '.js');
  const output = rewriteRelativeEsmSpecifiers(result.code || '');

  await ensureParent(jsFile);
  await writeFile(jsFile, output, 'utf8');

  return jsFile;
}

async function copyAsset(file) {
  const rel = relative(srcDir, file);
  const target = join(outDir, rel);

  await ensureParent(target);
  await copyFile(file, target);

  return target;
}

async function main() {
  if (!(await exists(srcDir))) {
    throw new Error(`Missing src directory: ${srcDir}`);
  }

  if (CONFIG.clean) {
    await rm(outDir, { recursive: true, force: true });
    logVerbose('cleaned', normalizePathForLog(outDir));
  }

  await mkdir(outDir, { recursive: true });

  const files = await walk(srcDir);

  let emitted = 0;
  let copied = 0;
  let skipped = 0;

  const failures = [];

  for (const file of files) {
    const ext = extname(file);

    if (isDeclarationFile(file)) {
      skipped += 1;
      continue;
    }

    try {
      if (CONFIG.tsExts.has(ext)) {
        const target = await transpile(file);
        emitted += 1;
        logVerbose('emit', normalizePathForLog(target));
      } else if (CONFIG.assetExts.has(ext)) {
        const target = await copyAsset(file);
        copied += 1;
        logVerbose('copy', normalizePathForLog(target));
      } else {
        skipped += 1;
      }
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length) {
    console.error('');
    console.error(`Build failed with ${failures.length} error(s):`);
    console.error('');

    for (const failure of failures) {
      console.error(failure?.stack || failure?.message || String(failure));
      console.error('');
    }

    process.exit(1);
  }

  console.log(
    [
      `Transpiled ${emitted} TypeScript file(s)`,
      `copied ${copied} asset file(s)`,
      `skipped ${skipped} file(s)`,
    ].join(', ') + '.',
  );
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
