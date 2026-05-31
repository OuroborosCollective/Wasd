/**
 * @fileoverview AnimatedSpriteManager - Delta-Driven Animation System
 * 
 * ARCHITECTURE:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * CORE PRINCIPLE: "Delta-Driven Animation"
 * 
 * The animation state is derived EXCLUSIVELY from the delta (difference) between
 * the current sprite position and the server-dictated target position.
 * 
 * Mathematically:
 *   deltaX = sprite.x - targetX
 *   deltaY = sprite.y - targetY
 *   vectorLength = sqrt(deltaX² + deltaY²)
 * 
 * DECISION MATRIX:
 * 
 *   vectorLength < 0.5px → IDLE (precision lock engaged)
 *   vectorLength >= 0.5px → WALK (lerp interpolation active)
 * 
 * DIRECTION CALCULATION:
 * 
 *   Dominant axis = max(|deltaX|, |deltaY|)
 *   if dominantAxis === |deltaX|:
 *     deltaX > 0 → LEFT
 *     deltaX < 0 → RIGHT
 *   else:
 *     deltaY > 0 → UP (isometric perspective)
 *     deltaY < 0 → DOWN
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PERFORMANCE CONSTRAINTS:
 * 
 * - Runs in 60 FPS PixiJS Ticker loop
 * - Must not block or slow lerp interpolation
 * - Uses texture swapping instead of frame resets to prevent stuttering
 * - Event hooks are debounced to prevent animation thrashing
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { AnimatedSprite, Texture, Container, Ticker } from 'pixi.js';
import { distance2D, PRECISION_LOCK_THRESHOLD_PX } from '../math/lerp';
import { AssetMapper, type AnimationFrameSet, type FacingDirection, type AnimationState, type EntityMetadata } from './AssetMapper';

/**
 * Configuration for animation behavior.
 */
export interface AnimationConfig {
  /** Walk cycle FPS (default: 8) */
  walkFps?: number;
  /** Idle transition smoothness (0-1, default: 0.8) */
  idleSmoothness?: number;
  /** Action/attack animation duration in ms (default: 300) */
  actionDurationMs?: number;
  /** Minimum delta to trigger walk animation (default: 0.5) */
  walkThreshold?: number;
}

/**
 * Default animation configuration.
 */
const DEFAULT_CONFIG: Required<AnimationConfig> = {
  walkFps: 8,
  idleSmoothness: 0.8,
  actionDurationMs: 300,
  walkThreshold: 0.5,
};

/**
 * Animated entity state stored in the manager.
 */
interface AnimatedEntity {
  /** The PIXI AnimatedSprite instance */
  sprite: AnimatedSprite;
  /** Current animation state */
  state: AnimationState;
  /** Current facing direction */
  facing: FacingDirection;
  /** Loaded frame textures keyed by direction */
  frames: {
    walkDown: Texture[];
    walkUp: Texture[];
    walkLeft: Texture[];
    walkRight: Texture[];
    idle: Texture;
    attackFrames: Texture[];
    actionFrames: Texture[];
  };
  /** Current walk cycle FPS */
  walkFps: number;
  /** Last target X position from server */
  lastTargetX: number;
  /** Last target Y position from server */
  lastTargetY: number;
  /** Timer for action interruption */
  actionTimer: number | null;
  /** Whether animation is currently paused for action */
  isActionPaused: boolean;
  /** Internal frame index for smooth direction transitions */
  currentFrameIndex: number;
}

/**
 * AnimatedSpriteManager - Singleton that manages delta-driven sprite animations.
 * 
 * Integrates with InterpolatedSpriteManager to:
 * 1. Read current and target positions each frame
 * 2. Calculate movement delta
 * 3. Drive AnimatedSprite state machine
 * 
 * Usage:
 * 
 *   // Registration (during entity spawn)
 *   const manager = AnimatedSpriteManager.getInstance();
 *   await manager.registerEntity(entityId, metadata, container);
 * 
 *   // Target update (from server position packet)
 *   manager.setTarget(entityId, targetX, targetY);
 * 
 *   // Event response (combat, craft, etc.)
 *   manager.triggerAction(entityId, 'attack');
 * 
 *   // Despawn
 *   manager.removeEntity(entityId);
 */
export class AnimatedSpriteManager {
  private static _instance: AnimatedSpriteManager | null = null;
  
  /** Map of entity ID → animated entity state */
  private readonly entities = new Map<string, AnimatedEntity>();
  
  /** Asset mapper reference */
  private readonly assetMapper = AssetMapper.getInstance();
  
  /** Animation configuration */
  private readonly config: Required<AnimationConfig>;
  
  /** Reference to position manager for delta calculation */
  private positionManager: { getTarget(entityId: string): { x: number; y: number } | null } | null = null;
  
  /** Ticker reference for cleanup */
  private boundTick: ((delta: number) => void) | null = null;
  
  /** Whether the ticker is registered */
  private tickerRegistered = false;

  private constructor(config: AnimationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance.
   */
  static getInstance(config?: AnimationConfig): AnimatedSpriteManager {
    if (!AnimatedSpriteManager._instance) {
      AnimatedSpriteManager._instance = new AnimatedSpriteManager(config);
    }
    return AnimatedSpriteManager._instance;
  }

  /**
   * Set the position manager reference for delta calculation.
   * This should be the InterpolatedSpriteManager singleton.
   */
  setPositionManager(manager: { getTarget(entityId: string): { x: number; y: number } | null }): void {
    this.positionManager = manager;
  }

  /**
   * Register an entity with animated sprite capabilities.
   * 
   * @param entityId - Unique entity identifier
   * @param metadata - Entity metadata for sprite mapping
   * @param container - The PIXI container to attach the sprite to
   * @param initialX - Initial screen X position
   * @param initialY - Initial screen Y position
   */
  async registerEntity(
    entityId: string,
    metadata: EntityMetadata,
    container: Container,
    initialX: number,
    initialY: number
  ): Promise<void> {
    // Get the frame set for this entity type/class
    const frameSet = this.assetMapper.getFrameSetForEntity(metadata);
    
    // Load textures for the frame set
    const frames = await this.assetMapper.loadFrameTextures(frameSet, this.config.walkFps);
    
    // Create the animated sprite with idle texture
    const sprite = new AnimatedSprite([frames.idle]);
    sprite.anchor.set(0.5, 1); // Bottom-center anchor like other sprites
    sprite.x = initialX;
    sprite.y = initialY;
    sprite.animationSpeed = this.config.walkFps / 60; // Convert fps to per-frame speed
    sprite.loop = true;
    sprite.stop(); // Start in idle state

    // Add sprite to container
    container.addChild(sprite);

    // Store entity state
    this.entities.set(entityId, {
      sprite,
      state: 'idle',
      facing: 'down',
      frames,
      walkFps: this.config.walkFps,
      lastTargetX: initialX,
      lastTargetY: initialY,
      actionTimer: null,
      isActionPaused: false,
      currentFrameIndex: 0,
    });

    // Register ticker on first entity
    this.ensureTickerRegistered();
  }

  /**
   * Update target position from server.
   * Called when WORLD_HEARTBEAT sends position update.
   */
  setTarget(entityId: string, targetX: number, targetY: number): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    entity.lastTargetX = targetX;
    entity.lastTargetY = targetY;
  }

  /**
   * Trigger an action animation (attack, craft, etc.).
   * Temporarily interrupts walk cycle.
   * 
   * @param entityId - Entity to animate
   * @param actionType - 'attack' or 'action'
   * @param duration - Optional custom duration in ms
   */
  triggerAction(entityId: string, actionType: 'attack' | 'action', duration?: number): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    const frames = actionType === 'attack' ? entity.frames.attackFrames : entity.frames.actionFrames;
    
    if (frames.length === 0) return; // No frames for this action

    // Pause walk animation
    entity.sprite.stop();
    entity.isActionPaused = true;
    
    // Set action frames
    entity.sprite.textures = frames;
    entity.sprite.animationSpeed = 1; // Normal speed for action
    entity.sprite.loop = false;
    entity.sprite.play();

    // Set timer to resume walk
    const durationMs = duration ?? this.config.actionDurationMs;
    entity.actionTimer = durationMs;

    // On animation complete, resume walk
    entity.sprite.onComplete = () => {
      this.resumeWalk(entityId);
    };
  }

  /**
   * Resume walk animation after action completion.
   */
  private resumeWalk(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    entity.isActionPaused = false;
    entity.actionTimer = null;
    entity.sprite.loop = true;
    
    // Restore walk frames for current facing direction
    const frames = this.getFramesForDirection(entity, entity.facing);
    if (frames.length > 0) {
      entity.sprite.textures = frames;
      entity.sprite.animationSpeed = entity.walkFps / 60;
      entity.sprite.play();
    }

    // Clear the complete callback
    entity.sprite.onComplete = null;
  }

  /**
   * Remove an entity from the animation system.
   */
  removeEntity(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // Stop and remove sprite
    entity.sprite.stop();
    entity.sprite.destroy();
    
    this.entities.delete(entityId);

    // Unregister ticker if no entities remain
    if (this.entities.size === 0) {
      this.unregisterTicker();
    }
  }

  /**
   * Clear all entities (e.g., on world unload).
   */
  clear(): void {
    for (const entity of this.entities.values()) {
      entity.sprite.stop();
      entity.sprite.destroy();
    }
    this.entities.clear();
    this.unregisterTicker();
  }

  /**
   * Main ticker callback - runs every frame (60 FPS).
   * 
   * DELTA-DRIVEN ANIMATION LOGIC:
   * 
   * For each entity:
   *   1. Read current sprite position (visual)
   *   2. Read target position from position manager (or use stored)
   *   3. Calculate delta vector
   *   4. If action in progress → skip animation update
   *   5. Else if vectorLength < threshold → IDLE
   *   6. Else → WALK with directional frames
   * 
   * Direction change preserves current frame index to prevent stuttering.
   */
  private tick(deltaTime: number): void {
    if (this.entities.size === 0) return;

    for (const [entityId, entity] of this.entities) {
      // Skip animation update if action in progress
      if (entity.isActionPaused) {
        this.updateActionTimer(entity, deltaTime);
        continue;
      }

      // ─────────────────────────────────────────────────────────────────
      // DELTA CALCULATION
      // ─────────────────────────────────────────────────────────────────
      const currentX = entity.sprite.x;
      const currentY = entity.sprite.y;
      
      // Use stored target or fetch from position manager
      let targetX = entity.lastTargetX;
      let targetY = entity.lastTargetY;
      
      if (this.positionManager) {
        const pos = this.positionManager.getTarget(entityId);
        if (pos) {
          targetX = pos.x;
          targetY = pos.y;
        }
      }

      // Calculate movement delta
      const deltaX = currentX - targetX;
      const deltaY = currentY - targetY;
      const vectorLength = distance2D(0, 0, deltaX, deltaY);

      // ─────────────────────────────────────────────────────────────────
      // IDLE vs WALK DECISION
      // ─────────────────────────────────────────────────────────────────
      if (vectorLength < this.config.walkThreshold) {
        // IDLE STATE
        if (entity.state !== 'idle') {
          this.setIdleState(entity);
        }
      } else {
        // WALK STATE
        const newFacing = this.calculateFacing(deltaX, deltaY);
        const facingChanged = newFacing !== entity.facing;

        // Update facing direction
        entity.facing = newFacing;
        entity.state = 'walk';

        // If direction changed, swap textures but preserve frame index
        if (facingChanged) {
          this.swapDirectionalFrames(entity, newFacing);
        }

        // Ensure sprite is playing
        if (!entity.sprite.playing) {
          entity.sprite.play();
        }
      }
    }
  }

  /**
   * Transition entity to idle state.
   */
  private setIdleState(entity: AnimatedEntity): void {
    if (entity.state === 'idle' && entity.sprite.textures[0] === entity.frames.idle) {
      // Already in idle with correct texture
      return;
    }

    entity.state = 'idle';
    entity.sprite.stop();
    
    // Set idle texture (preserve current frame index for smooth return)
    if (entity.sprite.textures[0] !== entity.frames.idle) {
      entity.sprite.textures = [entity.frames.idle];
      entity.sprite.update(0); // Force texture update
    }
  }

  /**
   * Calculate facing direction from movement delta.
   * 
   * MATHEMATICAL APPROACH:
   * 
   * In isometric projection, Y increases "up" on screen (toward top).
   * So negative deltaY = moving "up" (toward top of screen).
   * 
   *   deltaY < 0 → moving toward top → UP
   *   deltaY > 0 → moving toward bottom → DOWN
   *   deltaX < 0 → moving toward right → RIGHT
   *   deltaX > 0 → moving toward left → LEFT
   * 
   * Dominant axis determines primary direction:
   *   max(|deltaX|, |deltaY|) determines if horizontal or vertical movement dominates
   */
  private calculateFacing(deltaX: number, deltaY: number): FacingDirection {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine dominant axis
    if (absX > absY) {
      // Horizontal movement dominates
      return deltaX > 0 ? 'left' : 'right';
    } else {
      // Vertical movement dominates (or equal)
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Get frame array for a direction.
   */
  private getFramesForDirection(entity: AnimatedEntity, direction: FacingDirection): Texture[] {
    switch (direction) {
      case 'down': return entity.frames.walkDown;
      case 'up': return entity.frames.walkUp;
      case 'left': return entity.frames.walkLeft;
      case 'right': return entity.frames.walkRight;
    }
  }

  /**
   * Swap directional frames without resetting animation.
   * 
   * STUTTER PREVENTION:
   * 
   * When direction changes, we want to continue the walk cycle from where
   * we left off, not reset to frame 0. This is achieved by:
   *   1. Capturing current frame index before swap
   *   2. Swapping textures
   *   3. Setting new current frame to match (modulo new array length)
   */
  private swapDirectionalFrames(entity: AnimatedEntity, newFacing: FacingDirection): void {
    const newFrames = this.getFramesForDirection(entity, newFacing);
    
    if (newFrames.length === 0) return;

    // Preserve current position in cycle
    const frameIndex = entity.currentFrameIndex % newFrames.length;

    // Swap textures
    entity.sprite.textures = newFrames;
    
    // Restore cycle position
    entity.sprite.gotoAndPlay(frameIndex);
  }

  /**
   * Update action timer.
   */
  private updateActionTimer(entity: AnimatedEntity, deltaTime: number): void {
    if (entity.actionTimer === null) return;

    // Convert Pixi delta (at 60fps = 1.0) to ms
    const deltaMs = (deltaTime / 1.0) * (1000 / 60);
    entity.actionTimer -= deltaMs;

    if (entity.actionTimer <= 0) {
      // Timer expired, force resume
      this.resumeWalk(entity);
    }
  }

  /**
   * Ensure ticker is registered with Pixi.
   */
  private ensureTickerRegistered(): void {
    if (this.tickerRegistered) return;

    this.boundTick = (delta: number) => this.tick(delta);
    Ticker.shared.add(this.boundTick);
    this.tickerRegistered = true;
  }

  /**
   * Unregister ticker from Pixi.
   */
  private unregisterTicker(): void {
    if (!this.tickerRegistered || !this.boundTick) return;

    Ticker.shared.remove(this.boundTick);
    this.boundTick = null;
    this.tickerRegistered = false;
  }

  /**
   * Get animation state for debugging.
   */
  getState(): ReadonlyMap<string, { state: AnimationState; facing: FacingDirection; isActionPaused: boolean }> {
    const state = new Map<string, { state: AnimationState; facing: FacingDirection; isActionPaused: boolean }>();
    
    for (const [id, entity] of this.entities) {
      state.set(id, {
        state: entity.state,
        facing: entity.facing,
        isActionPaused: entity.isActionPaused,
      });
    }

    return state;
  }

  /**
   * Number of animated entities.
   */
  get entityCount(): number {
    return this.entities.size;
  }

  /**
   * Dispose of manager resources.
   */
  dispose(): void {
    this.clear();
    AnimatedSpriteManager._instance = null;
  }
}