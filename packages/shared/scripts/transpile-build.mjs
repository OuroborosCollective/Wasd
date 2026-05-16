#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve as pathResolve } from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const srcDir = join(root, 'src');
const outDir = join(root, 'dist');

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  esModuleInterop: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: false,
  resolveJsonModule: true,
  skipLibCheck: true,
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'assets' || entry.name === 'tests' || entry.name === '__tests__') continue;
      files.push(...await walk(full));
      continue;
    }
    files.push(full);
  }
  return files;
}

async function ensureParent(file) {
  await mkdir(dirname(file), { recursive: true });
}

function isDeclarationFile(file) {
  return file.endsWith('.d.ts') || file.endsWith('.d.mts') || file.endsWith('.d.cts');
}

function toOutFile(file, extension) {
  const rel = relative(srcDir, file);
  return join(outDir, rel.replace(/\.[cm]?tsx?$/, extension));
}

function shouldRewriteSpecifier(specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return false;
  const clean = specifier.split(/[?#]/, 1)[0];
  if (clean.endsWith('/')) return false;
  return extname(clean) === '';
}

/** Resolve `./dir` to `./dir/index.js` when `dir.ts` is absent but `dir/index.ts` was emitted. */
function resolveRelativeImportToEmittedJs(fromDir, specifier) {
  if (!shouldRewriteSpecifier(specifier)) return specifier;
  const suffixIndex = specifier.search(/[?#]/);
  const pathPart = suffixIndex === -1 ? specifier : specifier.slice(0, suffixIndex);
  const query = suffixIndex === -1 ? '' : specifier.slice(suffixIndex);
  const absBase = pathResolve(fromDir, pathPart);
  const directFile = `${absBase}.js`;
  if (existsSync(directFile)) return `${pathPart}.js${query}`;
  const indexFile = join(absBase, 'index.js');
  if (existsSync(indexFile)) {
    let rel = relative(fromDir, indexFile).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return `${rel}${query}`;
  }
  return `${pathPart}.js${query}`;
}

function rewriteRelativeEsmSpecifiers(output, fromDir) {
  return output
    .replace(/(from\s*['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => {
      return `${prefix}${resolveRelativeImportToEmittedJs(fromDir, specifier)}${suffix}`;
    })
    .replace(/(import\s*['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => {
      return `${prefix}${resolveRelativeImportToEmittedJs(fromDir, specifier)}${suffix}`;
    })
    .replace(/(import\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g, (_match, prefix, specifier, suffix) => {
      return `${prefix}${resolveRelativeImportToEmittedJs(fromDir, specifier)}${suffix}`;
    });
}

async function transpile(file) {
  const source = await readFile(file, 'utf8');
  let result;
  try {
    result = ts.transpileModule(source, {
      compilerOptions,
      fileName: file,
      reportDiagnostics: true,
    });
  } catch (error) {
    console.error(`Transpile failed for ${relative(root, file)}:`);
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
    return;
  }

  const diagnostics = result.diagnostics || [];
  const fatal = diagnostics.filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (fatal.length > 0) {
    console.error(`Transpile diagnostics for ${relative(root, file)}:`);
    console.error(ts.formatDiagnosticsWithColorAndContext(fatal, {
      getCanonicalFileName: (name) => name,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }));
    process.exitCode = 1;
    return;
  }

  const jsFile = toOutFile(file, '.js');
  await ensureParent(jsFile);
  await writeFile(jsFile, result.outputText || '');
}

async function copyAsset(file) {
  const rel = relative(srcDir, file);
  const target = join(outDir, rel);
  await ensureParent(target);
  await copyFile(file, target);
}

const files = await walk(srcDir);
let emitted = 0;
let copied = 0;
let skipped = 0;

for (const file of files) {
  if (isDeclarationFile(file)) {
    skipped += 1;
    continue;
  }
  const ext = extname(file);
  if (ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts') {
    await transpile(file);
    emitted += 1;
  } else if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
    await copyAsset(file);
    copied += 1;
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

for (const file of await walk(outDir)) {
  if (!file.endsWith('.js')) continue;
  const text = await readFile(file, 'utf8');
  const next = rewriteRelativeEsmSpecifiers(text, dirname(file));
  if (next !== text) await writeFile(file, next);
}

console.log(`Transpiled ${emitted} TypeScript file(s), copied ${copied} asset file(s), skipped ${skipped} declaration file(s).`);
