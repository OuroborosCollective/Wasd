#!/usr/bin/env node
/**
 * Source of truth: repo-root `world-assets/` (large GLB tree, optional in git).
 *
 * Copies into:
 * 1) `client/public/world-assets/` — legacy Vite path `/world-assets/*` in dev
 * 2) `client/public/assets/models/world-assets/` — bundled with client dist as `/assets/models/world-assets/*`
 *
 * Run automatically via client `predev` / `prebuild`, or: `node scripts/sync-world-assets.mjs`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "world-assets");
const destLegacy = path.join(root, "client", "public", "world-assets");
const destModels = path.join(root, "client", "public", "assets", "models", "world-assets");

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyTree() {
  rmrf(destLegacy);
  rmrf(destModels);
  if (!fs.existsSync(src)) {
    fs.mkdirSync(src, { recursive: true });
    console.log(
      "[sync-world-assets] Created empty world-assets/ — add .glb under characters/, buildings/, props/, …"
    );
    return;
  }
  fs.cpSync(src, destLegacy, { recursive: true });
  fs.cpSync(src, destModels, { recursive: true });
  console.log(`[sync-world-assets] ${src} → ${destLegacy}`);
  console.log(`[sync-world-assets] ${src} → ${destModels}`);
}

copyTree();
