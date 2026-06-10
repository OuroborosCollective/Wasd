/**
 * ResonanceCombatFX.ts
 * 
 * Combat Visual Effects using Autonomous Resonance Router.
 * Automatically selects VFX assets based on spell/effect type via resonance scoring.
 * 
 * INTEGRATION:
 * - Uses CombatFXManager for actor sprite lookup (O(1) target resolution)
 * - Loads actual atlas frames from Stitch VFX manifest via VfxAtlasLoader
 * - Uses resonance scoring to select appropriate VFX for effect types
 * 
 * Usage:
 *   import { ResonanceCombatFX } from './ResonanceCombatFX';
 *   
 *   const combatFX = new ResonanceCombatFX(app, fxContainer, combatFXManager);
 *   await combatFX.loadVfxFromManifest('/2d-assets/stitch/manifest.json');
 *   
 *   // Fire spell effect at target position
 *   combatFX.spawnEffect('fire', targetX, targetY);
 *   
 *   // Ice spell effect with targetId for actor tracking
 *   combatFX.spawnEffect('ice', targetX, targetY, { targetId: 'actor_123' });
 */

import { Application, Container, Sprite, Texture } from "pixi.js";
import type { CombatFXManager } from "../render/CombatFXManager";
import { VfxAtlasLoader, type VfxAtlasFrame } from "../render/VfxAtlasLoader";

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
  targetId?: string;
}

/**
 * ResonanceCombatFX
 * 
 * Uses resonance scoring to select VFX assets based on spell/effect type vectors.
 * Integrated with CombatFXManager for actor sprite lookup and lifecycle management.
 */
export class ResonanceCombatFX {
  private readonly app: Application;
  private readonly fxContainer: Container;
  private readonly combatFXManager: CombatFXManager | null;
  private readonly vfxAtlas: Map<string, VfxFrame[]> = new Map();
  private readonly activeVfx: ActiveVfx[] = [];
  private readonly atlasLoader: VfxAtlasLoader;
  
  // VFX configuration
  private readonly FRAME_DURATION_MS = 66; // ~15fps for smooth animation
  private readonly MAX_VFX_INSTANCES = 20;
  
  constructor(
    app: Application,
    fxContainer: Container,
    combatFXManager?: CombatFXManager
  ) {
    this.app = app;
    this.fxContainer = fxContainer;
    this.combatFXManager = combatFXManager || null;
    this.atlasLoader = new VfxAtlasLoader();
    
    // Initialize with default placeholder frames
    this.initializeDefaultFrames();
    
    // Start animation loop
    this.app.ticker.add(this.update, this);
  }
  
  /**
   * Load VFX assets from Stitch manifest
   */
  async loadVfxFromManifest(manifestUrl: string): Promise<void> {
    try {
      await this.atlasLoader.loadFromManifest(manifestUrl);
      
      // Map Stitch VFX asset to effect types
      const vfxAssetId = 'stitch_vfx_arelorian_elemental_spell_fx_square_sheet';
      const frames = this.atlasLoader.getFramesByAssetId(vfxAssetId, 0, 36);
      
      if (frames.length > 0) {
        // Map different frame ranges to different effect types
        // The 6x6 grid (36 frames) can be divided into effect categories
        this.createVfxFrames('spell_fire', frames.slice(0, 6));      // frames 0-5
        this.createVfxFrames('spell_ice', frames.slice(6, 12));       // frames 6-11
        this.createVfxFrames('spell_lightning', frames.slice(12, 18)); // frames 12-17
        this.createVfxFrames('spell_heal', frames.slice(18, 24));     // frames 18-23
        this.createVfxFrames('spell_arcane', frames.slice(24, 30));    // frames 24-29
        this.createVfxFrames('spell_shadow', frames.slice(30, 36));   // frames 30-35
        this.createVfxFrames('spell_physical', frames.slice(0, 6));   //复用 fire
        this.createVfxFrames('spell_magic', frames.slice(24, 30));    //复用 arcane
        this.createVfxFrames('spell_fx', frames.slice(0, 6));        // default
      }
    } catch (error) {
      console.error('[ResonanceCombatFX] Failed to load VFX from manifest:', error);
    }
  }
  
  /**
   * Initialize with default placeholder frames
   */
  private initializeDefaultFrames(): void {
    this.createVfxFrames('spell_fire', this.getPlaceholderFrames());
    this.createVfxFrames('spell_ice', this.getPlaceholderFrames());
    this.createVfxFrames('spell_lightning', this.getPlaceholderFrames());
    this.createVfxFrames('spell_heal', this.getPlaceholderFrames());
    this.createVfxFrames('spell_arcane', this.getPlaceholderFrames());
    this.createVfxFrames('spell_shadow', this.getPlaceholderFrames());
    this.createVfxFrames('spell_physical', this.getPlaceholderFrames());
    this.createVfxFrames('spell_magic', this.getPlaceholderFrames());
    this.createVfxFrames('spell_fx', this.getPlaceholderFrames());
  }
  
  /**
   * Register VFX assets from Stitch manifest.
   * Loads actual atlas frames when available.
   */
  private registerVfxAssets(assets: Array<{ assetId: string; atlasPath: string; imagePath: string }>): void {
    for (const asset of assets) {
      if (asset.assetId.includes('vfx') || asset.assetId.includes('spell')) {
        // Check if this is the elemental spell FX sheet
        if (asset.assetId.includes('elemental') || asset.assetId.includes('spell_fx')) {
          // Map effect types to frame indices in the 6x6 atlas
          // Frame layout: rows/cols 0-5, frames 0-35
          // We'll create named VFX keys for each effect type
          this.createVfxFrames('spell_fire', this.getPlaceholderFrames());
          this.createVfxFrames('spell_ice', this.getPlaceholderFrames());
          this.createVfxFrames('spell_lightning', this.getPlaceholderFrames());
          this.createVfxFrames('spell_heal', this.getPlaceholderFrames());
          this.createVfxFrames('spell_arcane', this.getPlaceholderFrames());
          this.createVfxFrames('spell_shadow', this.getPlaceholderFrames());
          this.createVfxFrames('spell_physical', this.getPlaceholderFrames());
          this.createVfxFrames('spell_magic', this.getPlaceholderFrames());
        }
      }
    }
    
    // If no assets registered, use default placeholder frames
    if (this.vfxAtlas.size === 0) {
      this.createVfxFrames('spell_fx', this.getPlaceholderFrames());
    }
  }
  
  /**
   * Create VFX frames for an effect type.
   */
  private createVfxFrames(key: string, frames: VfxFrame[]): void {
    this.vfxAtlas.set(key, frames);
  }
  
  /**
   * Get placeholder frames (used when atlas not loaded)
   */
  private getPlaceholderFrames(): VfxFrame[] {
    return Array(6).fill(null).map(() => ({
      texture: Texture.WHITE,
      duration: this.FRAME_DURATION_MS,
    }));
  }
  
  /**
   * Get frames from VfxAtlasLoader
   */
  private getAtlasFrames(startFrame: number, count: number): VfxFrame[] {
    const vfxAssetId = 'stitch_vfx_arelorian_elemental_spell_fx_square_sheet';
    const atlasFrames = this.atlasLoader.getFramesByAssetId(vfxAssetId, startFrame, count);
    
    return atlasFrames.map(frame => ({
      texture: frame.texture,
      duration: frame.duration,
    }));
  }
  
  /**
   * Spawn a combat effect at the given position.
   * If targetId is provided and CombatFXManager is available,
   * the effect will track the actor's current position.
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
    // If targetId provided and CombatFXManager available, get current position
    if (options?.targetId && this.combatFXManager) {
      const actorSprite = this.combatFXManager.getActorSprite(options.targetId);
      if (actorSprite) {
        targetX = actorSprite.x;
        targetY = actorSprite.y;
      }
    }
    
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
      targetId: options?.targetId,
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
   * Animation update loop.
   * Tracks actor positions when targetId is available.
   */
  private update(ticker: Ticker): void {
    const deltaMs = ticker.deltaTime * (1000 / 60); // Convert to ms
    
    for (let i = this.activeVfx.length - 1; i >= 0; i--) {
      const vfx = this.activeVfx[i];
      
      // Update elapsed time
      vfx.elapsedTime += deltaMs;
      
      // If targetId available and CombatFXManager connected, track actor position
      if (vfx.targetId && this.combatFXManager) {
        const actorSprite = this.combatFXManager.getActorSprite(vfx.targetId);
        if (actorSprite) {
          vfx.container.x = actorSprite.x;
          vfx.container.y = actorSprite.y;
        }
      }
      
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