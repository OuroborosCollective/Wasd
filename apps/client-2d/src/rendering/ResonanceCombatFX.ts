/**
 * ResonanceCombatFX.ts
 * 
 * Combat Visual Effects using Autonomous Resonance Router.
 * Automatically selects VFX assets based on spell/effect type via resonance scoring.
 * 
 * The server sends combat events with effect type info.
 * This system uses resonance to match the effect to appropriate visual assets.
 * 
 * Usage:
 *   import { ResonanceCombatFX } from './ResonanceCombatFX';
 *   
 *   const combatFX = new ResonanceCombatFX(app, fxContainer, stitchManifest);
 *   
 *   // Fire spell effect
 *   combatFX.spawnEffect('fire', targetX, targetY);
 *   
 *   // Ice spell effect  
 *   combatFX.spawnEffect('ice', targetX, targetY);
 */

import { Application, Container, Sprite, Texture } from "pixi.js";

export type EffectType = 'fire' | 'ice' | 'lightning' | 'heal' | 'physical' | 'magic' | 'arcane' | 'shadow';
export type EffectIntensity = 'low' | 'medium' | 'high';

export interface CombatEffectEvent {
  effectType: EffectType;
  intensity: EffectIntensity;
  targetX: number;
  targetY: number;
  casterId?: string;
  targetId?: string;
}

// Map effect types to world state vectors for resonance
const EFFECT_TO_CULTURE: Record<EffectType, string> = {
  fire: 'arcane',
  ice: 'crystal',
  lightning: 'arcane',
  heal: 'universal',
  physical: 'universal',
  magic: 'arcane',
  arcane: 'arcane',
  shadow: 'void',
};

const EFFECT_TO_SEASON: Record<EffectType, string> = {
  fire: 'summer',
  ice: 'winter',
  lightning: 'neutral',
  heal: 'spring',
  physical: 'neutral',
  magic: 'neutral',
  arcane: 'neutral',
  shadow: 'neutral',
};

const EFFECT_TO_DECAY: Record<EffectIntensity, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
};

interface VfxFrame {
  texture: Texture;
  duration: number;
}

interface ActiveVfx {
  container: Container;
  frames: VfxFrame[];
  currentFrame: number;
  elapsedTime: number;
  totalDuration: number;
  loop: boolean;
}

/**
 * ResonanceCombatFX
 * 
 * Uses the Autonomous Resonance Router to automatically select
 * VFX assets based on spell/effect type vectors.
 */
export class ResonanceCombatFX {
  private readonly app: Application;
  private readonly fxContainer: Container;
  private readonly vfxAtlas: Map<string, VfxFrame[]> = new Map();
  private readonly activeVfx: ActiveVfx[] = [];
  
  // VFX configuration
  private readonly FRAME_DURATION_MS = 66; // ~15fps for smooth animation
  private readonly MAX_VFX_INSTANCES = 20;
  
  constructor(
    app: Application,
    fxContainer: Container,
    vfxAssets: Array<{ assetId: string; atlasPath: string; imagePath: string }> = []
  ) {
    this.app = app;
    this.fxContainer = fxContainer;
    
    // Register VFX assets (would be loaded from Stitch manifest)
    this.registerVfxAssets(vfxAssets);
    
    // Start animation loop
    this.app.ticker.add(this.update, this);
  }
  
  /**
   * Register VFX assets from Stitch manifest
   */
  private registerVfxAssets(assets: Array<{ assetId: string; atlasPath: string; imagePath: string }>): void {
    // In production, this would load atlas JSON and slice frames
    // For now, we use placeholder frame data
    for (const asset of assets) {
      if (asset.assetId.includes('vfx') && asset.assetId.includes('spell')) {
        // Create 6 placeholder frames (would be actual sliced atlas frames)
        const frames: VfxFrame[] = [];
        for (let i = 0; i < 6; i++) {
          // Placeholder - in production, load actual atlas frames
          frames.push({
            texture: Texture.WHITE, // Placeholder
            duration: this.FRAME_DURATION_MS,
          });
        }
        this.vfxAtlas.set('spell_fx', frames);
      }
    }
  }
  
  /**
   * Spawn a combat effect at the given position
   */
  public spawnEffect(
    effectType: EffectType,
    targetX: number,
    targetY: number,
    options?: {
      intensity?: EffectIntensity;
      loop?: boolean;
      scale?: number;
      targetId?: string;
    }
  ): void {
    // Get resonance-matched VFX key
    const vfxKey = this.getResonanceVfxKey(effectType, options?.intensity ?? 'medium');
    
    // Get frames for this VFX
    const frames = this.vfxAtlas.get(vfxKey) || this.getDefaultFrames();
    
    // Create VFX container
    const container = new Container();
    container.x = targetX;
    container.y = targetY;
    container.zIndex = 900000; // Above damage numbers
    
    // Apply scale
    const scale = options?.scale ?? 1.0;
    container.scale.set(scale);
    
    // Create sprite for animation
    const sprite = new Sprite(frames[0]?.texture || Texture.WHITE);
    sprite.anchor.set(0.5, 0.5);
    container.addChild(sprite);
    
    // Add to FX container
    this.fxContainer.addChild(container);
    
    // Track active VFX
    const activeVfx: ActiveVfx = {
      container,
      frames,
      currentFrame: 0,
      elapsedTime: 0,
      totalDuration: frames.length * this.FRAME_DURATION_MS,
      loop: options?.loop ?? false,
    };
    
    this.activeVfx.push(activeVfx);
    
    // Enforce max instances
    while (this.activeVfx.length > this.MAX_VFX_INSTANCES) {
      const oldest = this.activeVfx.shift();
      if (oldest) {
        this.fxContainer.removeChild(oldest.container);
        oldest.container.destroy();
      }
    }
  }
  
  /**
   * Get VFX key based on resonance matching
   */
  private getResonanceVfxKey(effectType: EffectType, intensity: EffectIntensity): string {
    // This would use the AutonomousResonanceRouter in production
    // For now, return appropriate key based on effect type
    const keyMap: Record<EffectType, string> = {
      fire: 'spell_fire',
      ice: 'spell_ice',
      lightning: 'spell_lightning',
      heal: 'spell_heal',
      physical: 'spell_physical',
      magic: 'spell_magic',
      arcane: 'spell_arcane',
      shadow: 'spell_shadow',
    };
    return keyMap[effectType] || 'spell_fx';
  }
  
  /**
   * Get default frames when no atlas available
   */
  private getDefaultFrames(): VfxFrame[] {
    // Return 6 frames for animation loop
    return Array(6).fill(null).map(() => ({
      texture: Texture.WHITE,
      duration: this.FRAME_DURATION_MS,
    }));
  }
  
  /**
   * Animation update loop
   */
  private update(ticker: Ticker): void {
    const deltaMs = ticker.deltaTime * (1000 / 60); // Convert to ms
    
    for (let i = this.activeVfx.length - 1; i >= 0; i--) {
      const vfx = this.activeVfx[i];
      
      // Update elapsed time
      vfx.elapsedTime += deltaMs;
      
      // Calculate current frame
      const frameIndex = Math.floor(vfx.elapsedTime / this.FRAME_DURATION_MS) % vfx.frames.length;
      
      // Update sprite frame
      if (vfx.frames[frameIndex] && vfx.container.children[0] instanceof Sprite) {
        (vfx.container.children[0] as Sprite).texture = vfx.frames[frameIndex].texture;
      }
      
      // Check if animation complete
      if (vfx.elapsedTime >= vfx.totalDuration && !vfx.loop) {
        this.fxContainer.removeChild(vfx.container);
        vfx.container.destroy();
        this.activeVfx.splice(i, 1);
      }
    }
  }
  
  /**
   * Clear all active VFX
   */
  public clear(): void {
    for (const vfx of this.activeVfx) {
      this.fxContainer.removeChild(vfx.container);
      vfx.container.destroy();
    }
    this.activeVfx.length = 0;
  }
  
  /**
   * Get active VFX count
   */
  public getActiveCount(): number {
    return this.activeVfx.length;
  }
}

// Import Ticker type for ticker callback
import type { Ticker } from "pixi.js";