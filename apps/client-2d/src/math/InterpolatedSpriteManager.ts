/**
 * @fileoverview InterpolatedSpriteManager - Decoupled render loop for entity interpolation.
 * 
 * ARCHITECTURE NOTE:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CORE PRINCIPLE: "Stateless Determinism" - The logical world state (kappaPos)
 * is sacred and immutable during render. The server is authoritative; we never
 * modify entity.tx or entity.tz.
 * 
 * DATA FLOW:
 * 
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  WORLD_HEARTBEAT (10 Hz)                                           │
 *   │                                                                     │
 *   │  1. Server sends position update                                    │
 *   │  2. setActor() updates entity.tx, entity.tz (LOGICAL STATE)        │
 *   │  3. setTargetPosition() updates targetPositions Map (RENDER TARGET) │
 *   │                                                                     │
 *   └──────────────────────────┬──────────────────────────────────────────┘
 *                              │
 *                              ▼
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  PIXI.TICKER (60 FPS) — DECOUPLED FROM NETWORK                      │
 *   │                                                                     │
 *   │  For each interpolated entity:                                       │
 *   │    1. Read current sprite.x, sprite.y                               │
 *   │    2. Read targetX, targetY from targetPositions Map                │
 *   │    3. Calculate distance(sprite, target)                             │
 *   │    4. if distance > TELEPORT_SNAP_THRESHOLD_PX → instant snap       │
 *   │    5. else if distance < PRECISION_LOCK_THRESHOLD_PX → snap       │
 *   │    6. else → lerp(sprite.x, targetX, LERP_SPEED * deltaTime)       │
 *   │                                                                     │
 *   └─────────────────────────────────────────────────────────────────────┘
 * 
 * WHY THIS SEPARATION MATTERS:
 * 
 * 1. Consistency: If we lerped directly into entity.tx/ tz, then the logical
 *    position would drift from the server's authoritative position over time.
 *    This would cause desync bugs, incorrect server collisions, etc.
 * 
 * 2. Determinism: The render interpolation is purely cosmetic. The logical
 *    state always reflects what the server last told us.
 * 
 * 3. Testability: lerp() is a pure function; the manager just orchestrates.
 * 
 * 4. Performance: Ticker callbacks are batched by PixiJS; we iterate once
 *    per frame over all active entities.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Container } from "pixi.js";
import { lerp, distance2D, clamp, LERP_SPEED, TELEPORT_SNAP_THRESHOLD_PX, PRECISION_LOCK_THRESHOLD_PX, MAX_DELTA_TIME_MULTIPLIER } from "./lerp";

/**
 * Target position for an entity's visual interpolation.
 * This is stored SEPARATELY from the logical entity state.
 */
interface InterpolatedTarget {
  targetX: number;
  targetY: number;
}

/**
 * Entity with its visual sprite and interpolation state.
 */
interface InterpolatedEntity {
  sprite: Container;
  /** Current visual X position (read from sprite.x during tick) */
  currentX: number;
  /** Current visual Y position (read from sprite.y during tick) */
  currentY: number;
  /** Target X position from latest server update */
  targetX: number;
  /** Target Y position from latest server update */
  targetY: number;
}

/**
 * InterpolatedSpriteManager - Singleton that manages decoupled render interpolation.
 * 
 * Usage:
 * 
 *   // On entity spawn/update (from WORLD_HEARTBEAT, 10 Hz):
 *   const manager = InterpolatedSpriteManager.getInstance();
 *   manager.setTarget(entityId, targetScreenX, targetScreenY);
 * 
 *   // On entity despawn:
 *   manager.remove(entityId);
 * 
 *   // The ticker callback runs automatically in the PixiJS loop.
 *   // No need to call tick() manually.
 */
export class InterpolatedSpriteManager {
  private static _instance: InterpolatedSpriteManager | null = null;
  
  /** Map of entity ID → interpolation state */
  private readonly entities = new Map<string, InterpolatedEntity>();
  
  /** Whether the ticker has been registered */
  private tickerRegistered = false;
  
  private constructor() {
    // Private constructor enforces singleton pattern
  }

  /**
   * Get the singleton instance. Creates it if necessary.
   */
  static getInstance(): InterpolatedSpriteManager {
    if (!InterpolatedSpriteManager._instance) {
      InterpolatedSpriteManager._instance = new InterpolatedSpriteManager();
    }
    return InterpolatedSpriteManager._instance;
  }

  /**
   * Register an entity with the interpolation system.
   * Call this when an actor sprite is first created.
   * 
   * @param entityId - Unique identifier matching server entity ID
   * @param sprite - The PIXI.Container representing this entity
   * @param initialX - Initial screen X position
   * @param initialY - Initial screen Y position
   */
  register(entityId: string, sprite: Container, initialX: number, initialY: number): void {
    this.entities.set(entityId, {
      sprite,
      currentX: initialX,
      currentY: initialY,
      targetX: initialX,
      targetY: initialY,
    });
  }

  /**
   * Update the target position for an entity.
   * This is called from WORLD_HEARTBEAT when server sends position update.
   * 
   * IMPORTANT: This does NOT modify sprite.x or sprite.y directly.
   * The actual visual movement happens in the ticker callback.
   * 
   * @param entityId - Unique identifier
   * @param targetX - Target screen X (from iso projection of kappa pos)
   * @param targetY - Target screen Y (from iso projection of kappa pos)
   */
  setTarget(entityId: string, targetX: number, targetY: number): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      console.warn(`[InterpolatedSpriteManager] Entity ${entityId} not registered, skipping target set`);
      return;
    }
    
    // Store the new target. The ticker will handle the actual interpolation.
    entity.targetX = targetX;
    entity.targetY = targetY;
  }

  /**
   * Remove an entity from the interpolation system.
   * Call this when an actor despawns.
   */
  remove(entityId: string): void {
    this.entities.delete(entityId);
  }

  /**
   * Clear all entities (e.g., on world unload).
   */
  clear(): void {
    this.entities.clear();
  }

  /**
   * Main ticker callback. Registered with PIXI.Ticker.
   * This runs every frame (60 FPS nominally).
   * 
   * @param deltaTime - PixiJS delta time (1.0 at 60 FPS, 2.0 at 30 FPS, etc.)
   */
  tick(deltaTime: number): void {
    if (this.entities.size === 0) return;

    // Clamp deltaTime to prevent spiral-of-death on tab-unfocus/return
    const clampedDelta = clamp(deltaTime, 0, MAX_DELTA_TIME_MULTIPLIER);
    const lerpFactor = LERP_SPEED * clampedDelta;

    for (const entity of this.entities.values()) {
      this.interpolateEntity(entity, lerpFactor);
    }
  }

  /**
   * Interpolate a single entity's position.
   * This is the core interpolation algorithm.
   * 
   * DECISION TREE:
   * 
   *   1. Calculate distance from current sprite position to target
   *   2. If distance > TELEPORT_SNAP_THRESHOLD_PX (150px):
   *      → Instant snap (teleport scenario)
   *   3. Else if distance < PRECISION_LOCK_THRESHOLD_PX (0.5px):
   *      → Snap to target (precision lock prevents micro-jitter)
   *   4. Else:
   *      → Lerp: sprite.x = lerp(sprite.x, targetX, LERP_SPEED * deltaTime)
   */
  private interpolateEntity(entity: InterpolatedEntity, lerpFactor: number): void {
    // Read current visual position from sprite (may have been modified last frame)
    const currentX = entity.sprite.x;
    const currentY = entity.sprite.y;
    const targetX = entity.targetX;
    const targetY = entity.targetY;

    // Calculate distance to target
    const dist = distance2D(currentX, currentY, targetX, targetY);

    // ─────────────────────────────────────────────────────────────────
    // DECISION POINT: Teleport-Snap vs Lerp vs Precision-Lock
    // ─────────────────────────────────────────────────────────────────

    if (dist > TELEPORT_SNAP_THRESHOLD_PX) {
      // ═══════════════════════════════════════════════════════════════
      // CASE 1: TELEPORT SNAP
      // Distance is too large — this is a teleport, not normal movement.
      // Examples: chunk boundary, server-side teleport, respawn, lag spike
      // ═══════════════════════════════════════════════════════════════
      entity.sprite.x = targetX;
      entity.sprite.y = targetY;
      
      // Sync zIndex for correct depth sorting after snap.
      // Without this, teleported entities can render in front of/behind
      // the wrong actors until a later non-snap interpolation happens.
      entity.sprite.zIndex = Math.round(targetY);
      
      // Update cached values for next frame
      entity.currentX = targetX;
      entity.currentY = targetY;
      
    } else if (dist < PRECISION_LOCK_THRESHOLD_PX) {
      // ═══════════════════════════════════════════════════════════════
      // CASE 2: PRECISION LOCK
      // We're close enough that lerping would cause micro-jitter.
      // Just snap to the target to prevent oscillation.
      // ═══════════════════════════════════════════════════════════════
      entity.sprite.x = targetX;
      entity.sprite.y = targetY;
      
      // Sync zIndex for correct depth sorting after precision lock.
      entity.sprite.zIndex = Math.round(targetY);
      
      entity.currentX = targetX;
      entity.currentY = targetY;
      
    } else {
      // ═══════════════════════════════════════════════════════════════
      // CASE 3: NORMAL LERP INTERPOLATION
      // Smoothly interpolate towards target using exponential ease-out.
      // ═══════════════════════════════════════════════════════════════
      const newX = lerp(currentX, targetX, lerpFactor);
      const newY = lerp(currentY, targetY, lerpFactor);
      
      entity.sprite.x = newX;
      entity.sprite.y = newY;
      
      // Update zIndex based on new Y for correct depth sorting
      entity.sprite.zIndex = Math.round(newY);
      
      // Cache for next frame's distance calculation
      entity.currentX = newX;
      entity.currentY = newY;
    }
  }

  /**
   * Get the current interpolation state for debugging.
   */
  getState(): ReadonlyMap<string, { distToTarget: number; isSnapping: boolean }> {
    const state = new Map<string, { distToTarget: number; isSnapping: boolean }>();
    
    for (const [id, entity] of this.entities) {
      const dist = distance2D(entity.sprite.x, entity.sprite.y, entity.targetX, entity.targetY);
      state.set(id, {
        distToTarget: dist,
        isSnapping: dist > TELEPORT_SNAP_THRESHOLD_PX || dist < PRECISION_LOCK_THRESHOLD_PX,
      });
    }
    
    return state;
  }

  /**
   * Number of entities being interpolated.
   */
  get entityCount(): number {
    return this.entities.size;
  }
}
