import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_LEDGER_SCHEMA = "wasd.aurion-source-ledger.v1";
export const FULL_SHA = /^[a-f0-9]{40}$/;

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function canonicalSha256(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function fileSha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function gitRevision(root) {
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim().toLowerCase();
  if (!FULL_SHA.test(revision)) throw new Error("SOURCE_REVISION_INVALID");
  return revision;
}

function sourceDomain(path) {
  const normalized = path.toLowerCase();
  if (/(auth|identity|session|login)/.test(normalized)) return "identity";
  if (/(quest|dialogue|story)/.test(normalized)) return "quest";
  if (/(inventory|loot|item|equipment)/.test(normalized)) return "inventory";
  if (/(economy|market|trade|wallet|craft)/.test(normalized)) return "economy";
  if (/(world|chunk|terrain|are\/|npc|land)/.test(normalized)) return "world";
  if (/(database|persistence|migration|postgres|storage)/.test(normalized)) return "persistence";
  return "unclassified";
}

function isMigrationSource(path) {
  if (!/\.(?:[cm]?js|tsx?|json)$/u.test(path)) return false;
  return !/(?:^|\/)(?:__tests__|test|tests)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path);
}

function ensureInside(root, candidate) {
  const target = resolve(candidate);
  const relation = relative(root, target);
  if (relation === "" || relation.startsWith("..") || isAbsolute(relation)) {
    throw new Error("OUTPUT_PATH_OUTSIDE_REPOSITORY");
  }
  return target;
}

async function collectFiles(root, directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolute = join(directory, entry.name);
    const path = relative(root, absolute).replaceAll("\\", "/");
    if (entry.isSymbolicLink()) throw new Error(`SYMLINKED_SOURCE_BLOCKED:${path}`);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(root, absolute));
      continue;
    }
    if (!entry.isFile() || !isMigrationSource(path)) continue;
    const content = await readFile(absolute);
    files.push({ path, sha256: fileSha256(content), bytes: content.byteLength, domain: sourceDomain(path) });
  }
  return files;
}

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() : fallback;
}

/**
 * Builds a hash-only WASD source manifest. It intentionally has no database,
 * deployment, or data-backfill capability: Aurion consumes it only as an
 * immutable source-evidence input for a separately approved migration plan.
 */
export async function buildWasdAurionSourceLedger({ root = process.cwd(), out = "dist/wasd-aurion-source-ledger" } = {}) {
  const repositoryRoot = resolve(root);
  const sourceDirectory = join(repositoryRoot, "server", "src");
  const outputDirectory = ensureInside(repositoryRoot, resolve(repositoryRoot, out));
  const revision = gitRevision(repositoryRoot);
  const expectedRevision = process.env.WASD_SOURCE_SHA?.trim().toLowerCase();
  if (expectedRevision && (!FULL_SHA.test(expectedRevision) || expectedRevision !== revision)) {
    throw new Error("SOURCE_REVISION_MISMATCH");
  }

  const files = await collectFiles(repositoryRoot, sourceDirectory);
  if (files.length === 0) throw new Error("SOURCE_LEDGER_EMPTY");

  const unsignedLedger = {
    schemaVersion: SOURCE_LEDGER_SCHEMA,
    recordType: "wasd_aurion_source_ledger",
    source: {
      repository: process.env.WASD_SOURCE_REPOSITORY?.trim() || "OuroborosCollective/Wasd",
      revision,
      path: "server/src",
    },
    files,
    policy: {
      automaticActions: ["discover_source", "hash_source", "emit_receipt"],
      requiresOwnerApproval: ["schema_apply", "data_backfill", "journal_repair", "production_deploy"],
      prohibitedActions: ["database_write", "production_database_read", "production_deploy"],
      databaseConnectionsOpened: false,
      sourceCodeCopiedIntoAurion: false,
    },
  };
  const ledger = { ...unsignedLedger, manifestSha256: canonicalSha256(unsignedLedger) };
  const payload = `${JSON.stringify(ledger, null, 2)}\n`;
  const payloadSha256 = fileSha256(Buffer.from(payload, "utf8"));

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "source-ledger.json"), payload, { encoding: "utf8", mode: 0o644 });
  await writeFile(join(outputDirectory, "checksums.sha256"), `${payloadSha256}  source-ledger.json\n`, { encoding: "utf8", mode: 0o644 });

  return {
    sourceRevision: revision,
    sourceManifestSha256: ledger.manifestSha256,
    sourceLedgerFileSha256: payloadSha256,
    sourceFileCount: files.length,
    outputDirectory,
  };
}

async function main() {
  const result = await buildWasdAurionSourceLedger({ out: argumentValue("--out", "dist/wasd-aurion-source-ledger") });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  });
}
