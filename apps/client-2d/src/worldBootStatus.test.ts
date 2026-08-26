import { describe, expect, it } from "vitest";
import type { Live2DRuntimeSnapshot } from "./LiveAuthoritativeWorld2D";
import { deriveWorldBootStatus } from "./worldBootStatus";

function runtime(overrides: Partial<Live2DRuntimeSnapshot> = {}): Live2DRuntimeSnapshot {
  return {
    phase: "mounting",
    connected: false,
    rendererStatus: "waiting",
    playerPos: null,
    visibleEntities: 0,
    resolvedAssetEntities: 0,
    missingPresentationEntities: 0,
    debugShapeEntities: 0,
    serverTick: null,
    presentationSha256: null,
    renderProfile: null,
    assetManifestLoaded: false,
    worldProjectionReady: false,
    activeWorldChunks: 0,
    resolvedWorldAssets: 0,
    missingWorldAssets: 0,
    worldSeed: null,
    worldHash: null,
    worldGenerator: null,
    error: null,
    ...overrides,
  };
}

describe("deriveWorldBootStatus", () => {
  it("requires renderer, projection, connection, and a server tick before reporting world_ready", () => {
    expect(
      deriveWorldBootStatus(
        runtime({
          phase: "ready",
          connected: true,
          rendererStatus: "ready",
          worldProjectionReady: true,
          serverTick: 120,
        }),
        "connected",
        120,
      ),
    ).toBe("world_ready");
  });

  it("does not elevate a projected local renderer without server evidence to world_ready", () => {
    expect(
      deriveWorldBootStatus(
        runtime({
          phase: "ready",
          connected: false,
          rendererStatus: "ready",
          worldProjectionReady: true,
          serverTick: null,
        }),
        "offline",
        null,
      ),
    ).toBe("world_projection_ready");
  });

  it("surfaces a runtime failure instead of a ready world", () => {
    expect(
      deriveWorldBootStatus(
        runtime({ phase: "failed", rendererStatus: "failed", error: "projection fetch failed" }),
        "connected",
        120,
      ),
    ).toBe("failed");
  });
});
