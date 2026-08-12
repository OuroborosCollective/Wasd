# Chunk / Kappa / Discovery Contract Audit (#2466)

**Date:** 2026-08-11
**Scope:** CloudCraft integration slice #2466 — normalize chunk, Kappa, and discovery unit contracts before deeper donor transfer.

## 1. Inventory: active 16/64-tile chunk assumptions

### 64-tile call-sites (authoritative runtime chunk size)

| File | Constant | Role |
|------|----------|------|
| `server/src/core/spatial/ChunkMath.ts` | `CHUNK_SIZE_TILES = 64` | Centralized chunk math (integer-only, deterministic) |
| `server/src/config/GameConfig.ts` | `chunkSize: 64` | Game config default |
| `server/src/modules/guild/TerritoryControl.ts` | `CHUNK_SIZE = 64` | Guild territory |
| `server/src/modules/world/ChunkSystem.ts` | `chunkSize` (default 64) | World chunk system |
| `server/src/modules/world/TerrainGenerator.ts` | `chunkSize: 64` | Terrain generation |
| `server/src/are/WorldHashSnapshot.ts` | `chunkSize ?? 64` | World hash snapshot |
| `server/src/core/are/SpatialBroadcastTickSystem.ts` | `SPATIAL_CHUNK_SIZE` (64) | Spatial broadcast |
| `server/src/core/spatial/UnifiedChunkContract.ts` (server) | `UNIFIED_CHUNK_CONTRACT.chunkSizeTiles = 64` | Existing server unified contract |

### 16-tile call-sites (legacy intra-chunk mesh subdivision — NOT chunk size)

| File | Constant | Actual role |
|------|----------|--------------|
| `packages/shared/src/world/KappaMath.ts` | `DEFAULT_CHUNK_TILES = 16` | Legacy default for WorldDirector scatter grid |
| `server/src/world/WorldPoiGenerator.ts` | `CHUNK_TILES = 16` (local) | POI scatter grid inside a chunk |
| `server/src/resources/ChunkResourceGenerator.ts` | `CHUNK_TILES = 16` (local) | Resource scatter grid inside a chunk |
| `server/src/world/WorldDiscoveryService.ts` | `TILES_PER_CHUNK = 16` (local in `getChunkKeyFromPosition`) | Chunk key derivation — **this is the drift source** |

**Finding:** `WorldDiscoveryService.getChunkKeyFromPosition` computes chunk keys using `TILES_PER_CHUNK = 16`, while `ChunkMath` uses `CHUNK_SIZE_TILES = 64`. The same Kappa coordinate maps to different chunk indices depending on which function is called. This breaks discovery/replay/hash parity.

## 2. Discovery radius: unit mismatch

| File | Constant | Value | Documented unit |
|------|----------|-------|-----------------|
| `server/src/world/WorldDiscoveryService.ts` | `DEFAULT_DISCOVERY_RADIUS` | 96 | Comment says "kappa units" |

POI positions are in Kappa units (e.g. `{ x: 462, y: 503 }` — these are Kappa, not tiles). A discovery radius of **96 Kappa = 0.096 tiles**, which is almost certainly a bug: the intended value is likely **96,000 Kappa = 96 tiles ≈ 1.5 chunks**.

The `distance()` function in `WorldDiscoveryService` compares POI positions (Kappa) against the radius, so the unit is Kappa. But 96 Kappa is too small to discover anything — this is either a latent bug or the positions are not actually Kappa.

**Proposed normalization:** `DISCOVERY_RADIUS_KAPPA = 96_000` (96 tiles). This is documented in `UnifiedChunkContract.ts`.

## 3. Kappa-per-tile (consistent, no drift)

All call-sites use `1000`:
- `packages/shared/src/world/KappaMath.ts` (`KAPPA_STANDARD = 1000`)
- `server/src/are/Kappa.ts` (`KAPPA = 1000`)
- Local `KAPPA_PER_TILE = 1000` in WorldPoiGenerator, ChunkResourceGenerator, WorldDiscoveryService

## 4. Proposed target contract

See `packages/shared/src/world/UnifiedChunkContract.ts`:

| Property | Value | Unit |
|----------|-------|------|
| `UNIFIED_CHUNK_SIZE_TILES` | 64 | tiles |
| `UNIFIED_CHUNK_SIZE_KAPPA` | 64,000 | Kappa |
| `KAPPA_PER_TILE` | 1,000 | Kappa/tile |
| `LEGACY_INTRACHUNK_MESH_TILES` | 16 | tiles (intra-chunk grid, NOT chunk size) |
| `DISCOVERY_RADIUS_KAPPA` | 96,000 | Kappa (96 tiles) |
| `DISCOVERY_RADIUS_TILES` | 96 | tiles |

The 16-tile value is explicitly named `LEGACY_INTRACHUNK_MESH_TILES` so it cannot be confused with a chunk size. Helper functions (`kappaToChunkIndex`, `tileToChunkIndex`, `kappaToTile`, `tileToKappa`, `kappaPositionToChunkKey`) all use the unified 64-tile chunk.

## 5. Risk-marked persistence / ID sites

Before any normalization is applied to live data:

| Site | Risk | Notes |
|------|------|-------|
| `WorldDiscoveryService.getChunkKeyFromPosition` | **HIGH** | Changing `TILES_PER_CHUNK` from 16→64 remaps all discovered chunk keys. Persisted discovery state (`discoveredChunkKeys`) would become invalid. Requires a migration or compatibility boundary. |
| `WorldPoiGenerator.CHUNK_TILES = 16` | MEDIUM | POI positions are computed as `chunkX * 16 * 1000 + tileX * 1000`. If chunk size changes, POI IDs/positions shift. POI IDs are persisted in `discoveredPoiIds`. |
| `ChunkResourceGenerator.CHUNK_TILES = 16` | MEDIUM | Same position-mapping concern as POI generator. Resource node IDs may be persisted. |
| `KappaMath.DEFAULT_CHUNK_TILES = 16` | LOW | Only affects WorldDirector scatter grid; not persisted as IDs. |

## 6. Replay / hash compatibility boundary

`WorldHashSnapshot` uses `chunkSize ?? 64`. If `WorldDiscoveryService` is migrated to 64-tile chunk keys, the hash over discovered-chunks changes. The compatibility boundary must be:

1. **Phase 1 (this PR):** Document the contract and audit. Do NOT migrate live call-sites. No replay/hash impact.
2. **Phase 2 (follow-up):** Migrate `WorldDiscoveryService.getChunkKeyFromPosition` to use `UNIFIED_CHUNK_SIZE_TILES`. Requires a persisted-discovery migration (version bump + re-derive chunk keys from POI positions). Hash behavior must be documented for the chosen boundary.

## 7. Acceptance status

| Criterion | Status |
|-----------|--------|
| No runtime-critical hardcode for competing chunk sizes remains unjustified | ✅ Audited and documented in `UnifiedChunkContract.ts` |
| Same Kappa coordinate maps to same chunk in server, shared, 2D, 3D | ⚠ Contract defined; live migration is Phase 2 (risk-marked) |
| Discovery-radius tests prove units explicitly | ✅ 10 tests in `UnifiedChunkContract.test.ts` |
| Replay/hash behavior documented for compatibility boundary | ✅ Section 6 above |

---

This audit was created by an AI agent (OpenHands) on behalf of the user.
