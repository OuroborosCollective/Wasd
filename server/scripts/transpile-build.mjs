#!/usr/bin/env node
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative } from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const srcDir = join(root, 'src');
const outDir = join(root, 'dist');

const RUNTIME_WORKSPACE_PACKAGES = new Set(['shared', 'core-logic']);

async function loadEsbuild() {
  try {
    return require('esbuild');
  } catch (_error) {
    const pnpmDir = join(root, '..', 'node_modules', '.pnpm');
    const entries = await readdir(pnpmDir, { withFileTypes: true });
    const match = entries.find((entry) => entry.isDirectory() && entry.name.startsWith('esbuild@'));
    if (!match) throw new Error(`Could not locate esbuild in ${pnpmDir}`);
    return require(join(pnpmDir, match.name, 'node_modules', 'esbuild'));
  }
}

const esbuild = await loadEsbuild();

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

function withJsExtension(specifier) {
  if (!shouldRewriteSpecifier(specifier)) return specifier;
  const suffixIndex = specifier.search(/[?#]/);
  if (suffixIndex === -1) return `${specifier}.js`;
  return `${specifier.slice(0, suffixIndex)}.js${specifier.slice(suffixIndex)}`;
}

function rewriteWorkspaceSourceSpecifier(specifier) {
  const suffixIndex = specifier.search(/[?#]/);
  const pathPart = suffixIndex === -1 ? specifier : specifier.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : specifier.slice(suffixIndex);

  const rewritten = pathPart.replace(/(^|\/)packages\/(shared|core-logic)\/src\//g, (_match, prefix, packageName) => {
    if (!RUNTIME_WORKSPACE_PACKAGES.has(packageName)) return `${prefix}packages/${packageName}/src/`;
    return `${prefix}packages/${packageName}/dist/`;
  });

  return `${rewritten}${suffix}`;
}

function rewriteImportSpecifier(specifier) {
  return rewriteWorkspaceSourceSpecifier(withJsExtension(specifier));
}

function rewriteRelativeEsmSpecifiers(output) {
  return output
    .replace(/(from\s*['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => `${prefix}${rewriteImportSpecifier(specifier)}${suffix}`)
    .replace(/(import\s*['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => `${prefix}${rewriteImportSpecifier(specifier)}${suffix}`)
    .replace(/(import\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g, (_match, prefix, specifier, suffix) => `${prefix}${rewriteImportSpecifier(specifier)}${suffix}`)
    .replace(/(export\s+[^;]*?from\s*['"])(\.\.?\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => `${prefix}${rewriteImportSpecifier(specifier)}${suffix}`);
}

function hasRuntimeSourceImportLeak(output) {
  return /(?:^|\/)packages\/(?:shared|core-logic)\/src\//.test(output);
}

function loaderFor(file) {
  const ext = extname(file);
  return ext === '.tsx' ? 'tsx' : 'ts';
}

async function transpile(file) {
  const source = await readFile(file, 'utf8');
  let result;
  try {
    result = await esbuild.transform(source, {
      loader: loaderFor(file),
      format: 'esm',
      target: 'es2022',
      sourcemap: false,
      sourcefile: relative(root, file),
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
      },
    });
  } catch (error) {
    console.error(`Transpile failed for ${relative(root, file)}:`);
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
    return;
  }

  const jsFile = toOutFile(file, '.js');
  const output = rewriteRelativeEsmSpecifiers(result.code || '');
  if (hasRuntimeSourceImportLeak(output)) {
    console.error(`Runtime source import leak in ${relative(root, file)}. Workspace imports must resolve to package dist output.`);
    process.exitCode = 1;
    return;
  }

  await ensureParent(jsFile);
  await writeFile(jsFile, output);
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

console.log(`Transpiled ${emitted} TypeScript file(s), copied ${copied} asset file(s), skipped ${skipped} declaration file(s).`);
