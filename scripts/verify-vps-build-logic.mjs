import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "Dockerfile.vps",
  "docker-compose.yml",
  "scripts/deploy-vps-docker.sh",
  "scripts/revision-guardian.mjs",
  "scripts/verify-wasd-vps-runtime-receipt.mjs",
  "scripts/vps-runtime-readback.mjs",
  ".github/wasd-vps-runtime-readback-known_hosts",
  ".github/workflows/wasd-revision-guardian.yml",
  ".github/workflows/wasd-vps-revision-readback.yml",
  "engine/src/determinism/tickPolicy.ts",
  "server/src/core/WorldTickPolicy.ts",
  "server/src/core/WorldTickPolicy.guard.ts",
  "backend/src/core/ast-interface-sync.ts",
  "backend/src/core/integrity-checker.ts",
  "packages/core-logic/package.json",
  "packages/shared/package.json",
];

const requiredSnippets = [
  ["Dockerfile.vps", "ARG BUILD_COMMIT_SHA=\"\""],
  ["Dockerfile.vps", "ENV BUILD_COMMIT_SHA=$BUILD_COMMIT_SHA"],
  ["Dockerfile.vps", "LABEL org.opencontainers.image.revision=$BUILD_COMMIT_SHA"],
  ["Dockerfile.vps", "--filter @wasd/server... --filter @wasd/client... --filter @wasd/engine..."],
  ["Dockerfile.vps", "RUN pnpm --filter @wasd/client --if-present build &&"],
  ["Dockerfile.vps", "test -d client/dist/assets"],
  ["docker-compose.yml", "BUILD_COMMIT_SHA: \"${BUILD_COMMIT_SHA:-}\""],
  ["scripts/deploy-vps-docker.sh", "export BUILD_COMMIT_SHA=\"$(git rev-parse HEAD)\""],
  ["scripts/deploy-vps-docker.sh", "client_3d_shell_ready"],
  ["scripts/deploy-vps-docker.sh", "!body.includes('Areloria 3D unavailable')"],
  ["scripts/revision-guardian.mjs", "PR_HEAD_NOT_BASED_ON_CURRENT_MAIN"],
  ["scripts/verify-wasd-vps-runtime-receipt.mjs", "RECEIPT_EVIDENCE_HASH_MISMATCH"],
  ["scripts/vps-runtime-readback.mjs", "RUNTIME_IMAGE_REVISION_MISMATCH"],
  [".github/workflows/wasd-revision-guardian.yml", "Revision Guardian Evidence"],
  [".github/workflows/wasd-vps-revision-readback.yml", "StrictHostKeyChecking=yes"],
  [".github/workflows/wasd-vps-revision-readback.yml", "Publish verified production deployment status"],
  ["engine/src/determinism/tickPolicy.ts", "WORLD_TICK_HZ = 10 as const"],
  ["engine/src/determinism/tickPolicy.ts", "WORLD_TICK_MS = 100 as const"],
  ["engine/src/determinism/tickPolicy.ts", "WORLD_TICK_KAPPA = 1000 as const"],
  ["engine/src/determinism/tickPolicy.ts", "WORLD_TICK_CHUNK_SIZE = 64 as const"],
  ["server/src/core/WorldTickPolicy.ts", "AUTHORITATIVE_WORLD_TICK_MS = 100 as const"],
  ["server/src/core/WorldTickPolicy.ts", "AUTHORITATIVE_WORLD_TICK_KAPPA = 1000 as const"],
  ["server/src/core/WorldTickPolicy.ts", "AUTHORITATIVE_WORLD_CHUNK_SIZE = 64 as const"],
  ["backend/src/core/ast-interface-sync.ts", "syncBatchWithinTickBudget"],
  ["backend/src/core/integrity-checker.ts", "WATCHDOG_AST_SYNC_BUDGET_MS"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failed = true;
    console.error(`[vps-build-logic] missing required logic file: ${file}`);
  }
}

for (const [file, snippet] of requiredSnippets) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, "utf8");
  if (!content.includes(snippet)) {
    failed = true;
    console.error(`[vps-build-logic] ${file} missing required logic marker: ${snippet}`);
  }
}

const vpsDockerfile = existsSync("Dockerfile.vps")
  ? readFileSync("Dockerfile.vps", "utf8")
  : "";

if (vpsDockerfile.includes("mkdir -p client/dist && printf")) {
  failed = true;
  console.error("[vps-build-logic] Dockerfile.vps must fail closed instead of emitting a 3D-unavailable placeholder");
}

if (failed) {
  process.exit(1);
}

console.log("[vps-build-logic] source logic verification OK");
