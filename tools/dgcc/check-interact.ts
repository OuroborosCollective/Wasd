#!/usr/bin/env node
/**
 * Ensures `GameConfig.interactDistance` matches `@wasd/shared` `INTERACT_DISTANCE`.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gameConfigPath = path.join(root, "server/src/config/GameConfig.ts");
const interactionPath = path.join(root, "packages/shared/src/utils/interaction.ts");

for (const p of [gameConfigPath, interactionPath]) {
  if (!fs.existsSync(p)) {
    console.error(`[check-interact] missing file: ${path.relative(root, p)}`);
    process.exit(1);
  }
}

const gameConfig = fs.readFileSync(gameConfigPath, "utf8");
const interaction = fs.readFileSync(interactionPath, "utf8");

const mGame = gameConfig.match(/interactDistance:\s*(\d+)/);
const mShared = interaction.match(/export const INTERACT_DISTANCE\s*=\s*(\d+)/);

if (!mGame || !mShared) {
  console.error("[check-interact] could not parse interactDistance / INTERACT_DISTANCE from sources.");
  process.exit(1);
}

const a = Number(mGame[1]);
const b = Number(mShared[1]);
if (a !== b) {
  console.error(`[check-interact] mismatch: GameConfig.interactDistance=${a} vs INTERACT_DISTANCE=${b}`);
  process.exit(1);
}

console.log(`[check-interact] OK (interact distance ${a})`);
