# Core Reality Alignment Audit

## Overview

This document defines the audit criteria and baseline findings for the **Core Reality Alignment** initiative in Areloria's ARE (Axiomatic Recursive Engine) architecture.

The goal is to establish deterministic, integer-only simulation logic that prevents architecture drift by making violations detectable and build-breaking.

---

## Audit Checklist (8 Criteria)

| # | Criterion | Limit | Description |
|---|-----------|-------|-------------|
| 1 | `WorldTick` direct domain imports | ≤ 5 | Count of domain system imports in WorldTick.ts |
| 2 | `any`/`unknown` in Core modules | 0 | Count of `any` or `unknown` type usages in `server/src/core/` |
| 3 | Non-deterministic APIs in Logic paths | 0 | `Math.random`, `Date.now`, `performance.now` in tick hot path |
| 4 | Float positions in Entity/Chunk/Movement | 0 | Floating-point position values in core spatial code |
| 5 | Chunk radius conflicts | 0 | Conflicting chunk visibility radii (e.g., 5×5 vs 3×3) |
| 6 | Snapshot fields without server origin | 0 | Client-side computed fields in authoritative snapshots |
| 7 | Persistence calls in tick hot path | 0 | Blocking I/O in the simulation tick loop |
| 8 | Empty stub methods in Core systems | 0 | Non-functional stub methods that return empty values |

---

## Current Baseline Findings (Red State)

> ⚠️ **Status: VIOLATIONS DETECTED** — This is the baseline state before remediation.

### 1. WorldTick Direct Domain Imports

**Current:** 14+ domain system imports (see `server/src/core/WorldTick.ts` lines 1-49)
**Limit:** 5
**Status:** ❌ FAIL

Domain imports detected:
- `GLBRegistry`, `ChunkSystem`, `ObserverEngine`, `PlayerSystem`
- `CombatSystem`, `CombatService`, `InventorySystem`, `inventoryDirector`
- `NPCSystem`, `GuildSystem`, `EconomySystem`, `QuestEngine`
- `WorldSystem`, `PersistenceManager`, `WarfrontSystem`, etc.

**Remediation:** Phase 2-10 of the refactoring plan will extract these into separate tick systems.

---

### 2. `any`/`unknown` in Core Modules

**Current:** > 0 violations
**Limit:** 0
**Status:** ❌ FAIL

Typical patterns:
- `data?: any` in `ChunkSystem.Chunk` interface
- Untyped payload handlers

**Remediation:** Replace with properly typed interfaces. Use branded types for chunk keys, entity IDs, etc.

---

### 3. Non-Deterministic APIs in Logic Paths

**Current:** Some usage detected
**Limit:** 0 in tick hot path
**Status:** ⚠️ PARTIAL

The `AREGuard` class protects against `Math.random` and `Date.now` at runtime, but:
- Protection is runtime-only (not compile-time)
- Some code paths may bypass guards

**Remediation:** Use `DeterministicPrng` for all simulation randomness. See `server/src/core/are/DeterministicPrng.ts`.

---

### 4. Float Positions in Entity/Chunk/Movement Code

**Current:** Position values may be floats in some entity code
**Limit:** 0
**Status:** ❌ FAIL

The ARE uses `Kappa` (fixed-point integer) for positions, but not all code has been migrated.

**Remediation:** Use `Kappa` branded type for all position values. See `server/src/core/are/types.ts`.

---

### 5. Chunk Radius Conflicts

**Current:** 1 conflict detected
**Limit:** 0
**Status:** ❌ FAIL

**Conflict Details:**
| Component | Radius | Grid Size | Source |
|-----------|--------|-----------|--------|
| `ObserverEngine.viewDistanceChunks` | 2 | 5×5 | `server/src/modules/observer/ObserverEngine.ts:3` |
| `SpatialBroadcastGrid.get3x3ChunkKeys` | 1 | 3×3 | `server/src/core/WorldTick.ts:142-154` |

**Remediation:** Use `UnifiedChunkContract` to establish single source of truth for chunk radii.

---

### 6. Snapshot Fields Without Server Origin

**Current:** Under investigation
**Limit:** 0
**Status:** ⚠️ PARTIAL

**Remediation:** All snapshot fields must be server-computed. No client-side derived values.

---

### 7. Persistence Calls in Tick Hot Path

**Current:** Under investigation
**Limit:** 0 blocking calls
**Status:** ⚠️ PARTIAL

**Remediation:** Use write-behind persistence queue. Persistence should not block simulation tick.

---

### 8. Empty Stub Methods in Core Systems

**Current:** 2 stubs detected
**Limit:** 0
**Status:** ❌ FAIL

**Stub Methods:**
| Class | Method | Return | Location |
|-------|--------|--------|----------|
| `ChunkSystem` | `getActiveChunks()` | `[]` | `server/src/modules/world/ChunkSystem.ts:81` |
| `ChunkSystem` | `setChunkActive()` | `void` | `server/src/modules/world/ChunkSystem.ts:82` |

**Remediation:** Implement or remove stub methods.

---

## Guard Activation

### Running the Audit

```bash
# Run audit with JSON output
node scripts/audit-core-reality-alignment.mjs --json

# Run audit in CI mode (exit 1 on violations)
node scripts/audit-core-reality-alignment.mjs --fail

# Run audit in fix mode (auto-fix where possible)
node scripts/audit-core-reality-alignment.mjs --fix
```

### CI Integration

Add to `guard:all` in `package.json`:

```json
{
  "scripts": {
    "audit:core-alignment": "node scripts/audit-core-reality-alignment.mjs --fail",
    "guard:all": "pnpm guard:monorepo && pnpm guard:architecture && pnpm guard:worldtick && pnpm guard:entrypoints && pnpm audit:core-alignment"
  }
}
```

---

## Remediation Guidance

### By Violation Type

| Violation Type | Primary Fix | Files to Modify |
|----------------|-------------|-----------------|
| Too many imports | Extract tick systems | `WorldTick.ts` |
| `any`/`unknown` | Add branded types | `ChunkSystem.ts`, `WorldTick.ts` |
| Non-deterministic APIs | Use `DeterministicPrng` | Various |
| Float positions | Use `Kappa` type | Entity/Movement code |
| Chunk radius conflict | `UnifiedChunkContract` | `ObserverEngine.ts`, `WorldTick.ts` |
| Client-computed fields | Server-only snapshots | Snapshot composition |
| Blocking persistence | Write-behind queue | Tick loop |
| Empty stubs | Implement or remove | `ChunkSystem.ts` |

---

## Phase Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 0 | Audit Gate | ✅ In Progress |
| Phase 1 | Kappa Core Types | 📋 Planned |
| Phase 2 | TickSystemRegistry + Pipeline | 📋 Planned |
| Phase 3 | Movement out of WorldTick | 📋 Planned |
| Phase 4 | Spatial Observer decoupling | 📋 Planned |
| Phase 5 | Resource Economy out | 📋 Planned |
| Phase 6 | NPC/Memory/Rumor out | 📋 Planned |
| Phase 7 | Combat out | 📋 Planned |
| Phase 8 | Snapshot Composer centralize | 📋 Planned |
| Phase 9 | Persistence Write-Behind | 📋 Planned |
| Phase 10 | WorldTick thin shell | 📋 Planned |

---

## References

- ARE (Axiomatic Recursive Engine): `server/src/core/are/`
- Kappa Math Kernel: `server/src/core/are/Kappa.ts`
- ARE Guard: `server/src/core/are/AREGuard.ts`
- WorldTick: `server/src/core/WorldTick.ts`
- ObserverEngine: `server/src/modules/observer/ObserverEngine.ts`
- ChunkSystem: `server/src/modules/world/ChunkSystem.ts`