/**
 * @fileoverview Pure, deterministic lerp math for ARELORIA render interpolation.
 * 
 * ARCHITECTURE NOTE:
 * This module contains ZERO PixiJS imports. It is a pure math layer that
 * operates on raw numbers. The actual sprite mutation happens in the
 * PixiJS ticker callback. This separation enforces "Stateless Determinism":
 * the logical `kappaPos` (entity.tx, entity.tz) is NEVER mutated by lerp.
 * 
 * The lerp factor `LERP_SPEED` is calibrated so that:
 * - At 60 FPS (deltaTime ≈ 1.0): smooth 10-Hz server updates become fluid motion
 * - At 30 FPS (deltaTime ≈ 2.0): same visual speed due to deltaTime multiplication
 * - At 144 FPS (deltaTime ≈ 0.42): same visual speed, just smoother
 */

/**
 * Exponential ease-out lerp: moves quickly at start, slows near target.
 * This is deterministic: same inputs always produce same output.
 * 
 * @param start - Current position (sprite.x or sprite.y)
 * @param end - Target position (from server kappa position)
 * @param t - Lerp factor, typically LERP_SPEED * deltaTime
 * @returns Interpolated position
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Euclidean distance between two 2D points.
 * Used for Teleport-Snap threshold checks.
 */
export function distance2D(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Clamp a value to a range. Used to bound lerp factor.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// === INTERPOLATION CONSTANTS ===

/**
 * Lerp speed factor. Calibrated for 10-Hz server → 60-FPS render interpolation.
 * At 60 FPS: deltaTime ≈ 1.0, so effective lerp per frame ≈ 0.15 (15% of remaining distance)
 * At 30 FPS: deltaTime ≈ 2.0, so effective lerp per frame ≈ 0.30 (30% of remaining distance)
 * At 144 FPS: deltaTime ≈ 0.42, so effective lerp per frame ≈ 0.063 (6.3% of remaining distance)
 * 
 * Visual result: same arrival time regardless of frame rate.
 */
export const LERP_SPEED = 0.15;

/**
 * Maximum deltaTime multiplier to prevent spiral-of-death on tab-unfocus.
 * Prevents the lerp from "catching up" too aggressively when returning from background.
 */
export const MAX_DELTA_TIME_MULTIPLIER = 2.0;

/**
 * Teleport-Snap threshold in PIXELS.
 * If the distance between sprite position and target exceeds this, we SNAp (not lerp).
 * This handles:
 * - Chunk boundary crossings
 * - Server-side teleportation
 * - Network packet loss scenarios
 * 
 * 150 pixels ≈ ~1.5 tiles on screen at default zoom.
 */
export const TELEPORT_SNAP_THRESHOLD_PX = 150;

/**
 * Precision-Lock threshold in PIXELS.
 * When distance < this value, we snap directly to target to prevent micro-jitter.
 * 0.5 pixels is below visual perception threshold.
 */
export const PRECISION_LOCK_THRESHOLD_PX = 0.5;

/**
 * Kappa coordinate to pixel conversion factor.
 * 1 Kappa = 1000 units (fromKappaInt divides by 1000).
 * For screen position calculation, we need to know pixel scale.
 * 
 * At default isometric projection (TILE_W=96, TILE_H=48):
 * Each tile is ~104 pixels diagonally, so 1 kappa-unit ≈ 0.104 pixels.
 * 
 * TELEPORT_SNAP_THRESHOLD_KAPPA converts the pixel threshold back:
 * 150 px / 0.104 ≈ 1442 kappa units
 * 
 * This is used for server-side position checks before rendering.
 */
export const TELEPORT_SNAP_THRESHOLD_KAPPA = TELEPORT_SNAP_THRESHOLD_PX * 10; // ≈ 1500 kappa units
