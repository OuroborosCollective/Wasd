#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const srcDir = join(root, 'src');
const outDir = join(root, '..', 'dist', 'engine');

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
  resolveJsonModule: true,
  skipLibCheck: true,
  isolatedModules: true,
  verbatimModuleSyntax: true,
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

function resolveExtensionlessSpecifier(specifier, fromFile) {
  if (!shouldRewriteSpecifier(specifier)) return specifier;
  const suffixIndex = specifier.search(/[?#]/);
  const bareSpecifier = suffixIndex === -1 ? specifier : specifier.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : specifier.slice(suffixIndex);
  const sourceTarget = join(dirname(fromFile), bareSpecifier);

  for (const extension of ['.ts', '.tsx', '.mts', '.cts']) {
    if (existsSync(`${sourceTarget}${extension}`)) return `${bareSpecifier}.js${suffix}`;
  }
  for (const extension of ['.ts', '.tsx', '.mts', '.cts']) {
    if (existsSync(join(sourceTarget, `index${extension}`))) return `${bareSpecifier}/index.js${suffix}`;
  }
  return `${bareSpecifier}.js${suffix}`;
}

function rewriteRelativeEsmSpecifiers(output, fromFile) {
  return output
    .replace(/(from\s*['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => `${prefix}${resolveExtensionlessSpecifier(specifier, fromFile)}${suffix}`)
    .replace(/(import\s*['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => `${prefix}${resolveExtensionlessSpecifier(specifier, fromFile)}${suffix}`)
    .replace(/(import\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g, (_match, prefix, specifier, suffix) => `${prefix}${resolveExtensionlessSpecifier(specifier, fromFile)}${suffix}`)
    .replace(/(export\s+[^;]*?from\s*['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => `${prefix}${resolveExtensionlessSpecifier(specifier, fromFile)}${suffix}`);
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
  await writeFile(jsFile, rewriteRelativeEsmSpecifiers(result.outputText || '', file));
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

if (process.exitCode) process.exit(process.exitCode);

console.log('Skipped declaration files for @wasd/engine production runtime build. Runtime JavaScript output is ready.');
console.log(`Transpiled ${emitted} TypeScript file(s), copied ${copied} asset file(s), skipped ${skipped} declaration file(s).`);
