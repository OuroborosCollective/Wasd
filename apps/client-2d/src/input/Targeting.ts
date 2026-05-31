/**
 * Targeting.ts - Spatial Auto-Targeting System
 * 
 * ARCHITECTURE (Stateless Determinism):
 * - All targeting math uses KAPPA-units (integer grid, 1 unit = 1 meter)
 * - Target determination is deterministic based on player facing direction
 * - No random target selection - entity must be mathematically in front
 * 
 * CORE PRINCIPLE: "Spatial Causality"
 * - Action-Buttons (Strike, Talk) NEVER pick random targets
 * - Target is ALWAYS calculated via KAPPA-Grid relative to player facing
 */

import { TILE_W, TILE_H } from "../isometricProjection";

/**
 * Cardinal directions in KAPPA-grid space.
 * Used for deterministic target calculation.
 */
export enum FacingDirection {
  UP = "UP",    // -Z (in world space)
  DOWN = "DOWN", // +Z (in world space)
  LEFT = "LEFT", // -X (in world space)
  RIGHT = "RIGHT" // +X (in world space)
}

/**
 * Kappa-coordinate for targeting calculations.
 * Uses integer representation for deterministic math.
 */
export interface KappaPos {
  x: number;
  z: number;
}

/**
 * Entity with position and ID for targeting.
 */
export interface TargetableEntity {
  id: string;
  name?: string;
  kappaX: number;
  kappaZ: number;
  kind: "player" | "npc" | "monster" | "object";
}

/**
 * Targeting result - contains the entity ID if valid target found.
 */
export interface TargetingResult {
  targetId: string | null;
  targetName: string | null;
  distance: number;
  inRange: boolean;
}

/**
 * Maximum targeting range in KAPPA-units (1.5 meters = 1500 units).
 * Aligned with server-side attack range constants.
 */
export const MAX_TARGETING_RANGE_KAPPA = 1500;

/**
 * Tolerance for "directly in front" calculation.
 * Small tolerance for diagonal movement scenarios.
 */
export const TARGETING_TOLERANCE_KAPPA = 500;

/**
 * Get the facing direction vector based on player input.
 * Returns delta in KAPPA-units.
 */
export function getFacingDelta(direction: FacingDirection): { dx: number; dz: number } {
  switch (direction) {
    case FacingDirection.UP:
      return { dx: 0, dz: -1 };
    case FacingDirection.DOWN:
      return { dx: 0, dz: 1 };
    case FacingDirection.LEFT:
      return { dx: -1, dz: 0 };
    case FacingDirection.RIGHT:
      return { dx: 1, dz: 0 };
  }
}

/**
 * Calculate if an entity is directly in front of the player (within KAPPA tolerance).
 * Returns true if the entity is in the facing cone.
 */
export function isInFront(
  playerPos: KappaPos,
  entityPos: KappaPos,
  facingDirection: FacingDirection,
  tolerance: number = TARGETING_TOLERANCE_KAPPA
): boolean {
  const facingDelta = getFacingDelta(facingDirection);
  
  // Calculate relative position
  const relX = entityPos.x - playerPos.x;
  const relZ = entityPos.z - playerPos.z;
  
  // Check if entity is in the facing direction (dot product > 0)
  const dotProduct = relX * facingDelta.dx + relZ * facingDelta.dz;
  
  if (dotProduct <= 0) return false;
  
  // Check perpendicular distance (how far off-center the entity is)
  const perpDist = Math.abs(relX * facingDelta.dz - relZ * facingDelta.dx);
  
  return perpDist <= tolerance;
}

/**
 * Calculate KAPPA-distance between two positions.
 * Returns distance in KAPPA-units.
 */
export function kappaDistance(a: KappaPos, b: KappaPos): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  // Use squared distance for speed, compare against squared max range
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Get the entity directly in front of the player based on facing direction.
 * Uses KAPPA-unit math for deterministic targeting.
 * 
 * ALGORITHM:
 * 1. Filter all entities to only those in the facing cone
 * 2. Among candidates, find the closest entity within max range
 * 3. Return null if no valid target found (no random fallback)
 * 
 * @param playerPos - Player's KAPPA position {kappaX, kappaZ}
 * @param facingDirection - Current player facing direction
 * @param allEntities - All targetable entities in the world
 * @param maxKappaRange - Maximum targeting range (default: 1500 units = 1.5m)
 * @returns TargetingResult with entityId or null
 */
export function getFacingEntity(
  playerPos: KappaPos,
  facingDirection: FacingDirection,
  allEntities: TargetableEntity[],
  maxKappaRange: number = MAX_TARGETING_RANGE_KAPPA
): TargetingResult {
  const facingDelta = getFacingDelta(facingDirection);
  
  let bestTarget: TargetableEntity | null = null;
  let bestDistance = Infinity;
  
  for (const entity of allEntities) {
    // Skip self
    if (entity.kind === "player") continue;
    
    const relX = entity.kappaX - playerPos.x;
    const relZ = entity.kappaZ - playerPos.z;
    
    // ─────────────────────────────────────────────────────────────────
    // SPATIAL CAUSALITY CHECK (Phase 1: Direction)
    // Must be in the facing cone (dot product > 0)
    // ─────────────────────────────────────────────────────────────────
    const dotProduct = relX * facingDelta.dx + relZ * facingDelta.dz;
    if (dotProduct <= 0) continue;
    
    // ─────────────────────────────────────────────────────────────────
    // SPATIAL CAUSALITY CHECK (Phase 2: Perpendicular Distance)
    // Entity must be roughly aligned with facing direction
    // Tolerance of ±500 KAPPA-units (~0.5 meters)
    // ─────────────────────────────────────────────────────────────────
    const perpDist = Math.abs(relX * facingDelta.dz - relZ * facingDelta.dx);
    if (perpDist > TARGETING_TOLERANCE_KAPPA) continue;
    
    // ─────────────────────────────────────────────────────────────────
    // RANGE CHECK
    // Entity must be within maximum targeting range
    // ─────────────────────────────────────────────────────────────────
    const distance = Math.sqrt(relX * relX + relZ * relZ);
    if (distance > maxKappaRange) continue;
    
    // ─────────────────────────────────────────────────────────────────
    // SELECTION: Pick the closest valid target
    // Deterministic: no random fallback if multiple targets at same distance
    // ─────────────────────────────────────────────────────────────────
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = entity;
    }
  }
  
  if (!bestTarget) {
    return {
      targetId: null,
      targetName: null,
      distance: Infinity,
      inRange: false
    };
  }
  
  return {
    targetId: bestTarget.id,
    targetName: bestTarget.name ?? null,
    distance: bestDistance,
    inRange: true
  };
}

/**
 * Convert server tile position to KAPPA position.
 * Server uses tile units; KAPPA-scale by 1000.
 */
export function serverPosToKappa(serverX: number, serverZ: number): KappaPos {
  return {
    x: Math.round(serverX * 1000),
    z: Math.round(serverZ * 1000)
  };
}

/**
 * Convert KAPPA position back to server tile position.
 */
export function kappaToServerPos(kappaX: number, kappaZ: number): { x: number; z: number } {
  return {
    x: kappaX / 1000,
    z: kappaZ / 1000
  };
}

/**
 * Map keyboard input to facing direction.
 */
export function inputToFacing(dx: number, dz: number): FacingDirection | null {
  if (dx === 0 && dz < 0) return FacingDirection.UP;
  if (dx === 0 && dz > 0) return FacingDirection.DOWN;
  if (dx < 0 && dz === 0) return FacingDirection.LEFT;
  if (dx > 0 && dz === 0) return FacingDirection.RIGHT;
  
  // Diagonal handling: prioritize horizontal
  if (dx !== 0) return dx > 0 ? FacingDirection.RIGHT : FacingDirection.LEFT;
  if (dz !== 0) return dz > 0 ? FacingDirection.DOWN : FacingDirection.UP;
  
  return null;
}