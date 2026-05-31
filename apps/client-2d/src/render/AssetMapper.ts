/**
 * @fileoverview AssetMapper - Deterministic Sprite-Sheet Mapping
 * 
 * ARCHITECTURE:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Maps entity types (NPC, PLAYER) and classes (blacksmith, guard, etc.) to
 * the correct frame arrays from the JSON atlas. Implements fallback hierarchy
 * so missing classes gracefully degrade to base humanoid animations.
 * 
 * SPRITE SHEET CONVENTION:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Each character class in the atlas uses frame prefixes:
 *   - bs_d_1, bs_d_2, bs_d_3   → walkDown frames (blacksmith example)
 *   - bs_u_1, bs_u_2, bs_u_3   → walkUp frames
 *   - bs_l_1, bs_l_2, bs_l_3   → walkLeft frames
 *   - bs_r_1, bs_r_2, bs_r_3   → walkRight frames
 *   - bs_idle                  → idle/stationary frame
 *   - bs_atk                   → attack frame
 *   - bs_action                → craft/interact frame
 * 
 * The numeric suffix indicates frame order in the walk cycle.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { AssetEntry, AssetManifest } from '../assetManifest';
import { pickCharacterVisual } from '../assetManifest';

/**
 * Direction of entity movement/facing.
 * Used to select appropriate walk cycle frames.
 */
export type FacingDirection = 'down' | 'up' | 'left' | 'right';

/**
 * Animation state for an entity.
 * Determines which frames to play on the AnimatedSprite.
 */
export type AnimationState = 'idle' | 'walk' | 'attack' | 'action';

/**
 * Frame array configuration for a character's animation set.
 * Maps direction to the specific frame IDs from the atlas.
 */
export interface AnimationFrameSet {
  /** Character class prefix in atlas (e.g., 'bs' for blacksmith) */
  prefix: string;
  /** Walk cycle frames for each direction */
  walkDown: string[];
  walkUp: string[];
  walkLeft: string[];
  walkRight: string[];
  /** Single idle frame */
  idle: string;
  /** Attack animation frames (optional) */
  attackFrames?: string[];
  /** Craft/interact frames (optional) */
  actionFrames?: string[];
}

/**
 * Default humanoid animation set.
 * Used when a specific class doesn't have dedicated animations.
 */
const BASE_HUMANOID: AnimationFrameSet = {
  prefix: 'base',
  walkDown: ['base_d_1', 'base_d_2', 'base_d_3'],
  walkUp: ['base_u_1', 'base_u_2', 'base_u_3'],
  walkLeft: ['base_l_1', 'base_l_2', 'base_l_3'],
  walkRight: ['base_r_1', 'base_r_2', 'base_r_3'],
  idle: 'base_idle',
  attackFrames: ['base_atk_1', 'base_atk_2'],
  actionFrames: ['base_action_1', 'base_action_2'],
};

/**
 * Mapping from server entity class to animation frame prefix.
 * The atlas must contain frames with these prefixes.
 */
const CLASS_TO_PREFIX: Record<string, string> = {
  // NPC classes
  blacksmith: 'bs',
  guard: 'gd',
  merchant: 'mc',
  innkeeper: 'ik',
  healer: 'hl',
  farmer: 'fr',
  lumberjack: 'lj',
  miner: 'mn',
  potion_seller: 'ps',
  weapon_smith: 'ws',
  armor_smith: 'as',
  
  // Player classes
  warrior: 'wr',
  mage: 'mg',
  rogue: 'rg',
  ranger: 'rn',
  cleric: 'cl',
  paladin: 'pl',
  
  // Generic
  villager: 'vl',
  npc: 'base',
  player: 'base',
};

/**
 * Core entity metadata used for sprite mapping.
 */
export interface EntityMetadata {
  /** Server entity ID */
  entityId: string;
  /** Entity type: 'NPC' or 'PLAYER' */
  entityType: 'NPC' | 'PLAYER' | 'MONSTER' | 'ITEM';
  /** Entity class from server (e.g., 'blacksmith', 'warrior') */
  entityClass: string;
  /** Optional visual ID from server manifest */
  visualId?: string;
}

/**
 * AssetMapper - Resolves entity metadata to animation frame sets.
 * 
 * Usage:
 * 
 *   const mapper = AssetMapper.getInstance();
 *   const frameSet = mapper.getFrameSetForEntity(metadata);
 *   const textures = await mapper.loadFrameTextures(frameSet);
 * 
 */
export class AssetMapper {
  private static _instance: AssetMapper | null = null;
  
  /** Cache of loaded texture arrays by frame ID */
  private textureCache = new Map<string, PIXI.Texture[]>();
  
  /** Loaded base textures from manifest */
  private baseTextures = new Map<string, PIXI.Texture>();
  
  /** Asset manifest reference */
  private manifest: AssetManifest | null = null;
  
  private constructor() {
    // Private singleton
  }

  /**
   * Get singleton instance.
   */
  static getInstance(): AssetMapper {
    if (!AssetMapper._instance) {
      AssetMapper._instance = new AssetMapper();
    }
    return AssetMapper._instance;
  }

  /**
   * Initialize the mapper with the asset manifest.
   * Call this once during app bootstrap.
   */
  initialize(manifest: AssetManifest, textures: Map<string, PIXI.Texture>): void {
    this.manifest = manifest;
    this.baseTextures = textures;
  }

  /**
   * Get the animation frame set for an entity.
   * 
   * @param metadata - Entity metadata from server
   * @returns AnimationFrameSet with frame IDs and metadata
   */
  getFrameSetForEntity(metadata: EntityMetadata): AnimationFrameSet {
    const classKey = metadata.entityClass.toLowerCase();
    const prefix = CLASS_TO_PREFIX[classKey] ?? 'base';
    
    // Check if we have a complete frame set for this prefix
    const frameSet = this.buildFrameSet(prefix);
    
    if (frameSet) {
      return frameSet;
    }
    
    // Fallback to base humanoid
    console.warn(`[AssetMapper] No frame set for prefix '${prefix}', falling back to base humanoid`);
    return { ...BASE_HUMANOID };
  }

  /**
   * Build a complete frame set from a prefix.
   * Returns null if any required frames are missing from the manifest.
   */
  private buildFrameSet(prefix: string): AnimationFrameSet | null {
    const baseFrames = this.getFrameIdsFromManifest(prefix);
    
    if (baseFrames.length === 0) {
      return null;
    }

    // Build directional walk cycles from the frame IDs
    // Atlas convention: {prefix}_d_{n}, {prefix}_u_{n}, etc.
    const walkDown = this.filterFrames(baseFrames, `${prefix}_d_`);
    const walkUp = this.filterFrames(baseFrames, `${prefix}_u_`);
    const walkLeft = this.filterFrames(baseFrames, `${prefix}_l_`);
    const walkRight = this.filterFrames(baseFrames, `${prefix}_r_`);
    const idleFrames = this.filterFrames(baseFrames, `${prefix}_idle`);
    const attackFrames = this.filterFrames(baseFrames, `${prefix}_atk_`);
    const actionFrames = this.filterFrames(baseFrames, `${prefix}_action`);

    // Require at least walkDown to be valid
    if (walkDown.length === 0) {
      return null;
    }

    return {
      prefix,
      walkDown: walkDown.sort(),
      walkUp: walkUp.sort(),
      walkLeft: walkLeft.sort(),
      walkRight: walkRight.sort(),
      idle: idleFrames[0] ?? walkDown[0], // Use first walk frame as idle fallback
      attackFrames: attackFrames.sort(),
      actionFrames: actionFrames.sort(),
    };
  }

  /**
   * Get all frame IDs from manifest that match a prefix pattern.
   */
  private getFrameIdsFromManifest(prefix: string): string[] {
    if (!this.manifest) return [];

    // Look through characters and props for matching frame entries
    const frameIds: string[] = [];
    
    const categories = ['characters', 'props'] as const;
    
    for (const category of categories) {
      const entries = this.manifest[category];
      if (!entries) continue;
      
      for (const [id, entry] of Object.entries(entries)) {
        // Check if entry ID starts with our prefix
        if (id.toLowerCase().startsWith(prefix)) {
          frameIds.push(id);
        }
        // Also check tags
        const tags = entry.tags ?? [];
        if (tags.some(tag => String(tag).toLowerCase().startsWith(prefix))) {
          frameIds.push(id);
        }
      }
    }

    return [...new Set(frameIds)]; // Deduplicate
  }

  /**
   * Filter frame IDs by prefix pattern.
   */
  private filterFrames(frames: string[], pattern: string): string[] {
    return frames.filter(id => id.toLowerCase().includes(pattern.toLowerCase()));
  }

  /**
   * Load textures for a frame set.
   * Returns an object with directional frame arrays ready for AnimatedSprite.
   * 
   * @param frameSet - Animation frame set from getFrameSetForEntity
   * @param fps - Animation playback speed (default: 8 fps for walk cycle)
   */
  async loadFrameTextures(
    frameSet: AnimationFrameSet,
    fps = 8
  ): Promise<{
    walkDown: PIXI.Texture[];
    walkUp: PIXI.Texture[];
    walkLeft: PIXI.Texture[];
    walkRight: PIXI.Texture[];
    idle: PIXI.Texture;
    attackFrames: PIXI.Texture[];
    actionFrames: PIXI.Texture[];
  }> {
    const resolveTexture = (frameId: string): PIXI.Texture => {
      // Try cache first
      const cached = this.textureCache.get(frameId);
      if (cached) return cached[0];

      // Try base textures
      const base = this.baseTextures.get(frameId);
      if (base) return base;

      // Try partial match in base textures
      for (const [key, texture] of this.baseTextures) {
        if (key.toLowerCase().includes(frameId.toLowerCase())) {
          return texture;
        }
      }

      // Fallback: return transparent 32x32 texture
      console.warn(`[AssetMapper] Texture not found for frame: ${frameId}`);
      return PIXI.Texture.WHITE;
    };

    return {
      walkDown: frameSet.walkDown.map(resolveTexture),
      walkUp: frameSet.walkUp.map(resolveTexture),
      walkLeft: frameSet.walkLeft.map(resolveTexture),
      walkRight: frameSet.walkRight.map(resolveTexture),
      idle: resolveTexture(frameSet.idle),
      attackFrames: (frameSet.attackFrames ?? []).map(resolveTexture),
      actionFrames: (frameSet.actionFrames ?? []).map(resolveTexture),
    };
  }

  /**
   * Get frame set for visual selection from manifest.
   * Used when server provides a visualId rather than class.
   */
  getFrameSetForVisualId(visualId: string, entityClass: string): AnimationFrameSet {
    // First try to find the visual in manifest
    const result = pickCharacterVisual(this.manifest, {
      visualId,
      tags: [],
      group: null,
      kind: entityClass,
    });

    if (result) {
      // Create frame set from the visual entry
      return this.createFrameSetFromEntry(result.id, result.entry);
    }

    // Fallback to class-based mapping
    return this.getFrameSetForEntity({
      entityId: 'temp',
      entityType: 'PLAYER',
      entityClass,
      visualId,
    });
  }

  /**
   * Create frame set from a manifest entry.
   */
  private createFrameSetFromEntry(entryId: string, entry: AssetEntry): AnimationFrameSet {
    const basePrefix = entryId.toLowerCase().split('_')[0];
    
    // Check for animation data in the entry
    const animations = entry.animations;
    
    if (animations && typeof animations === 'object') {
      // Use provided animation frames
      return {
        prefix: basePrefix,
        walkDown: (animations.walkDown as string[]) ?? [],
        walkUp: (animations.walkUp as string[]) ?? [],
        walkLeft: (animations.walkLeft as string[]) ?? [],
        walkRight: (animations.walkRight as string[]) ?? [],
        idle: (animations.idle as string) ?? entryId,
        attackFrames: (animations.attack as string[]) ?? [],
        actionFrames: (animations.action as string[]) ?? [],
      };
    }

    // Build from frame data
    return this.buildFrameSetFromFrameData(entryId, entry) ?? { ...BASE_HUMANOID };
  }

  /**
   * Build frame set from frame dimensions.
   */
  private buildFrameSetFromFrameData(entryId: string, entry: AssetEntry): AnimationFrameSet | null {
    if (!entry.frame && !entry.width) {
      return null;
    }

    const basePrefix = entryId.toLowerCase().split('_')[0];
    const frame = entry.frame;
    const width = entry.width ?? (frame?.w ?? 32);
    const height = entry.height ?? (frame?.h ?? 32);

    // For a single frame entry, create a minimal frame set
    return {
      prefix: basePrefix,
      walkDown: [entryId],
      walkUp: [entryId],
      walkLeft: [entryId],
      walkRight: [entryId],
      idle: entryId,
    };
  }

  /**
   * Clear texture cache (call on world unload).
   */
  clearCache(): void {
    this.textureCache.clear();
  }

  /**
   * Dispose of mapper resources.
   */
  dispose(): void {
    this.textureCache.clear();
    this.baseTextures.clear();
    this.manifest = null;
    AssetMapper._instance = null;
  }
}

// Re-export for convenience
export type { AssetManifest, AssetEntry } from '../assetManifest';