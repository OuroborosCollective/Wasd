/**
 * ResonanceWorldBinder.ts
 * 
 * Integrates AutonomousResonanceRouter with the existing WorldPlanAssetBinder.
 * Provides dynamic entity rendering based on WorldLogicalState vectors.
 * 
 * Usage:
 *   import { createResonanceWorldBinder } from './ResonanceWorldBinder';
 *   
 *   const binder = createResonanceWorldBinder(manifest, stitchManifest, textureFor);
 *   
 *   // For enemy rendering
 *   const enemyState: WorldLogicalState = {
 *     baseType: 'enemy',
 *     season: 'winter',
 *     decayLevel: 'high',
 *     culture: 'undead',
 *     biome: 'dungeon'
 *   };
 *   const boundEnemy = binder.bindEnemy(enemyState, 'enemy_spawn_123');
 */

import type { AssetManifest, AssetEntry } from "../assetManifest";
import type { StitchRuntimeManifest } from "../game/stitchAssetManifest";
import type { BoundAsset } from "../world/WorldPlanRenderTypes";
import {
  autonomousResonanceRouter,
  type WorldLogicalState,
  type MaterializationResult,
  fetchStitchManifest,
} from "./AutonomousResonanceRouter";

export interface ResonanceBindingOptions {
  seed?: string;
  debug?: boolean;
}

/**
 * Create a Resonance-aware world binder
 */
export function createResonanceWorldBinder(
  manifest: AssetManifest | null,
  stitchManifest: StitchRuntimeManifest | null,
  textureFor: (src: string | null | undefined) => BoundAsset["texture"],
  options?: ResonanceBindingOptions
) {
  // Initialize the resonance router with both asset pools
  if (stitchManifest?.assets) {
    autonomousResonanceRouter.loadAssetPool(
      stitchManifest.assets,
      manifest ? Object.values(manifest).flatMap(cat => 
        Array.iscat(cat) ? Object.values(cat as any) : []
      ) as AssetEntry[] : []
    );
  }

  const toBoundAsset = (
    semanticType: string,
    result: MaterializationResult,
  ): BoundAsset => ({
    semanticType: semanticType as BoundAsset["semanticType"],
    entry: result.assetId ? {
      id: result.assetId,
      src: result.path,
      category: 'unknown',
    } as AssetEntry : null,
    texture: result.path ? textureFor(result.path) : null,
    debug: options?.debug ? {
      seed: options.seed ?? '',
      semanticType,
      finalScore: result.resonanceScore,
      fallbackUsed: result.fallback,
      matchedVectors: result.matchedVectors,
    } : undefined,
  });

  return {
    /**
     * Bind an enemy entity using resonance scoring
     */
    bindEnemy: (worldState: WorldLogicalState, seed?: string): BoundAsset => {
      const result = autonomousResonanceRouter.materializeEntity({
        ...worldState,
        baseType: 'enemy',
      });
      return toBoundAsset('enemy', result);
    },

    /**
     * Bind an NPC entity using resonance scoring
     */
    bindNpc: (worldState: WorldLogicalState, seed?: string): BoundAsset => {
      const result = autonomousResonanceRouter.materializeEntity({
        ...worldState,
        baseType: 'npc',
      });
      return toBoundAsset('npc', result);
    },

    /**
     * Bind a prop entity using resonance scoring
     */
    bindProp: (worldState: WorldLogicalState, seed?: string): BoundAsset => {
      const result = autonomousResonanceRouter.materializeEntity({
        ...worldState,
        baseType: 'prop',
      });
      return toBoundAsset('prop', result);
    },

    /**
     * Bind a VFX effect using resonance scoring
     */
    bindVfx: (worldState: WorldLogicalState, seed?: string): BoundAsset => {
      const result = autonomousResonanceRouter.materializeEntity({
        ...worldState,
        baseType: 'vfx',
      });
      return toBoundAsset('vfx', result);
    },

    /**
     * Bind equipment overlay using resonance scoring
     */
    bindEquipment: (worldState: WorldLogicalState, seed?: string): BoundAsset => {
      const result = autonomousResonanceRouter.materializeEntity({
        ...worldState,
        baseType: 'equipment',
      });
      return toBoundAsset('equipment', result);
    },

    /**
     * Get all matching assets for a world state (for preview/debugging)
     */
    getMatchingAssets: (worldState: WorldLogicalState) => {
      return autonomousResonanceRouter.getMatchingAssets(worldState);
    },

    /**
     * Get cache statistics
     */
    getCacheStats: () => {
      return autonomousResonanceRouter.getCacheStats();
    },

    /**
     * Clear the materialization cache
     */
    clearCache: () => {
      autonomousResonanceRouter.clearCache();
    },

    /**
     * Get asset pool statistics
     */
    getAssetPoolStats: () => {
      return autonomousResonanceRouter.getAssetPoolStats();
    },
  };
}

// Helper to check if value is array (for manifest iteration)
function ArrayIscat(val: unknown): val is AssetEntry[] {
  return Array.isArray(val);
}

/**
 * Create a ResonanceWorldBinder from existing manifests
 */
export async function createResonanceWorldBinderFromManifests(
  manifest: AssetManifest | null,
  textureFor: (src: string | null | undefined) => BoundAsset["texture"],
  options?: ResonanceBindingOptions
): Promise<ReturnType<typeof createResonanceWorldBinder>> {
  // Fetch Stitch manifest
  const stitchManifest = await fetchStitchManifest();
  
  return createResonanceWorldBinder(manifest, stitchManifest, textureFor, options);
}

// ============================================================================
// COMBAT FX INTEGRATION
// ============================================================================

export interface CombatEffectState extends WorldLogicalState {
  effectType: 'fire' | 'ice' | 'lightning' | 'heal' | 'physical' | 'magic';
  intensity: 'low' | 'medium' | 'high';
}

/**
 * Map combat effect types to culture/season vectors for resonance
 */
function combatEffectToWorldState(effect: CombatEffectState): WorldLogicalState {
  const cultureMap: Record<string, string> = {
    fire: 'arcane',
    ice: 'crystal',
    lightning: 'arcane',
    heal: 'universal',
    physical: 'universal',
    magic: 'arcane',
  };

  const seasonMap: Record<string, string> = {
    fire: 'summer',
    ice: 'winter',
    lightning: 'neutral',
    heal: 'spring',
    physical: 'neutral',
    magic: 'neutral',
  };

  return {
    baseType: 'vfx',
    season: seasonMap[effect.effectType] || 'neutral',
    decayLevel: effect.intensity === 'high' ? 'high' : effect.intensity === 'medium' ? 'medium' : 'low',
    culture: cultureMap[effect.effectType] || 'universal',
  };
}

/**
 * Create a CombatFX renderer using resonance
 */
export function createResonanceCombatFXRenderer(
  textureFor: (src: string | null | undefined) => BoundAsset["texture"],
) {
  return {
    /**
     * Get the appropriate VFX asset for a combat effect
     */
    getEffectAsset: (effect: CombatEffectState): BoundAsset => {
      const worldState = combatEffectToWorldState(effect);
      const result = autonomousResonanceRouter.materializeEntity(worldState);
      
      return {
        semanticType: 'vfx',
        entry: result.assetId ? {
          id: result.assetId,
          src: result.path,
          category: 'vfx',
        } as AssetEntry : null,
        texture: result.path ? textureFor(result.path) : null,
      };
    },

    /**
     * Get all available VFX assets
     */
    getAvailableVfx: () => {
      return autonomousResonanceRouter.getMatchingAssets({
        baseType: 'vfx',
        season: 'neutral',
        decayLevel: 'none',
        culture: 'universal',
      });
    },
  };
}