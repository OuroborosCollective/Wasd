import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function canonicalSha256(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function command(file, args) {
  return execFileSync(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? String(process.argv[index + 1] ?? "").trim().toLowerCase() : "";
  if (!SHA40.test(value)) throw new Error(`${name}_INVALID`);
  return value;
}

async function response(path, expectJson = true) {
  const result = await fetch(`http://127.0.0.1:3001${path}`, { signal: AbortSignal.timeout(15000) });
  const raw = await result.text();
  if (!result.ok) throw new Error(`HTTP_${path}_${result.status}`);
  return { status: result.status, value: expectJson ? JSON.parse(raw) : raw };
}

async function run() {
  const expectedRevision = argument("--expected-revision");
  const repoHead = command("git", ["rev-parse", "HEAD"]).toLowerCase();
  if (repoHead !== expectedRevision) throw new Error("REPOSITORY_HEAD_MISMATCH");
  const imageId = command("docker", ["inspect", "arelorian-engine", "--format", "{{.Image}}"]).toLowerCase();
  if (!SHA256.test(imageId)) throw new Error("RUNTIME_IMAGE_ID_INVALID");
  const imageRevision = command("docker", ["image", "inspect", imageId, "--format", "{{index .Config.Labels \"org.opencontainers.image.revision\"}}"]).toLowerCase();
  if (imageRevision !== expectedRevision) throw new Error("RUNTIME_IMAGE_REVISION_MISMATCH");
  const state = command("docker", ["inspect", "arelorian-engine", "--format", "{{.State.Status}}"]).toLowerCase();
  if (state !== "running") throw new Error("RUNTIME_NOT_RUNNING");

  const [health, clientConfig, client2dStamp, client3d] = await Promise.all([
    response("/health"),
    response("/client-config.json"),
    response("/2d/build-stamp.json"),
    response("/3d/", false),
  ]);
  const client3dVerified = typeof client3d.value === "string"
    && client3d.value.includes("<script")
    && client3d.value.includes("assets/")
    && !client3d.value.includes("Areloria 3D unavailable");
  if (clientConfig.value?.buildHash !== expectedRevision) throw new Error("CLIENT_CONFIG_BUILD_HASH_MISMATCH");
  if (client2dStamp.value?.commit !== expectedRevision) throw new Error("CLIENT_2D_BUILD_STAMP_MISMATCH");
  if (!client3dVerified) throw new Error("CLIENT_3D_ARTIFACT_NOT_VERIFIED");

  const receipt = {
    schemaVersion: RECEIPT_SCHEMA,
    ok: true,
    status: "WASD_RUNTIME_REVISION_VERIFIED",
    expectedRevision,
    repoHead,
    image: { id: imageId, revision: imageRevision },
    runtime: {
      state,
      healthStatus: health.status,
      clientConfigStatus: clientConfig.status,
      clientConfigBuildHash: clientConfig.value?.buildHash ?? null,
      client2dBuildStampCommit: client2dStamp.value?.commit ?? null,
      client3dStatus: client3d.status,
      client3dVerified,
    },
    secretValuesReturned: false,
  };
  receipt.evidenceSha256 = canonicalSha256(receipt);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    const failure = {
      schemaVersion: RECEIPT_SCHEMA,
      ok: false,
      status: "BLOCKED_BY_MISSING_OR_CONTRADICTED_EVIDENCE",
      failureSha256: createHash("sha256").update(String(error?.message ?? error), "utf8").digest("hex"),
      secretValuesReturned: false,
    };
    failure.evidenceSha256 = canonicalSha256(failure);
    process.stdout.write(`${JSON.stringify(failure)}\n`);
    process.exitCode = 2;
  });
}
