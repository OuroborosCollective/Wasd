#!/usr/bin/env node
/**
 * Snapshot repo `game-data/` into `published-content/current/` and write `content-pack-manifest.json`.
 * Run from repo root after `pnpm run build` validation (or `pnpm exec tsx server/src/tools/validateContent.ts`).
 *
 * Server loads the pack when USE_PUBLISHED_CONTENT=1 or CONTENT_PACK_DIR points at the pack root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "game-data");
const dest = path.join(root, "published-content", "current");

if (!fs.existsSync(src)) {
  console.error("Missing game-data/ at repo root");
  process.exit(1);
}

const validate = spawnSync(
  "pnpm",
  ["exec", "tsx", "server/src/tools/validateContent.ts"],
  { cwd: root, stdio: "inherit", shell: true }
);
if (validate.status !== 0) {
  console.error("validateContent failed — fix errors before publishing");
  process.exit(validate.status ?? 1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true, force: true });

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "game-data",
  description: "Published content snapshot — optional runtime root when USE_PUBLISHED_CONTENT=1",
};
fs.writeFileSync(path.join(dest, "content-pack-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`Published content pack → ${dest}`);
console.log("Set USE_PUBLISHED_CONTENT=1 (or CONTENT_PACK_DIR to this path) and restart the server.");
