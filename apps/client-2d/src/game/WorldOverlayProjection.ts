/**
 * WorldOverlayProjection
 *
 * Canonical isometric projection for overlay markers. Uses the shared
 * isometricProjection.ts (iso2) instead of component-local approximate
 * transforms with hardcoded origins/scales.
 *
 * Rules (issue #2465):
 * - Camera/viewport are explicit adapter inputs only.
 * - No Math.random, no wall-clock.
 * - Same world coordinate → same screen coordinate across all layers.
 */

import { iso2, TILE_W, TILE_H } from "../isometricProjection";

export interface ViewportInput {
  readonly screenWidth: number;
  readonly screenHeight: number;
}

export interface WorldCoord {
  readonly x: number;
  readonly y: number;
}

export interface ScreenCoord {
  readonly screenX: number;
  readonly screenY: number;
}

/**
 * Project a world (kappa-space) coordinate to screen using the canonical
 * isometric projection. The viewport dimensions are an explicit input so the
 * projection stays a pure adapter.
 *
 * World coordinates (x, y) map to isometric grid (gridX=x, gridZ=y). The
 * canonical tile dimensions (TILE_W=96, TILE_H=48) are used consistently
 * with the chunk renderer and loot renderer.
 */
export function projectWorldToScreen(
  world: WorldCoord,
  viewport: ViewportInput,
): ScreenCoord {
  if (viewport.screenWidth === 0 || viewport.screenHeight === 0) {
    return { screenX: world.x, screenY: world.y };
  }
  const point = iso2({
    gridX: world.x,
    gridZ: world.y,
    screenWidth: viewport.screenWidth,
    screenHeight: viewport.screenHeight,
    tileWidth: TILE_W,
    tileHeight: TILE_H,
  });
  return { screenX: point.x, screenY: point.y };
}

/**
 * Project multiple world coordinates through the same viewport in one pass.
 * Keeps the projection deterministic and shared across marker layers.
 */
export function projectWorldBatch(
  coords: readonly WorldCoord[],
  viewport: ViewportInput,
): ScreenCoord[] {
  return coords.map((c) => projectWorldToScreen(c, viewport));
}
