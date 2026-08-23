import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  AUTHORITATIVE_WORLD_CHUNK_SIZE,
  AUTHORITATIVE_WORLD_HEARTBEAT_TICKS,
  AUTHORITATIVE_WORLD_TICK_KAPPA,
  AUTHORITATIVE_WORLD_TICK_MS,
  AUTHORITATIVE_WORLD_TICK_HZ,
  assertAuthoritativeWorldTickPolicy,
  isHeartbeatTick,
  worldTickToMs,
} from "./WorldTickPolicy.js";

// WorldThinShell: Guard validates the canonical thin shell and policy.
// Architecture:
//   - WorldTickThinShell: slim coordinator (server/src/core/are/)
//   - OuroborosTickSystem: handles 10-tick heartbeat cadence (server/src/core/are/)
//   - WorldTickPolicy: policy constants (server/src/core/)
// No WorldTick.ts - deprecated in favor of WorldTickThinShell architecture.

const here = dirname(fileURLToPath(import.meta.url));

// Candidate paths for WorldTickThinShell (canonical thin shell source)
const thinShellCandidates = [
  join(here, "are/WorldTickThinShell.ts"),     // canonical: server/src/core/are/
  join(here, "../are/WorldTickThinShell.ts"),  // fallback: from server/src/
];

// Candidate paths for OuroborosTickSystem (handles heartbeat cadence)
const ouroborosCandidates = [
  join(here, "are/OuroborosTickSystem.ts"),     // canonical: server/src/core/are/
  join(here, "../are/OuroborosTickSystem.ts"),  // fallback: from server/src/
];

let thinShellSource: string | null = null;
for (const candidate of thinShellCandidates) {
  if (existsSync(candidate)) {
    thinShellSource = readFileSync(candidate, "utf8");
    console.log(`[WorldTickPolicy.guard] resolved WorldTickThinShell from: ${candidate}`);
    break;
  }
}

if (!thinShellSource) {
  throw new Error("[WorldTickPolicy.guard] Cannot resolve WorldTickThinShell.ts from candidates: " + thinShellCandidates.join(", "));
}

let ouroborosSource: string | null = null;
for (const candidate of ouroborosCandidates) {
  if (existsSync(candidate)) {
    ouroborosSource = readFileSync(candidate, "utf8");
    console.log(`[WorldTickPolicy.guard] resolved OuroborosTickSystem from: ${candidate}`);
    break;
  }
}

// Validate WorldTickPolicy constants
assertAuthoritativeWorldTickPolicy();

// Validate thin shell has correct 10-Hz tick rate (100ms interval)
if (!thinShellSource.includes("TICK_INTERVAL_MS = 100")) {
  throw new Error(`WorldTickThinShell must define TICK_INTERVAL_MS = 100 (10-Hz)`);
}

if (!thinShellSource.includes("setInterval(() => this.runScheduledTick(), WorldTickThinShell.TICK_INTERVAL_MS)") && !thinShellSource.includes("setInterval(() => this.tick(), WorldTickThinShell.TICK_INTERVAL_MS)")) {
  throw new Error(`WorldTickThinShell must use setInterval with WorldTickThinShell.TICK_INTERVAL_MS`);
}

// Validate heartbeat cadence: OuroborosTickSystem handles % 10 === 0
if (ouroborosSource) {
  if (!ouroborosSource.includes(`% ${AUTHORITATIVE_WORLD_HEARTBEAT_TICKS} !== 0`)) {
    throw new Error(`OuroborosTickSystem must check heartbeat cadence: tick % ${AUTHORITATIVE_WORLD_HEARTBEAT_TICKS} !== 0`);
  }
} else {
  console.warn("[WorldTickPolicy.guard] OuroborosTickSystem not found - heartbeat cadence not validated");
}

// Validate time conversion drift detection
if (worldTickToMs(0) !== 0 || worldTickToMs(10) !== 1000) {
  throw new Error("WorldTick policy time conversion drift detected");
}

// Validate heartbeat helper
if (!isHeartbeatTick(10) || isHeartbeatTick(11)) {
  throw new Error("WorldTick heartbeat helper drift detected");
}

// Validate policy constants match expected values
if (AUTHORITATIVE_WORLD_TICK_MS !== 100) {
  throw new Error(`Policy must have AUTHORITATIVE_WORLD_TICK_MS=100, got ${AUTHORITATIVE_WORLD_TICK_MS}`);
}

if (AUTHORITATIVE_WORLD_TICK_HZ !== 10) {
  throw new Error(`Policy must have AUTHORITATIVE_WORLD_TICK_HZ=10, got ${AUTHORITATIVE_WORLD_TICK_HZ}`);
}

if (AUTHORITATIVE_WORLD_TICK_KAPPA !== 1000) {
  throw new Error(`Policy must have AUTHORITATIVE_WORLD_TICK_KAPPA=1000, got ${AUTHORITATIVE_WORLD_TICK_KAPPA}`);
}

if (AUTHORITATIVE_WORLD_CHUNK_SIZE !== 64) {
  throw new Error(`Policy must have AUTHORITATIVE_WORLD_CHUNK_SIZE=64, got ${AUTHORITATIVE_WORLD_CHUNK_SIZE}`);
}

console.log("[WorldTickPolicy.guard] WorldThinShell architecture validated - 10-Hz authoritative tick OK");
