/**
 * VERIFY CLIENT ENTRYPOINTS
 * 
 * Guards the real client source truth: apps/client-2d is source, /2d is route only.
 * No root-level 2d/ source directory exists.
 * 
 * @usage pnpm guard:entrypoints
 */

import { existsSync } from "node:fs";

const requiredSourcePaths = [
  "apps/client-2d/package.json",
  "apps/client-2d/index.html",
  "apps/client-2d/src/main.tsx",
  "server/src/core/ServerBootstrap.ts",
  "Dockerfile.vps",
];

const forbiddenSourceAssumptions = [
  "2d/package.json",
  "2d/index.html",
  "src/2d/index.html",
];

let hasError = false;

for (const path of requiredSourcePaths) {
  if (!existsSync(path)) {
    console.error(`[entrypoints] missing required path: ${path}`);
    hasError = true;
  } else {
    console.log(`[entrypoints] ✓ ${path}`);
  }
}

for (const path of forbiddenSourceAssumptions) {
  if (existsSync(path)) {
    console.error(`[entrypoints] ERROR: forbidden fake 2d source path exists: ${path}`);
    hasError = true;
  } else {
    console.log(`[entrypoints] ✓ no fake 2d source at ${path}`);
  }
}

if (hasError) {
  console.error("[entrypoints] FAILED: Client entrypoint contract violated");
  process.exit(1);
}

console.log("[entrypoints] OK: apps/client-2d is source, /2d is route only.");