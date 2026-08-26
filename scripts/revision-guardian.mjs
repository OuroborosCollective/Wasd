import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const SHA40 = /^[0-9a-f]{40}$/;
export const EVIDENCE_SCHEMA = "wasd.revision-guardian-evidence.v1";

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function canonicalSha256(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function isFullSha(value) {
  return SHA40.test(String(value ?? "").toLowerCase());
}

function requiredArgument(name) {
  const position = process.argv.indexOf(name);
  const value = position >= 0 ? process.argv[position + 1] : "";
  if (!value) throw new Error(`${name}_REQUIRED`);
  return String(value).trim();
}

function optionalArgument(name, fallback = "") {
  const position = process.argv.indexOf(name);
  return position >= 0 ? String(process.argv[position + 1] ?? "").trim() : fallback;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().toLowerCase();
}

function writeEvidence(path, evidence) {
  mkdirSync(dirname(path), { recursive: true });
  const payload = { ...evidence };
  payload.evidenceSha256 = canonicalSha256(payload);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return payload;
}

export function validateRevisionPair(expectedRevision, checkedOutRevision) {
  const expected = String(expectedRevision ?? "").toLowerCase();
  const actual = String(checkedOutRevision ?? "").toLowerCase();
  if (!isFullSha(expected)) throw new Error("EXPECTED_REVISION_INVALID");
  if (!isFullSha(actual)) throw new Error("CHECKED_OUT_REVISION_INVALID");
  if (actual !== expected) throw new Error("CHECKED_OUT_REVISION_MISMATCH");
  return expected;
}

export function runGuardian() {
  const expectedRevision = requiredArgument("--expected-revision").toLowerCase();
  const mode = optionalArgument("--mode", "main");
  const evidencePath = optionalArgument("--evidence", "revision-guardian-evidence.json");
  const eventName = optionalArgument("--event", "manual");
  const currentRevision = git(["rev-parse", "HEAD"]);
  const revision = validateRevisionPair(expectedRevision, currentRevision);
  let mainRevision = null;

  if (mode === "pr") {
    mainRevision = git(["rev-parse", "origin/main"]);
    if (!isFullSha(mainRevision)) throw new Error("CURRENT_MAIN_REVISION_INVALID");
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", mainRevision, revision], { stdio: "ignore" });
    } catch {
      throw new Error("PR_HEAD_NOT_BASED_ON_CURRENT_MAIN");
    }
  } else if (mode === "main") {
    mainRevision = git(["rev-parse", "origin/main"]);
    if (mainRevision !== revision) throw new Error("SOURCE_REVISION_IS_NOT_CURRENT_MAIN");
  } else {
    throw new Error("GUARDIAN_MODE_INVALID");
  }

  return writeEvidence(evidencePath, {
    schemaVersion: EVIDENCE_SCHEMA,
    status: "REVISION_EQUALITY_VERIFIED",
    eventName,
    mode,
    revision,
    checkedOutRevision: currentRevision,
    currentMainRevision: mainRevision,
    secretValuesReturned: false,
  });
}

function main() {
  const evidencePath = optionalArgument("--evidence", "revision-guardian-evidence.json");
  try {
    const evidence = runGuardian();
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
  } catch (error) {
    const failure = writeEvidence(evidencePath, {
      schemaVersion: EVIDENCE_SCHEMA,
      status: "BLOCKED_BY_REVISION_MISMATCH",
      failureSha256: createHash("sha256").update(String(error?.message ?? error), "utf8").digest("hex"),
      secretValuesReturned: false,
    });
    process.stderr.write(`${JSON.stringify(failure)}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
