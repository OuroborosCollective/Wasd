import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  AUTHORITATIVE_WORLD_CHUNK_SIZE,
  AUTHORITATIVE_WORLD_HEARTBEAT_TICKS,
  AUTHORITATIVE_WORLD_TICK_KAPPA,
  AUTHORITATIVE_WORLD_TICK_MS,
  assertAuthoritativeWorldTickPolicy,
  isHeartbeatTick,
  worldTickToMs,
} from "./WorldTickPolicy.js";

// WorldThinShell: Guard resolves the canonical WorldTick source.
// Priority: canonical root world tick first, local path as legacy fallback.
// No symlinks, no copies - one true source for stateless determinism.
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, "../../../src/core/WorldTick.ts"),  // canonical root world tick
  join(here, "WorldTick.ts"),                      // legacy local fallback
];

let worldTickSource: string | null = null;
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    worldTickSource = readFileSync(candidate, "utf8");
    console.log(`[WorldTickPolicy.guard] resolved WorldTick from: ${candidate}`);
    break;
  }
}

if (!worldTickSource) {
  throw new Error("[WorldTickPolicy.guard] Cannot resolve WorldTick.ts from candidates: " + candidates.join(", "));
}

assertAuthoritativeWorldTickPolicy();

if (!worldTickSource.includes(`setInterval(() => this.tick(), ${AUTHORITATIVE_WORLD_TICK_MS})`)) {
  throw new Error(`WorldTick must run at ${AUTHORITATIVE_WORLD_TICK_MS}ms per authoritative tick`);
}

if (!worldTickSource.includes(`k: ${AUTHORITATIVE_WORLD_TICK_KAPPA}`)) {
  throw new Error(`WorldTick ARE payload must keep Kappa=${AUTHORITATIVE_WORLD_TICK_KAPPA}`);
}

if (!worldTickSource.includes(`chunk:${AUTHORITATIVE_WORLD_CHUNK_SIZE}`)) {
  throw new Error(`WorldTick deterministic seed must include chunk:${AUTHORITATIVE_WORLD_CHUNK_SIZE}`);
}

if (!worldTickSource.includes(`% ${AUTHORITATIVE_WORLD_HEARTBEAT_TICKS} === 0`)) {
  throw new Error(`WorldTick heartbeat cadence must stay every ${AUTHORITATIVE_WORLD_HEARTBEAT_TICKS} ticks`);
}

if (worldTickToMs(0) !== 0 || worldTickToMs(10) !== 1000) {
  throw new Error("WorldTick policy time conversion drift detected");
}

if (!isHeartbeatTick(10) || isHeartbeatTick(11)) {
  throw new Error("WorldTick heartbeat helper drift detected");
}

console.log("[WorldTickPolicy.guard] authoritative 10Hz WorldTick policy OK");
