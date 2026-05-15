#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const srcDir = join(root, 'src');
const outDir = join(root, 'dist');

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  sourceMap: true,
  inlineSources: true,
  resolveJsonModule: true,
  importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'assets' || entry.name === 'tests' || entry.name === '__tests__') continue;
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function ensureParent(file) {
  await mkdir(dirname(file), { recursive: true });
}

function toOutFile(file, extension) {
  const rel = relative(srcDir, file);
  return join(outDir, rel.replace(/\.[cm]?tsx?$/, extension));
}

async function transpile(file) {
  const source = await readFile(file, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions,
    fileName: file,
    reportDiagnostics: false,
  });
  const jsFile = toOutFile(file, '.js');
  await ensureParent(jsFile);
  await writeFile(jsFile, result.outputText);
  if (result.sourceMapText) {
    await writeFile(`${jsFile}.map`, result.sourceMapText);
  }
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

for (const file of files) {
  const ext = extname(file);
  if (ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts') {
    await transpile(file);
    emitted += 1;
  } else if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
    await copyAsset(file);
    copied += 1;
  }
}

console.log(`Transpiled ${emitted} TypeScript file(s), copied ${copied} asset file(s).`);
