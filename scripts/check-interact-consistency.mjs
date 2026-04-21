#!/usr/bin/env node
/**
 * Ensures shared client–server interact radius matches server GameConfig.
 * Run from repo root: node scripts/check-interact-consistency.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readNumberFromFile(filePath, patterns) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return NaN;
}

const gameConfigPath = path.join(root, "server/src/config/GameConfig.ts");
const sharedPath = path.join(root, "shared/interaction.ts");

const serverDist = readNumberFromFile(gameConfigPath, [/interactDistance:\s*(\d+)/]);
const sharedDist = readNumberFromFile(sharedPath, [/INTERACT_DISTANCE\s*=\s*(\d+)/]);

if (!Number.isFinite(serverDist) || !Number.isFinite(sharedDist)) {
  console.error("[check-interact] Could not parse distances.", { serverDist, sharedDist });
  process.exit(1);
}

if (serverDist !== sharedDist) {
  console.error(
    `[check-interact] Mismatch: GameConfig.interactDistance=${serverDist} vs shared INTERACT_DISTANCE=${sharedDist}. Align server/src/config/GameConfig.ts and shared/interaction.ts.`
  );
  process.exit(1);
}

console.log(`[check-interact] OK interactDistance === INTERACT_DISTANCE (${serverDist})`);
