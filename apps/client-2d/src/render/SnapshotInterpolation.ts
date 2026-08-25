/**
 * Snapshot Interpolation Utilities
 *
 * Render-only interpolation functions for smooth visual projection of server
 * snapshots. Client time is only used for visual projection and never flows
 * back to the server as gameplay truth.
 *
 * ARE-Rules compliance:
 * - No Math.random() in gameplay path
 * - No Date.now() in server truth path
 * - Client render time is visual projection only, never server truth
 */

import type { RenderPosition2D } from "../game/SnapshotRenderBuffer";

/**
 * Clamp visual alpha to [0, 1] range.
 * Returns 0 for NaN, Infinity, or negative values.
 * Returns 1 for values greater than 1.
 */
export function clampVisualAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return 0;
  if (alpha <= 0) return 0;
  if (alpha >= 1) return 1;
  return alpha;
}

/**
 * Calculate render alpha given elapsed time and tick duration.
 *
 * @param elapsedMs - Time elapsed since last snapshot in milliseconds
 * @param tickDurationMs - Duration of one tick in milliseconds (typically 100ms for 10Hz)
 * @returns Alpha value in [0, 1] range for interpolation
 */
export function calculateRenderAlpha(elapsedMs: number, tickDurationMs: number): number {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(tickDurationMs)) return 0;
  if (tickDurationMs <= 0) return 0;
  const rawAlpha = elapsedMs / tickDurationMs;
  return clampVisualAlpha(rawAlpha);
}

/**
 * Interpolate between two positions using linear interpolation.
 * This is render-only - does not mutate either position object.
 *
 * @param previous - Previous position
 * @param current - Current position
 * @param alpha - Interpolation factor in [0, 1]
 * @returns New position representing the interpolated point
 */
export function interpolatePosition(
  previous: RenderPosition2D,
  current: RenderPosition2D,
  alpha: number,
): RenderPosition2D {
  const safeAlpha = clampVisualAlpha(alpha);
  return {
    x: previous.x + (current.x - previous.x) * safeAlpha,
    y: previous.y + (current.y - previous.y) * safeAlpha,
  };
}

/**
 * Normalize degrees to [0, 360) range.
 */
function normalizeDegrees(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/**
 * Interpolate facing in degrees over the shortest visual arc.
 * This is render-only projection; it never changes server snapshot truth.
 *
 * @param previousDegrees - Previous facing in degrees
 * @param currentDegrees - Current facing in degrees
 * @param alpha - Interpolation factor in [0, 1]
 * @returns Interpolated facing in degrees [0, 360)
 */
export function interpolateFacing(
  previousDegrees: number,
  currentDegrees: number,
  alpha: number,
): number {
  if (!Number.isFinite(previousDegrees) || !Number.isFinite(currentDegrees)) return 0;
  const safeAlpha = clampVisualAlpha(alpha);
  const previous = normalizeDegrees(previousDegrees);
  const current = normalizeDegrees(currentDegrees);
  // Calculate shortest arc: delta in [-180, 180]
  const delta = ((current - previous + 540) % 360) - 180;
  return normalizeDegrees(previous + delta * safeAlpha);
}

/**
 * Linear interpolation for numbers.
 */
export function lerpNumber(previous: number, current: number, alpha: number): number {
  const safeAlpha = clampVisualAlpha(alpha);
  return previous + (current - previous) * safeAlpha;
}

/**
 * Clamp a value to a range.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
