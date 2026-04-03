#!/usr/bin/env node
/**
 * Copies repo-root world-assets/ → client/public/world-assets/
 * so Vite serves them at /world-assets/... without manual JSON or duplicate edits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "world-assets");
const dest = path.join(root, "client", "public", "world-assets");

if (!fs.existsSync(src)) {
  fs.mkdirSync(src, { recursive: true });
  console.log("[sync-world-assets] Created empty world-assets/ — add GLBs under characters/, buildings/, etc.");
  process.exit(0);
}

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

rmrf(dest);
fs.cpSync(src, dest, { recursive: true });
console.log(`[sync-world-assets] ${src} → ${dest}`);
