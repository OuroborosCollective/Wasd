import { describe, expect, it } from "vitest";
import {
  CHUNK_DRIFT_AUDIT,
  DISCOVERY_RADIUS_KAPPA,
  DISCOVERY_RADIUS_TILES,
  KAPPA_PER_TILE,
  LEGACY_INTRACHUNK_MESH_TILES,
  UNIFIED_CHUNK_SIZE_KAPPA,
  UNIFIED_CHUNK_SIZE_TILES,
  kappaPositionToChunkKey,
  kappaToChunkIndex,
  kappaToTile,
  tileToChunkIndex,
  tileToKappa,
} from "./UnifiedChunkContract";

describe("UnifiedChunkContract", () => {
  it("defines the authoritative chunk size as 64 tiles", () => {
    expect(UNIFIED_CHUNK_SIZE_TILES).toBe(64);
    expect(UNIFIED_CHUNK_SIZE_KAPPA).toBe(64_000);
  });

  it("keeps KAPPA_PER_TILE consistent at 1000", () => {
    expect(KAPPA_PER_TILE).toBe(1000);
  });

  it("documents the legacy 16-tile value as an intra-chunk mesh, not a chunk size", () => {
    expect(LEGACY_INTRACHUNK_MESH_TILES).toBe(16);
    expect(LEGACY_INTRACHUNK_MESH_TILES).not.toBe(UNIFIED_CHUNK_SIZE_TILES);
  });

  it("defines discovery radius in kappa units with explicit tile conversion", () => {
    // Issue requirement: discovery radius units must be explicit.
    expect(DISCOVERY_RADIUS_KAPPA).toBe(96_000);
    expect(DISCOVERY_RADIUS_TILES).toBe(96);
    // 96 tiles = 1.5 chunks at 64-tile chunk size
    expect(DISCOVERY_RADIUS_TILES / UNIFIED_CHUNK_SIZE_TILES).toBe(1.5);
  });

  it("maps the same kappa coordinate to the same chunk index deterministically", () => {
    expect(kappaToChunkIndex(0)).toBe(0);
    expect(kappaToChunkIndex(63_999)).toBe(0);
    expect(kappaToChunkIndex(64_000)).toBe(1);
    expect(kappaToChunkIndex(128_000)).toBe(2);
  });

  it("maps tile coordinates to chunk indices", () => {
    expect(tileToChunkIndex(0)).toBe(0);
    expect(tileToChunkIndex(63)).toBe(0);
    expect(tileToChunkIndex(64)).toBe(1);
    expect(tileToChunkIndex(128)).toBe(2);
  });

  it("converts between kappa and tile consistently", () => {
    expect(kappaToTile(1000)).toBe(1);
    expect(kappaToTile(64_000)).toBe(64);
    expect(tileToKappa(1)).toBe(1000);
    expect(tileToKappa(64)).toBe(64_000);
    expect(kappaToTile(tileToKappa(42))).toBe(42);
  });

  it("produces a stable chunk key from a kappa position", () => {
    expect(kappaPositionToChunkKey(0, 0)).toBe("0,0");
    expect(kappaPositionToChunkKey(64_000, 0)).toBe("1,0");
    expect(kappaPositionToChunkKey(64_000, 128_000)).toBe("1,2");
  });

  it("freezes the audit record so it cannot be tampered with", () => {
    expect(Object.isFrozen(CHUNK_DRIFT_AUDIT)).toBe(true);
    expect(CHUNK_DRIFT_AUDIT.chunkSizeDrift["64-tile"].role).toBe(
      "authoritative runtime chunk size",
    );
    expect(CHUNK_DRIFT_AUDIT.chunkSizeDrift["16-tile"].role).toContain(
      "legacy",
    );
  });

  it("documents the discovery radius unit mismatch in the audit", () => {
    expect(CHUNK_DRIFT_AUDIT.discoveryRadius.unit).toContain("kappa");
    // The audit flags that DEFAULT_DISCOVERY_RADIUS = 96 is likely intended
    // as 96,000 kappa (96 tiles), not 96 kappa (0.096 tiles).
    expect(CHUNK_DRIFT_AUDIT.discoveryRadius.note).toContain("96,000");
  });
});
