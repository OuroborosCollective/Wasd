#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), 'server/src/core/WorldTick.ts');
let source = readFileSync(file, 'utf8');

const importNeedle = 'import { PlaytesterJsonlLogger } from "../modules/playtester/PlaytesterJsonlLogger.js";';
const importPatch = `${importNeedle}\nimport { createWorldTickTimeAdapter } from "./WorldTickTimeAdapter.js";`;

if (!source.includes('createWorldTickTimeAdapter')) {
  if (!source.includes(importNeedle)) {
    throw new Error(`Could not find import anchor in ${file}`);
  }
  source = source.replace(importNeedle, importPatch);
}

const fieldNeedle = '  private tickCount = 0;';
const fieldPatch = `${fieldNeedle}\n  private readonly time = createWorldTickTimeAdapter(() => this.tickCount);`;

if (!source.includes('private readonly time = createWorldTickTimeAdapter')) {
  if (!source.includes(fieldNeedle)) {
    throw new Error(`Could not find tickCount field anchor in ${file}`);
  }
  source = source.replace(fieldNeedle, fieldPatch);
}

const cooldownNeedle = 'const checkCooldown = (cooldownMs: number) => { const cooldownTicks = Math.max(1, Math.ceil(cooldownMs / 100)); const pTimes = this.lastActionTimes.get(charName) || {}; const last = pTimes["general"] || 0; if (nowTick - last < cooldownTicks) return false; pTimes["general"] = nowTick; this.lastActionTimes.set(charName, pTimes); return true; };';
const cooldownPatch = 'const checkCooldown = (cooldownMs: number) => { const cooldownTicks = this.time.cooldownTicks(cooldownMs); const pTimes = this.lastActionTimes.get(charName) || {}; const last = pTimes["general"] || 0; if (nowTick - last < cooldownTicks) return false; pTimes["general"] = nowTick; this.lastActionTimes.set(charName, pTimes); return true; };';

if (source.includes(cooldownNeedle)) {
  source = source.replace(cooldownNeedle, cooldownPatch);
} else if (!source.includes('this.time.cooldownTicks(cooldownMs)')) {
  throw new Error(`Could not find cooldown conversion anchor in ${file}`);
}

writeFileSync(file, source);
console.log('Patched WorldTick.ts to use WorldTickTimeAdapter for player cooldown ticks.');
