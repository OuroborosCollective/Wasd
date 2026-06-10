# 1. OBJECTIVE

Establish the **Core Reality Alignment** foundation for Areloria's ARE (Axiomatic Recursive Engine) architecture. This initial phase creates the audit infrastructure and core type system that will enforce deterministic, integer-only simulation logic. The goal is to prevent architecture drift by making violations detectable and build-breaking.

**Problem Statement:** WorldTick.ts has grown into a "God Object" with 50+ direct domain imports (Combat, Inventory, NPC, Guild, Economy, Quest, Warfront, etc.). This creates tight coupling, nondeterminism risks (float positions in entity code), and conflicting spatial truth (5×5 vs 3×3 chunk grids).

---

# 2. CONTEXT SUMMARY

## Current State (Ist-Zustand)

| Component | Current Behavior | Problem |
|-----------|-----------------|---------|
| `WorldTick.ts` | 50+ direct imports of domain systems | Tight coupling, God Object anti-pattern |
| `ObserverEngine` (modules/observer) | `viewDistanceChunks = 2` → 5×5 grid | One truth |
| `WorldTick.SpatialBroadcastGrid` | 3×3 grid with inline `computeChunkKey` | Competing truth |
| `ChunkSystem.getActiveChunks()` | Returns `[]` (stub) | Non-functional |
| `ChunkSystem.setChunkActive()` | Empty method | Non-functional |
| `Kappa.ts` | Exists with `KAPPA=1000`, `kAdd/kSub/kMul/kDiv` | Good foundation |
| `AREGuard.assertNoFloats()` | Exists | Good foundation |
| `ARETick.ts` | Exists, basic tick prototype | Good foundation |
| `server/src/core/spatial/` | Does not exist | Needs creation |
| `docs/CORE_REALITY_ALIGNMENT_AUDIT.md` | Does not exist | Needs creation |
| `scripts/audit-core-reality-alignment.mjs` | Does not exist | Needs creation |
| `TickId` branded type | Does not exist | Needs creation |
| `StateHash` branded type | Does not exist | Needs creation |
| `MortonCode` | Does not exist | Needs creation |

## Key Files Impacted

- `server/src/core/WorldTick.ts` — Will be refactored in later phases
- `server/src/core/are/Kappa.ts` — Extended with branded types
- `server/src/core/are/AREGuard.ts` — Extended with additional guards
- `server/src/modules/observer/ObserverEngine.ts` — Will use UnifiedChunkContract
- `server/src/modules/world/ChunkSystem.ts` — Will implement UnifiedChunkContract

---

# 3. APPROACH OVERVIEW

This plan implements **Phase 0 (Audit Gate)** and **Phase 1 (Kappa Core Types)** of the 10-phase refactoring plan.

**Phase 0 — Audit Gate:** Create tooling to measure the current state (baseline "red") and make the audit part of CI guards going forward.

**Phase 1 — Kappa Core Types:** Establish the authoritative integer-only math kernel with branded types (`Kappa`, `TickId`, `StateHash`) and the `UnifiedChunkContract` that resolves the 5×5 vs 3×3 conflict.

**Strategy:** Incremental PRs. Each phase is self-contained and green before moving to the next. No big-bang refactoring.

---

# 4. IMPLEMENTATION STEPS

## Phase 0: Audit Gate

### Step 0.1 — Create `docs/CORE_REALITY_ALIGNMENT_AUDIT.md`

**Goal:** Document the audit criteria and current baseline findings.

**Method:** Create a comprehensive audit specification document.

**Reference:** `docs/`

Create `docs/CORE_REALITY_ALIGNMENT_AUDIT.md` with sections:
- Audit checklist (8 criteria)
- Current baseline findings (will be "red")
- Guard activation instructions
- Remediation guidance per violation type

**Audit Criteria:**
1. `WorldTick` direct domain imports count
2. `any`/`unknown` usage in Core modules
3. `Math.random`/`Date.now`/`performance.now` in Logic paths
4. Float positions in Entity/Chunk/Movement code
5. Chunk radius conflicts (5×5 vs 3×3)
6. Snapshot fields without server origin
7. Persistence calls in tick hot path
8. Empty stub methods in Core systems

---

### Step 0.2 — Create `scripts/audit-core-reality-alignment.mjs`

**Goal:** Automated audit script that can run in CI and fail builds.

**Method:** Write a Node.js script that checks each audit criterion programmatically.

**Reference:** `scripts/`

Create `scripts/audit-core-reality-alignment.mjs`:
```
Usage: node scripts/audit-core-reality-alignment.mjs [--fail]

Options:
  --fail    Exit with code 1 if any violations found (CI mode)
  --json    Output machine-readable JSON report
  --fix     Auto-fix some violations where possible
```

**Checks:**
1. Parse `WorldTick.ts` imports, count domain system imports
2. Grep `server/src/core/` for `any` and `unknown` types
3. Grep for `Math.random`, `Date.now`, `performance.now` excluding test/guard files
4. Grep for float position patterns in entity files
5. Compare `ObserverEngine.viewDistanceChunks` vs `SpatialBroadcastGrid.get3x3ChunkKeys`
6. Check snapshot composition for client-side field origins
7. Check tick loop for blocking persistence calls
8. List stub methods in ChunkSystem and similar

**Output format:**
```json
{
  "timestamp": "2026-06-10T00:13:10Z",
  "phase": "audit-gate",
  "results": {
    "worldtick_domain_imports": { "count": 14, "limit": 5, "status": "FAIL" },
    "any_unknown_in_core": { "count": 7, "limit": 0, "status": "FAIL" },
    ...
  },
  "overall": "FAIL",
  "baseline": true
}
```

---

### Step 0.3 — Add audit to `guard:all` in CI

**Goal:** Make audit part of the verification pipeline.

**Method:** Add script to existing CI configuration.

**Reference:** `.github/workflows/` or `package.json`

Add to `package.json` scripts:
```json
{
  "scripts": {
    "audit:core-alignment": "node scripts/audit-core-reality-alignment.mjs --fail"
  }
}
```

Add a new guard job in CI (or integrate into existing lint/verify job).

---

## Phase 1: Kappa Core Types

### Step 1.1 — Create Branded Types in `server/src/core/are/types.ts`

**Goal:** Establish type-level guarantees for `Kappa`, `TickId`, and `StateHash`.

**Method:** Create a new types module with branded/nominal types using TypeScript's intersection type pattern.

**Reference:** `server/src/core/are/`

Create `server/src/core/are/types.ts`:
```typescript
/**
 * ARELORIA CORE: Branded Types
 * 
 * Branded types prevent mixing values that semantically differ
 * even if they share the same underlying primitive type.
 */

import { KAPPA } from './Kappa';

// Kappa: Fixed-point integer representation (1 world unit = 1000 Kappa)
export type Kappa = number & { readonly __brand: "Kappa" };
export type KappaInt = number & { readonly __brand: "KappaInt" };

// TickId: Monotonically increasing tick counter
export type TickId = number & { readonly __brand: "TickId" };

// StateHash: SHA-256 derived hash string (64 hex chars)
export type StateHash = string & { readonly __brand: "StateHash" };

// ChunkCoord: Integer chunk coordinate
export type ChunkCoord = number & { readonly __brand: "ChunkCoord" };
export type ChunkKey = string & { readonly __brand: "ChunkKey" };

// Constructor functions with validation
export function createKappa(value: number): Kappa {
  if (!Number.isInteger(value)) {
    throw new Error(`[Kappa] Cannot create Kappa from non-integer: ${value}`);
  }
  return value as Kappa;
}

export function createTickId(value: number): TickId {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`[TickId] Invalid tick ID: ${value}`);
  }
  return value as TickId;
}

export function createStateHash(value: string): StateHash {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`[StateHash] Invalid hash format: ${value}`);
  }
  return value as StateHash;
}

export function createChunkCoord(value: number): ChunkCoord {
  if (!Number.isInteger(value)) {
    throw new Error(`[ChunkCoord] Cannot create from non-integer: ${value}`);
  }
  return value as ChunkCoord;
}
```

---

### Step 1.2 — Create `server/src/core/spatial/ChunkMath.ts`

**Goal:** Centralize chunk coordinate calculations with integer-only math.

**Method:** Extract and formalize the chunk math currently embedded in WorldTick and ObserverEngine.

**Reference:** `server/src/core/spatial/`

Create `server/src/core/spatial/ChunkMath.ts`:
```typescript
/**
 * ChunkMath - Deterministic Integer Chunk Calculations
 * 
 * All calculations use integer arithmetic only. No floats in canonical calculations.
 */

import { KAPPA } from '../are/Kappa';
import type { Kappa, ChunkCoord } from '../are/types';

export const CHUNK_SIZE_TILES = 64;
export const CHUNK_SIZE_KAPPA = CHUNK_SIZE_TILES * KAPPA; // 64000

/**
 * Convert world-unit Kappa position to tile coordinate.
 */
export function kappaToTile(kappa: Kappa): number {
  return Math.trunc(kappa / KAPPA);
}

/**
 * Convert tile coordinate to Kappa.
 */
export function tileToKappa(tile: number): Kappa {
  return (tile * KAPPA) as Kappa;
}

/**
 * Convert tile coordinate to chunk coordinate.
 */
export function tileToChunkCoord(tile: number): ChunkCoord {
  return Math.trunc(tile / CHUNK_SIZE_TILES) as ChunkCoord;
}

/**
 * Convert Kappa to chunk coordinate.
 */
export function kappaToChunkCoord(kappa: Kappa): ChunkCoord {
  return tileToChunkCoord(kappaToTile(kappa));
}

/**
 * Get chunk key string from chunk coordinates.
 */
export function getChunkKey(cx: ChunkCoord, cz: ChunkCoord): string {
  return `${cx}:${cz}`;
}

/**
 * Parse chunk key to coordinates.
 */
export function parseChunkKey(key: string): { cx: ChunkCoord; cz: ChunkCoord } {
  const [cx, cz] = key.split(':').map(Number);
  return {
    cx: cx as ChunkCoord,
    cz: cz as ChunkCoord,
  };
}

/**
 * Get all chunk keys within a radius.
 * @param centerCx Center chunk X
 * @param centerCz Center chunk Z  
 * @param radiusChunks Radius in chunks (e.g., 1 = 3×3, 2 = 5×5)
 */
export function getChunkKeysInRadius(
  centerCx: ChunkCoord,
  centerCz: ChunkCoord,
  radiusChunks: number
): string[] {
  const keys: string[] = [];
  for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
    for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
      const cx = (centerCx + dx) as ChunkCoord;
      const cz = (centerCz + dz) as ChunkCoord;
      keys.push(getChunkKey(cx, cz));
    }
  }
  return keys;
}

/**
 * Calculate Manhattan distance between two chunk coordinates.
 */
export function chunkDistance(cx1: ChunkCoord, cz1: ChunkCoord, cx2: ChunkCoord, cz2: ChunkCoord): number {
  return Math.abs(cx1 - cx2) + Math.abs(cz1 - cz2);
}
```

---

### Step 1.3 — Create `server/src/core/spatial/MortonCode.ts`

**Goal:** Provide O(1) spatial lookup using Z-order curve encoding.

**Method:** Implement Morton code encoding/decoding for efficient spatial hashing.

**Reference:** `server/src/core/spatial/`

Create `server/src/core/spatial/MortonCode.ts`:
```typescript
/**
 * MortonCode - Z-Order Curve Spatial Hashing
 * 
 * Encodes 2D coordinates into a single integer for O(1) spatial queries.
 * Useful for locality-preserving hashes in chunk/interest management.
 */

/**
 * Interleave bits of two 16-bit integers to create Morton code.
 * Each coordinate component should be in range [-32768, 32767].
 */
export function encodeMortonCode(x: number, y: number): number {
  let result = 0;
  for (let i = 0; i < 16; i++) {
    result |= ((x >> i) & 1) << (2 * i);
    result |= ((y >> i) & 1) << (2 * i + 1);
  }
  return result >>> 0; // Ensure unsigned
}

/**
 * Extract X coordinate from Morton code.
 */
export function decodeMortonCodeX(code: number): number {
  let x = 0;
  for (let i = 0; i < 16; i++) {
    x |= ((code >> (2 * i)) & 1) << i;
  }
  return x;
}

/**
 * Extract Y coordinate from Morton code.
 */
export function decodeMortonCodeY(code: number): number {
  let y = 0;
  for (let i = 0; i < 16; i++) {
    y |= ((code >> (2 * i + 1)) & 1) << i;
  }
  return y;
}

/**
 * Convert chunk coordinates to Morton code.
 */
export function chunkToMorton(cx: number, cy: number): number {
  // Shift to positive range first
  const sx = cx + 32768;
  const sy = cy + 32768;
  return encodeMortonCode(sx, sy);
}

/**
 * Convert Morton code to chunk coordinates.
 */
export function mortonToChunk(code: number): { cx: number; cy: number } {
  const sx = decodeMortonCodeX(code);
  const sy = decodeMortonCodeY(code);
  return {
    cx: sx - 32768,
    cy: sy - 32768,
  };
}
```

---

### Step 1.4 — Create `server/src/core/spatial/UnifiedChunkContract.ts`

**Goal:** Resolve the 5×5 vs 3×3 conflict by establishing a single source of truth.

**Method:** Define a contract interface that explicitly documents the different radii for simulation vs broadcast.

**Reference:** `server/src/core/spatial/`

Create `server/src/core/spatial/UnifiedChunkContract.ts`:
```typescript
/**
 * UnifiedChunkContract - Single Source of Truth for Chunk Geometry
 * 
 * ARCHITECTURE DECISION: Resolve conflicting radii:
 * - ObserverEngine used viewDistanceChunks=2 → 5×5 simulation/interest grid
 * - WorldTick.SpatialBroadcastGrid used 3×3 broadcast grid
 * 
 * Solution:
 * - simulationRadiusChunks = 2 → 5×5 for INTEREST MANAGEMENT
 * - broadcastRadiusChunks = 1 → 3×3 for CLIENT SNAPSHOTS
 * 
 * These are NOT conflicting - they serve different purposes:
 * - 5×5 = which chunks affect simulation/interest calculations
 * - 3×3 = which entities are sent to client in snapshot
 */

import { CHUNK_SIZE_TILES, CHUNK_SIZE_KAPPA } from './ChunkMath';

export interface UnifiedChunkContract {
  /** Chunk size in tiles (world units) */
  readonly chunkSizeTiles: 64;
  
  /** Chunk size in Kappa (fixed-point) */
  readonly chunkSizeKappa: 64000;
  
  /** 
   * Radius for simulation/interest management.
   * Entities in this range affect each other's simulation.
   * 2 chunks = 5×5 grid centered on observer
   */
  readonly simulationRadiusChunks: 2;
  
  /** 
   * Radius for client broadcast snapshots.
   * Only entities in this range are sent to client.
   * 1 chunk = 3×3 grid centered on observer
   */
  readonly broadcastRadiusChunks: 1;
  
  /** 
   * Number of chunks in simulation grid (one dimension).
   * simulationRadius 2 → 5 chunks (dx from -2 to +2)
   */
  readonly simulationGridSize: 5;
  
  /** 
   * Number of chunks in broadcast grid (one dimension).
   * broadcastRadius 1 → 3 chunks (dx from -1 to +1)
   */
  readonly broadcastGridSize: 3;
  
  /** 
   * Chunks after which a dormant chunk becomes inactive.
   * 0 = immediately dormant when no observers
   */
  readonly dormantAfterTicks: number;
}

export const UNIFIED_CHUNK_CONTRACT: UnifiedChunkContract = {
  chunkSizeTiles: 64,
  chunkSizeKappa: CHUNK_SIZE_KAPPA,
  simulationRadiusChunks: 2,
  broadcastRadiusChunks: 1,
  simulationGridSize: 5, // 2*2 + 1
  broadcastGridSize: 3, // 1*2 + 1
  dormantAfterTicks: 0, // Immediately dormant
} as const;

/**
 * Validate chunk coordinate is within bounds.
 */
export function assertValidChunkCoord(coord: number, operation: string): void {
  if (!Number.isInteger(coord)) {
    throw new Error(`[UnifiedChunkContract] Non-integer chunk coord in ${operation}: ${coord}`);
  }
  // Reasonable bounds check (-32768 to 32767 for Morton code compatibility)
  if (coord < -32768 || coord > 32767) {
    throw new Error(`[UnifiedChunkContract] Chunk coord out of Morton range in ${operation}: ${coord}`);
  }
}
```

---

### Step 1.5 — Create `server/src/core/spatial/InterestGrid.ts`

**Goal:** Replace ObserverEngine's inline logic with a proper spatial interest management system.

**Method:** Implement an InterestGrid class that tracks which entities observe which chunks.

**Reference:** `server/src/core/spatial/`

Create `server/src/core/spatial/InterestGrid.ts`:
```typescript
/**
 * InterestGrid - Manages observer-to-chunk interest mappings
 * 
 * Tracks which chunks each observer (player) is interested in.
 * Uses UnifiedChunkContract for radius calculations.
 */

import { UNIFIED_CHUNK_CONTRACT, assertValidChunkCoord } from './UnifiedChunkContract';
import { tileToChunkCoord, getChunkKey } from './ChunkMath';
import type { ChunkCoord } from '../are/types';

export interface Observer {
  readonly id: string;
  readonly tileX: number;
  readonly tileY: number; // Using Y as Z (world tile)
}

export class InterestGrid {
  /** Map of observer ID -> Set of chunk keys they observe */
  private observerToChunks = new Map<string, Set<string>>();
  
  /** Map of chunk key -> Set of observer IDs interested in it */
  private chunkToObservers = new Map<string, Set<string>>();
  
  /** All registered observers */
  private observers = new Map<string, Observer>();

  /**
   * Register an observer at a position.
   */
  register(observer: Observer): void {
    this.observers.set(observer.id, observer);
    this.updateInterest(observer.id, observer.tileX, observer.tileY);
  }

  /**
   * Unregister an observer.
   */
  unregister(observerId: string): void {
    const oldChunks = this.observerToChunks.get(observerId);
    if (oldChunks) {
      for (const chunkKey of oldChunks) {
        const observers = this.chunkToObservers.get(chunkKey);
        if (observers) {
          observers.delete(observerId);
          if (observers.size === 0) {
            this.chunkToObservers.delete(chunkKey);
          }
        }
      }
    }
    this.observerToChunks.delete(observerId);
    this.observers.delete(observerId);
  }

  /**
   * Update observer position and recalculate interest.
   */
  updatePosition(observerId: string, tileX: number, tileY: number): void {
    if (!this.observers.has(observerId)) {
      return; // Not registered
    }
    const observer = this.observers.get(observerId)!;
    observer = { ...observer, tileX, tileY };
    this.observers.set(observerId, observer);
    this.updateInterest(observerId, tileX, tileY);
  }

  /**
   * Get all observers interested in a specific chunk.
   */
  getObserversInChunk(chunkKey: string): string[] {
    const observers = this.chunkToObservers.get(chunkKey);
    return observers ? Array.from(observers) : [];
  }

  /**
   * Get all chunks an observer is interested in.
   */
  getObservedChunks(observerId: string): string[] {
    const chunks = this.observerToChunks.get(observerId);
    return chunks ? Array.from(chunks) : [];
  }

  /**
   * Get all unique chunk keys that have any observers.
   */
  getActiveChunkKeys(): string[] {
    return Array.from(this.chunkToObservers.keys());
  }

  private updateInterest(observerId: string, tileX: number, tileY: number): void {
    const { simulationRadiusChunks } = UNIFIED_CHUNK_CONTRACT;
    
    const cx = tileToChunkCoord(tileX);
    const cy = tileToChunkCoord(tileY);
    
    assertValidChunkCoord(cx, 'InterestGrid.updateInterest');
    assertValidChunkCoord(cy, 'InterestGrid.updateInterest');
    
    // Calculate new interest set
    const newChunks = new Set<string>();
    for (let dx = -simulationRadiusChunks; dx <= simulationRadiusChunks; dx++) {
      for (let dy = -simulationRadiusChunks; dy <= simulationRadiusChunks; dy++) {
        const nc = (cx + dx) as ChunkCoord;
        const ny = (cy + dy) as ChunkCoord;
        newChunks.add(getChunkKey(nc, ny));
      }
    }
    
    // Diff against old interest
    const oldChunks = this.observerToChunks.get(observerId) ?? new Set();
    
    // Remove from chunks no longer observed
    for (const chunkKey of oldChunks) {
      if (!newChunks.has(chunkKey)) {
        const observers = this.chunkToObservers.get(chunkKey);
        if (observers) {
          observers.delete(observerId);
        }
      }
    }
    
    // Add to new chunks
    for (const chunkKey of newChunks) {
      if (!this.chunkToObservers.has(chunkKey)) {
        this.chunkToObservers.set(chunkKey, new Set());
      }
      this.chunkToObservers.get(chunkKey)!.add(observerId);
    }
    
    this.observerToChunks.set(observerId, newChunks);
  }
}
```

---

### Step 1.6 — Create `server/src/core/spatial/ObservedChunkSet.ts`

**Goal:** Provide efficient observed-chunk tracking with delta computation.

**Method:** Track observed chunks per observer and compute deltas between ticks.

**Reference:** `server/src/core/spatial/`

Create `server/src/core/spatial/ObservedChunkSet.ts`:
```typescript
/**
 * ObservedChunkSet - Tracks observed chunks with delta support
 * 
 * Efficiently tracks which chunks are observed by which entities
 * and computes enter/exit deltas between snapshots.
 */

import { UNIFIED_CHUNK_CONTRACT } from './UnifiedChunkContract';
import { tileToChunkCoord, getChunkKey } from './ChunkMath';
import type { ChunkCoord } from '../are/types';

export interface ChunkDelta {
  readonly entered: readonly string[];
  readonly exited: readonly string[];
}

export class ObservedChunkSet {
  private observerChunks = new Map<string, ReadonlySet<string>>();

  /**
   * Update observed chunks for an observer.
   * Returns the delta (entered/exited chunks) since last update.
   */
  update(tileX: number, tileY: number): ChunkDelta {
    const { simulationRadiusChunks } = UNIFIED_CHUNK_CONTRACT;
    
    const cx = tileToChunkCoord(tileX);
    const cy = tileToChunkCoord(tileY);
    
    // Calculate new chunk set
    const newChunks = new Set<string>();
    for (let dx = -simulationRadiusChunks; dx <= simulationRadiusChunks; dx++) {
      for (let dy = -simulationRadiusChunks; dy <= simulationRadiusChunks; dy++) {
        const ncx = (cx + dx) as ChunkCoord;
        const ncy = (cy + dy) as ChunkCoord;
        newChunks.add(getChunkKey(ncx, ncy));
      }
    }
    
    const prevChunks = this.observerChunks.get('current') ?? new Set();
    
    // Compute delta
    const entered: string[] = [];
    const exited: string[] = [];
    
    for (const chunk of newChunks) {
      if (!prevChunks.has(chunk)) {
        entered.push(chunk);
      }
    }
    
    for (const chunk of prevChunks) {
      if (!newChunks.has(chunk)) {
        exited.push(chunk);
      }
    }
    
    this.observerChunks.set('current', newChunks);
    
    return { entered: Object.freeze(entered), exited: Object.freeze(exited) };
  }

  /**
   * Get current observed chunks.
   */
  getCurrent(): ReadonlySet<string> {
    return this.observerChunks.get('current') ?? new Set();
  }

  /**
   * Reset tracking.
   */
  reset(): void {
    this.observerChunks.clear();
  }
}
```

---

### Step 1.7 — Create `server/src/core/spatial/index.ts`

**Goal:** Provide a clean public API for the spatial module.

**Method:** Re-export all public types and functions.

**Reference:** `server/src/core/spatial/`

Create `server/src/core/spatial/index.ts`:
```typescript
/**
 * CORE SPATIAL MODULE
 * 
 * Unified chunk geometry and interest management.
 */

export { ChunkMath, CHUNK_SIZE_TILES, CHUNK_SIZE_KAPPA } from './ChunkMath';
export {
  kappaToTile,
  tileToKappa,
  tileToChunkCoord,
  kappaToChunkCoord,
  getChunkKey,
  parseChunkKey,
  getChunkKeysInRadius,
  chunkDistance,
} from './ChunkMath';

export { encodeMortonCode, decodeMortonCodeX, decodeMortonCodeY, chunkToMorton, mortonToChunk } from './MortonCode';

export { UnifiedChunkContract, UNIFIED_CHUNK_CONTRACT, assertValidChunkCoord } from './UnifiedChunkContract';

export { InterestGrid, type Observer } from './InterestGrid';

export { ObservedChunkSet, type ChunkDelta } from './ObservedChunkSet';
```

---

### Step 1.8 — Create `server/src/core/are/DeterministicPrng.ts`

**Goal:** Provide a deterministic PRNG for simulation that can be replayed.

**Method:** Implement a seeded PRNG using a simple linear congruential generator (LCG) that is deterministic and reproducible.

**Reference:** `server/src/core/are/`

Create `server/src/core/are/DeterministicPrng.ts`:
```typescript
/**
 * DeterministicPRNG - Seedable Pseudo-Random Number Generator
 * 
 * CRITICAL: This PRNG is for SIMULATION logic only.
 * All random values in the authoritative core MUST use this PRNG
 * with a seed derived from the deterministic tick state.
 * 
 * Uses a simple LCG that is fast and fully deterministic:
 *   next = (a * current + c) mod m
 * 
 * Where a, c, m are chosen for good statistical properties.
 */

export interface DeterministicPrng {
  /** Generate next random integer in range [0, 2^32) */
  nextInt(): number;
  
  /** Generate random float in range [0, 1) */
  nextFloat(): number;
  
  /** Generate random integer in range [min, max] (inclusive) */
  nextIntRange(min: number, max: number): number;
  
  /** Get current state (for replay) */
  getState(): bigint;
  
  /** Clone the PRNG with current state */
  clone(): DeterministicPrng;
}

// LCG parameters from "Numerical Recipes"
const LCG_A = 1664525n;
const LCG_C = 1013904223n;
const LCG_M = 4294967296n; // 2^32

export class LcgPrng implements DeterministicPrng {
  private state: bigint;

  constructor(seed: number | bigint) {
    this.state = typeof seed === 'number' ? BigInt(seed) : seed;
  }

  nextInt(): number {
    this.state = (LCG_A * this.state + LCG_C) % LCG_M;
    return Number(this.state);
  }

  nextFloat(): number {
    return this.nextInt() / 4294967296;
  }

  nextIntRange(min: number, max: number): number {
    if (min > max) {
      throw new Error(`[DeterministicPrng] min (${min}) > max (${max})`);
    }
    const range = max - min + 1;
    return min + (this.nextInt() % range);
  }

  getState(): bigint {
    return this.state;
  }

  clone(): DeterministicPrng {
    const clone = new LcgPrng(0);
    clone.state = this.state;
    return clone;
  }
}

/**
 * Create a PRNG with a deterministic seed.
 * The seed should be derived from tick state (tickId, entity positions, etc.)
 */
export function createDeterministicPrng(seed: number): DeterministicPrng {
  return new LcgPrng(seed);
}
```

---

### Step 1.9 — Create `server/src/core/are/StateHash.ts`

**Goal:** Establish `StateHash` as a proper branded type with validation.

**Method:** Create a StateHash module with generation and verification functions.

**Reference:** `server/src/core/are/`

Create `server/src/core/are/StateHash.ts`:
```typescript
/**
 * StateHash - Deterministic State Fingerprinting
 * 
 * Generates reproducible hashes of canonical game state.
 * Used for:
 * - Replay verification
 * - Divergence detection
 * - State comparison
 * 
 * Hash is computed over a canonical serialization of state,
 * ensuring same input always produces same output.
 */

import type { StateHash } from './types';

/**
 * GENESIS_STATE_HASH - Initial state before any ticks
 */
export const GENESIS_STATE_HASH: StateHash = '0'.repeat(64) as StateHash;

/**
 * GENESIS_PREVIOUS_HASH - Sentinel value for first tick
 */
export const GENESIS_PREVIOUS_HASH = 'GENESIS';

/**
 * Create a StateHash from a 64-character hex string.
 * Validates format before branding.
 */
export function createStateHash(hex: string): StateHash {
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(`[StateHash] Invalid hash format: ${hex.substring(0, 16)}... (expected 64 hex chars)`);
  }
  return hex as StateHash;
}

/**
 * Verify a value is a valid StateHash.
 */
export function isStateHash(value: unknown): value is StateHash {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

/**
 * Compare two state hashes for equality.
 * Constant-time comparison to prevent timing attacks on hash values.
 */
export function stateHashEquals(a: StateHash, b: StateHash): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

---

### Step 1.10 — Create `server/src/core/are/types.ts` (if not done in Step 1.1)

**Goal:** Consolidate all branded types in one place.

**Method:** Ensure `types.ts` exports all branded types used by the core.

**Reference:** `server/src/core/are/types.ts`

(Already planned in Step 1.1 - ensure it includes all types)

---

### Step 1.11 — Create Tests for New Modules

**Goal:** Ensure core spatial and type modules have test coverage.

**Method:** Create unit tests for each new module.

**Reference:** `server/src/core/are/__tests__/` and `server/src/core/spatial/__tests__/`

Create test files:
- `server/src/core/spatial/__tests__/ChunkMath.test.ts`
- `server/src/core/spatial/__tests__/MortonCode.test.ts`
- `server/src/core/spatial/__tests__/UnifiedChunkContract.test.ts`
- `server/src/core/spatial/__tests__/InterestGrid.test.ts`
- `server/src/core/spatial/__tests__/ObservedChunkSet.test.ts`
- `server/src/core/are/__tests__/DeterministicPrng.test.ts`
- `server/src/core/are/__tests__/StateHash.test.ts`
- `server/src/core/are/__tests__/types.test.ts`

---

# 5. TESTING AND VALIDATION

## Acceptance Criteria

After Phase 0 and Phase 1 are complete, the following must be true:

### Phase 0 (Audit Gate)
- [ ] `docs/CORE_REALITY_ALIGNMENT_AUDIT.md` exists with full audit specification
- [ ] `scripts/audit-core-reality-alignment.mjs` runs and produces JSON report
- [ ] Audit script exits with code 1 in `--fail` mode when violations exist
- [ ] Audit is added to CI verification (guard:all)

### Phase 1 (Kappa Core Types)
- [ ] `server/src/core/are/types.ts` exports `Kappa`, `TickId`, `StateHash`, `ChunkCoord`, `ChunkKey` branded types
- [ ] `server/src/core/spatial/ChunkMath.ts` provides all chunk coordinate functions
- [ ] `server/src/core/spatial/MortonCode.ts` provides Z-order curve encoding
- [ ] `server/src/core/spatial/UnifiedChunkContract.ts` defines 5×5 simulation / 3×3 broadcast radii
- [ ] `server/src/core/spatial/InterestGrid.ts` manages observer-to-chunk mappings
- [ ] `server/src/core/spatial/ObservedChunkSet.ts` tracks chunk deltas
- [ ] `server/src/core/are/DeterministicPrng.ts` provides seeded LCG PRNG
- [ ] `server/src/core/are/StateHash.ts` provides hash validation
- [ ] All new modules have unit tests with >80% coverage
- [ ] `pnpm run validate --prefix server` passes (no lint errors)
- [ ] `pnpm run ci:verify` passes (unit tests pass)

## Verification Commands

```bash
# Run the audit
node scripts/audit-core-reality-alignment.mjs --fail

# Run unit tests
pnpm run ci:verify

# Validate content (lint)
pnpm run validate --prefix server

# Check coverage
npx vitest run --coverage
```

## Expected Baseline State (Before Fixes)

Initially, the audit will show:
- `worldtick_domain_imports`: ~14 violations (limit: 5)
- `any_unknown_in_core`: >0 violations (limit: 0)
- `float_positions_in_core`: >0 violations (limit: 0)
- `chunk_radius_conflicts`: 1 conflict (ObserverEngine 5×5 vs SpatialBroadcastGrid 3×3)

After Phase 1, the chunk radius conflict is resolved via `UnifiedChunkContract`, but other violations remain for later phases.

---

## Next Phases Preview (Not in Scope)

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| Phase 2 | TickSystemRegistry + Pipeline | `TickSystem` interface, registry pattern |
| Phase 3 | Movement out of WorldTick | `MovementTickSystem`, spatial decoupling |
| Phase 4 | Spatial Observer decoupling | Replace inline spatial logic with `InterestGrid` |
| Phase 5 | Resource Economy out | `ResourceEconomyTickSystem` |
| Phase 6 | NPC/Memory/Rumor out | `NpcMemoryRumorTickSystem` |
| Phase 7 | Combat out | `CombatTickSystem` |
| Phase 8 | Snapshot Composer centralize | `SnapshotComposer` |
| Phase 9 | Persistence Write-Behind | `WriteBehindPersistenceQueue` |
| Phase 10 | WorldTick thin shell | Only scheduler + registry + buffer |
