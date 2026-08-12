import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const RECEIPT_SCHEMA = "wasd.vps-runtime-readback.v1";

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

export function validateReceipt(receipt, expectedRevision) {
  const expected = String(expectedRevision ?? "").toLowerCase();
  if (!SHA40.test(expected)) throw new Error("EXPECTED_REVISION_INVALID");
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new Error("RECEIPT_OBJECT_REQUIRED");
  if (receipt.schemaVersion !== RECEIPT_SCHEMA) throw new Error("RECEIPT_SCHEMA_INVALID");
  if (receipt.ok !== true || receipt.status !== "WASD_RUNTIME_REVISION_VERIFIED") throw new Error("RUNTIME_RECEIPT_NOT_VERIFIED");
  if (receipt.secretValuesReturned !== false) throw new Error("RECEIPT_SECRET_CONTRACT_INVALID");
  if (receipt.expectedRevision !== expected || receipt.repoHead !== expected) throw new Error("RECEIPT_REVISION_MISMATCH");
  if (!SHA256.test(String(receipt.image?.id ?? ""))) throw new Error("IMAGE_ID_INVALID");
  if (receipt.image?.revision !== expected) throw new Error("IMAGE_REVISION_MISMATCH");
  if (receipt.runtime?.state !== "running") throw new Error("RUNTIME_NOT_RUNNING");
  if (receipt.runtime?.clientConfigBuildHash !== expected) throw new Error("CLIENT_CONFIG_BUILD_HASH_MISMATCH");
  if (receipt.runtime?.client2dBuildStampCommit !== expected) throw new Error("CLIENT_2D_BUILD_STAMP_MISMATCH");
  if (receipt.runtime?.client3dVerified !== true) throw new Error("CLIENT_3D_ARTIFACT_NOT_VERIFIED");
  const projected = { ...receipt };
  delete projected.evidenceSha256;
  if (receipt.evidenceSha256 !== canonicalSha256(projected)) throw new Error("RECEIPT_EVIDENCE_HASH_MISMATCH");
  return receipt;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function main() {
  const expectedRevision = argument("--expected-revision");
  const receiptPath = argument("--receipt");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  const verified = validateReceipt(receipt, expectedRevision);
  process.stdout.write(`${JSON.stringify({ status: "VERIFIED", revision: verified.expectedRevision, receiptSha256: verified.evidenceSha256 })}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
