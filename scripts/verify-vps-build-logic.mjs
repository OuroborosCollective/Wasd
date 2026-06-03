import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "engine/src/determinism/tickPolicy.ts",
  "server/src/core/WorldTickPolicy.ts",
  "server/src/core/WorldTickPolicy.guard.ts",
  "backend/src/core/ast-interface-sync.ts",
  "backend/src/core/integrity-checker.ts",
  "packages/core-logic/package.json",
  "packages/shared/package.json",
];

const requiredSnippets = [
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

if (failed) {
  process.exit(1);
}

console.log("[vps-build-logic] source logic verification OK");
