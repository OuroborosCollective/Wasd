/**
 * CombatFXManager - PixiJS Combat Visual Effects (Fire & Forget)
 * 
 * ARCHITECTURE:
 * - Strict Decoupling: FX never mutates HP, kappaPos, or any logical entity state
 * - O(1) Actor Lookup: actorSpriteMap enables instant targetId → Sprite resolution
 * - Pixi Ticker Lifecycle: All animations use app.ticker (no setTimeout)
 * - Garbage Collection: FX objects are destroyed on lifetime expiry
 * 
 * PILLAR: Server Authority
 * - All FX is triggered as reaction to async server events (COMBAT_RESULT)
 * - No preemptive FX on client-side click actions
 */

import { Application, Container, Text, Ticker } from "pixi.js";

/** Floating damage number node with lifecycle metadata */
type DamageNode = {
  node: Text;
  velocityY: number;  // Pixels per frame (float upward)
  lifetime: number;   // Frames until destruction
};

/** Hit flash overlay tint */
type FlashNode = {
  container: Container;
  originalTint: number;
  flashTicks: number;
};

/**
 * CombatFXManager
 * Manages floating damage numbers and hit flash effects.
 * All effects are self-contained and self-destructing.
 */
export class CombatFXManager {
  /** O(1) lookup: targetId → PIXI.Container for immediate position resolution */
  private readonly actorSpriteMap = new Map<string, Container>();
  
  /** Active floating damage numbers (fire & forget) */
  private readonly damageNodes: DamageNode[] = [];
  
  /** Active hit flash effects */
  private readonly flashNodes: FlashNode[] = [];
  
  /** Reference to FX container (Z-index above world layer) */
  private readonly fxContainer: Container;
  
  /** Reference to app ticker for animation loop */
  private readonly ticker: Ticker;
  
  /** Default animation parameters */
  private readonly DAMAGE_VELOCITY_Y = -0.85;    // Float upward
  private readonly FADE_RATE = 0.028;            // Alpha decrement per frame
  private readonly FLASH_DURATION_TICKS = 9;     // ~150ms at 60fps
  private readonly DAMAGE_Y_OFFSET = 54;        // Above actor anchor

  constructor(app: Application, fxLayer: Container) {
    this.fxContainer = fxLayer;
    this.ticker = app.ticker;
    
    // Register the animation tick callback
    this.ticker.add(this.update, this);
  }

  /**
   * Register actor sprite for O(1) lookup.
   * Called during WORLD_HEARTBEAT processing when actors are created/updated.
   */
  registerActor(actorId: string, sprite: Container): void {
    this.actorSpriteMap.set(actorId, sprite);
  }

  /**
   * Unregister actor when it leaves the visible area.
   * Prevents memory leaks from stale entries.
   */
  unregisterActor(actorId: string): void {
    this.actorSpriteMap.delete(actorId);
  }

  /**
   * Get actor sprite for VFX positioning.
   * Returns undefined if actor not registered.
   */
  getActorSprite(actorId: string): Container | undefined {
    return this.actorSpriteMap.get(actorId);
  }

  /**
   * Get all registered actor IDs.
   * Useful for debugging and batch operations.
   */
  getRegisteredActorIds(): string[] {
    return Array.from(this.actorSpriteMap.keys());
  }

  /**
   * Spawn floating damage number at target position.
   * 
   * @param x - Screen X coordinate (falls back to actor position via targetId)
   * @param y - Screen Y coordinate (falls back to actor position via targetId)
   * @param amount - Damage amount (negative = healing)
   * @param isMiss - Whether attack missed
   */
  spawnDamageNumber(
    x: number,
    y: number,
    amount: number,
    isMiss: boolean
  ): void {
    // Create damage text node
    // Android-optimized: bold stroke, high contrast
    const label = new Text({
      text: this.formatDamage(amount, isMiss),
      style: {
        fontFamily: "monospace",
        fontSize: isMiss ? 14 : 20,
        fontWeight: "900",
        fill: isMiss ? 0xaaaaaa : (amount < 0 ? 0x4eff4e : 0xff5151),
        stroke: { 
          color: isMiss ? 0x333333 : 0x2b0202, 
          width: isMiss ? 3 : 5 
        },
      },
    });

    // Position above actor (anchor at bottom-center)
    label.anchor.set(0.5, 1);
    label.x = x;
    label.y = y - this.DAMAGE_Y_OFFSET;
    label.alpha = 1;
    label.zIndex = 1000000;  // Above all world content

    // Add to FX container
    this.fxContainer.addChild(label);

    // Register with lifecycle tracking
    this.damageNodes.push({
      node: label,
      velocityY: this.DAMAGE_VELOCITY_Y * (isMiss ? 0.7 : 1),
      lifetime: isMiss ? 30 : 45,  // Miss fades faster
    });
  }

  /**
   * Spawn hit flash effect on target actor.
   * Temporarily tints the actor sprite red for visual impact.
   */
  spawnHitFlash(targetId: string): void {
    const sprite = this.actorSpriteMap.get(targetId);
    if (!sprite) return;

    // Store original tint for restoration
    const flashNode: FlashNode = {
      container: sprite,
      originalTint: (sprite as any).tint ?? 0xffffff,
      flashTicks: this.FLASH_DURATION_TICKS,
    };

    // Apply red tint
    (sprite as any).tint = 0xff0000;
    this.flashNodes.push(flashNode);
  }

  /**
   * Pixi Ticker callback - drives all FX animations.
   * Called every frame (~60fps).
   */
  private update(ticker: Ticker): void {
    const delta = ticker.deltaTime;
    this.updateDamageNumbers(delta);
    this.updateHitFlashes(delta);
  }

  /**
   * Animate floating damage numbers: rise + fade + destroy.
   */
  private updateDamageNumbers(delta: number): void {
    for (let i = this.damageNodes.length - 1; i >= 0; i--) {
      const dn = this.damageNodes[i];
      
      // Float upward
      dn.node.y += dn.velocityY * delta;
      
      // Fade out
      dn.node.alpha = Math.max(0, dn.node.alpha - this.FADE_RATE * delta);
      
      // Decrement lifetime
      dn.lifetime -= delta;

      // Destroy when expired
      if (dn.lifetime <= 0 || dn.node.alpha <= 0) {
        this.fxContainer.removeChild(dn.node);
        dn.node.destroy();
        this.damageNodes.splice(i, 1);
      }
    }
  }

  /**
   * Animate hit flash: restore original tint after duration.
   */
  private updateHitFlashes(delta: number): void {
    for (let i = this.flashNodes.length - 1; i >= 0; i--) {
      const fn = this.flashNodes[i];
      fn.flashTicks -= delta;

      if (fn.flashTicks <= 0) {
        // Restore original tint
        (fn.container as any).tint = fn.originalTint;
        this.flashNodes.splice(i, 1);
      }
    }
  }

  /**
   * Format damage amount for display.
   * Positive damage = red negative text
   * Negative amount = green positive text (healing)
   */
  private formatDamage(amount: number, isMiss: boolean): string {
    if (isMiss) return "MISS";
    const rounded = Math.round(Math.abs(amount));
    return amount < 0 ? `+${rounded}` : `-${rounded}`;
  }

  /**
   * Cleanup all resources.
   * Call on app destroy or unmount.
   */
  destroy(): void {
    this.ticker.remove(this.update, this);
    
    // Destroy all active damage nodes
    for (const dn of this.damageNodes) {
      this.fxContainer.removeChild(dn.node);
      dn.node.destroy();
    }
    this.damageNodes.length = 0;

    // Restore any tinted sprites
    for (const fn of this.flashNodes) {
      (fn.container as any).tint = fn.originalTint;
    }
    this.flashNodes.length = 0;

    // Clear actor map
    this.actorSpriteMap.clear();
  }
}