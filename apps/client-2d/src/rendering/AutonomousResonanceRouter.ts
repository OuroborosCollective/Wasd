/**
 * AutonomousResonanceRouter.ts
 * 
 * The Observer Function - collapses logical world state into visual reality.
 * 
 * AXIOM OF THE OBSERVER:
 * The server calculates pure logic and vectors (Unified Field Theory).
 * The 2D Client acts as the "Observer" that collapses this data into reality.
 * If the server dictates a state of "Winter, High Decay, Elven Culture",
 * this router autonomously searches the asset pool and renders the asset
 * that resonates most strongly with this exact vector state.
 * 
 * STRICT INTEGER MATH ONLY - No floating point for resonance calculation.
 * 
 * Architecture:
 * - scripts/AutoAssetDirector.mjs parses filenames into logical metadata (tags)
 * - This router implements the Resonance Scoring Algorithm
 * - Cost Brake: caches materialization results per unique WorldState vector
 */

import type { StitchRuntimeAsset } from "../game/stitchAssetManifest";
import type { AssetEntry } from "../assetManifest";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * World Logical State - The pure vector state from server
 */
export interface WorldLogicalState {
  baseType: string;      // e.g., 'tree', 'wall', 'npc', 'enemy', 'vfx', 'prop'
  season: string;        // e.g., 'winter', 'spring', 'summer', 'autumn', 'neutral'
  decayLevel: string;   // e.g., 'high', 'medium', 'low', 'none'
  culture: string;      // e.g., 'elven', 'human', 'dwarven', 'universal'
  biome?: string;       // e.g., 'forest', 'swamp', 'mountain', 'plains'
  environment?: string;  // e.g., 'indoor', 'outdoor', 'underground'
}

/**
 * Asset Resonance Tags - Extracted from filename by AutoAssetDirector
 * Each asset has implicit meta-tags that define its ontological identity
 */
export interface AssetResonanceTags {
  baseType: string;
  season: string;
  decay: string;
  culture: string;
  biome?: string;
  environment?: string;
}

/**
 * Asset with Resonance Tags for scoring
 */
export interface ResonanceAsset {
  assetId: string;
  category: string;
  path: string;
  atlasPath?: string;
  tags: AssetResonanceTags;
  sourcePath: string;
}

/**
 * Materialization Result - The collapsed visual reality
 */
export interface MaterializationResult {
  assetId: string;
  path: string;
  resonanceScore: number;
  matchedVectors: string[];
  fallback: boolean;
}

// ============================================================================
// RESONANCE SCORING WEIGHTS (INTEGER ONLY - KappaInt equivalents)
// ============================================================================

const SCORE_WEIGHTS = {
  BASE_TYPE_MATCH: 1000,    // Mandatory match - base type must match
  SEASON_MATCH: 300,        // Season vector match
  SEASON_NEUTRAL: 100,      // Neutral season has weak resonance
  DECAY_MATCH: 200,        // Decay level match
  CULTURE_MATCH: 400,      // Culture vector match (strongest after base)
  CULTURE_UNIVERSAL: 150,   // Universal culture has medium resonance
  BIOME_MATCH: 250,        // Biome environmental match
  ENVIRONMENT_MATCH: 150,   // Environment context match
} as const;

// Fallback sprite when no resonance found
const FALLBACK_ASSET_ID = "fallback_error_sprite";

// ============================================================================
// TAG EXTRACTION (for AutoAssetDirector)
// ============================================================================

/**
 * Extract ontological tags from filename (used by import scripts)
 * Example: "tree_winter_decay_elf.png" -> { baseType: 'tree', season: 'winter', decay: 'high', culture: 'elven' }
 */
export function extractResonanceTagsFromFilename(filename: string): AssetResonanceTags {
  // Remove extension
  const baseName = filename.replace(/\.[^/.]+$/, "");
  // Split by underscore or hyphen
  const tokens = baseName.toLowerCase().split(/[_-]/);
  
  // Define keyword mappings
  const SEASON_KEYWORDS = ['winter', 'spring', 'summer', 'autumn', 'frost', 'bloom'];
  const DECAY_KEYWORDS = ['decay', 'ruined', 'broken', 'withered', 'destroyed', 'ancient'];
  const CULTURE_KEYWORDS = [
    'elf', 'elven', 'human', 'dwarven', 'dwarf', 'orc', 'gothic', 'nordic', 'arcane',
    'cyber', 'undead', 'crystal', 'solar', 'void', 'eldritch'
  ];
  const BIOME_KEYWORDS = ['forest', 'swamp', 'marsh', 'mountain', 'plains', 'desert', 'snow', 'cave', 'dungeon'];
  const ENVIRONMENT_KEYWORDS = ['indoor', 'outdoor', 'underground', 'ruins', 'settlement'];
  
  // Handle Stitch naming convention: stitch_{category}_{rest}
  // e.g., "stitch_enemy_undead_blade_walker" -> baseType = "enemy"
  let baseType = tokens[0] || "unknown";
  
  if (baseType === 'stitch' && tokens.length > 1) {
    // Stitch asset - use second token as base type
    baseType = tokens[1];
  }
  
  // Find season
  let season = "neutral";
  for (const token of tokens) {
    if (SEASON_KEYWORDS.some(k => token.includes(k))) {
      if (token.includes('frost') || token.includes('winter') || token.includes('snow')) season = "winter";
      else if (token.includes('bloom') || token.includes('spring')) season = "spring";
      else if (token.includes('summer')) season = "summer";
      else if (token.includes('autumn') || token.includes('fall')) season = "autumn";
      break;
    }
  }
  
  // Find decay level
  let decay = "none";
  for (const token of tokens) {
    if (DECAY_KEYWORDS.some(k => token.includes(k))) {
      if (token.includes('ancient') || token.includes('ruined')) decay = "high";
      else if (token.includes('destroyed') || token.includes('broken')) decay = "medium";
      else decay = "high"; // Default to high for any decay keyword
      break;
    }
  }
  
  // Find culture
  let culture = "universal";
  for (const token of tokens) {
    if (token.includes('elf') || token.includes('elven')) culture = "elven";
    else if (token.includes('human')) culture = "human";
    else if (token.includes('dwarf') || token.includes('dwarven')) culture = "dwarven";
    else if (token.includes('orc')) culture = "orc";
    else if (token.includes('gothic') || token.includes('eldritch')) culture = "gothic";
    else if (token.includes('nordic')) culture = "nordic";
    else if (token.includes('arcane') || token.includes('magic')) culture = "arcane";
    break;
  }
  
  // Find biome
  let biome: string | undefined;
  for (const token of tokens) {
    if (token.includes('forest') || token.includes('wood')) biome = "forest";
    else if (token.includes('swamp') || token.includes('marsh')) biome = "swamp";
    else if (token.includes('mountain') || token.includes('rock')) biome = "mountain";
    else if (token.includes('desert') || token.includes('sand')) biome = "desert";
    else if (token.includes('snow') || token.includes('ice')) biome = "snow";
    else if (token.includes('cave') || token.includes('dungeon')) biome = "dungeon";
    else if (token.includes('plains') || token.includes('field')) biome = "plains";
    break;
  }
  
  // Find environment
  let environment: string | undefined;
  for (const token of tokens) {
    if (token.includes('indoor') || token.includes('inside')) environment = "indoor";
    else if (token.includes('ruin')) environment = "ruins";
    else if (token.includes('settlement') || token.includes('village')) environment = "settlement";
    break;
  }
  
  return {
    baseType,
    season,
    decay,
    culture,
    ...(biome && { biome }),
    ...(environment && { environment }),
  };
}

// ============================================================================
// AUTONOMOUS RESONANCE ROUTER
// ============================================================================

export class AutonomousResonanceRouter {
  private assetPool: ResonanceAsset[] = [];
  private materializationCache: Map<string, MaterializationResult> = new Map();
  
  /**
   * Load assets from both Main and Stitch manifests
   * Each asset will be enriched with resonance tags
   */
  public loadAssetPool(
    stitchAssets: StitchRuntimeAsset[],
    mainAssets: AssetEntry[] = []
  ): void {
    this.assetPool = [];
    this.materializationCache.clear();
    
    // Load Stitch assets with tags from manifest
    for (const asset of stitchAssets) {
      const tags = this.extractTagsFromStitchAsset(asset);
      this.assetPool.push({
        assetId: asset.assetId,
        category: asset.category,
        path: `/2d-assets/stitch/${asset.imagePath}`,
        atlasPath: `/2d-assets/stitch/${asset.atlasPath}`,
        tags,
        sourcePath: asset.sourcePath,
      });
    }
    
    // Load Main assets with tags from filename
    for (const asset of mainAssets) {
      if (asset.src) {
        const filename = asset.src.split('/').pop() || asset.id;
        const tags = extractResonanceTagsFromFilename(filename);
        this.assetPool.push({
          assetId: asset.id || asset.src,
          category: asset.category || 'unknown',
          path: asset.src,
          tags,
          sourcePath: asset.src,
        });
      }
    }
    
    console.log(`[AutonomousResonanceRouter] Loaded ${this.assetPool.length} assets into pool`);
  }
  
  /**
   * Extract tags from Stitch runtime asset based on assetId
   */
  private extractTagsFromStitchAsset(asset: StitchRuntimeAsset): AssetResonanceTags {
    // Parse assetId to extract semantic tags
    // Example: "stitch_enemy_undead_blade_walker_square_sheet"
    const tags = extractResonanceTagsFromFilename(asset.assetId);
    
    // Override baseType with category from manifest
    return {
      ...tags,
      baseType: this.mapCategoryToBaseType(asset.category),
    };
  }
  
  /**
   * Map Stitch category to base type
   */
  private mapCategoryToBaseType(category: string): string {
    const CATEGORY_MAP: Record<string, string> = {
      'enemy': 'enemy',
      'boss': 'enemy',
      'hero': 'character',
      'npc': 'npc',
      'vfx': 'effect',
      'tile': 'tile',
      'prop': 'prop',
      'item': 'item',
      'equipment_overlay': 'equipment',
      'ui': 'ui',
      'building': 'building',
    };
    return CATEGORY_MAP[category] || category;
  }
  
  /**
   * Calculate Resonance Score using strict integer math
   * R = Sum of matched weights. Highest R collapses into reality.
   */
  private calculateResonanceScore(
    worldState: WorldLogicalState,
    assetTags: AssetResonanceTags
  ): { score: number; matchedVectors: string[] } {
    let score = 0;
    const matchedVectors: string[] = [];
    
    // BASE TYPE IS MANDATORY - If it fails, resonance is 0
    if (worldState.baseType !== assetTags.baseType) {
      return { score: 0, matchedVectors: [] };
    }
    score += SCORE_WEIGHTS.BASE_TYPE_MATCH;
    matchedVectors.push('baseType');
    
    // Evaluate Ontological Vectors
    if (worldState.season === assetTags.season) {
      score += SCORE_WEIGHTS.SEASON_MATCH;
      matchedVectors.push('season');
    } else if (assetTags.season === 'neutral') {
      score += SCORE_WEIGHTS.SEASON_NEUTRAL; // Neutral has weak resonance
    }
    
    if (worldState.decayLevel === assetTags.decay) {
      score += SCORE_WEIGHTS.DECAY_MATCH;
      matchedVectors.push('decay');
    }
    
    if (worldState.culture === assetTags.culture) {
      score += SCORE_WEIGHTS.CULTURE_MATCH;
      matchedVectors.push('culture');
    } else if (assetTags.culture === 'universal') {
      score += SCORE_WEIGHTS.CULTURE_UNIVERSAL; // Universal has medium resonance
    }
    
    if (worldState.biome && assetTags.biome) {
      if (worldState.biome === assetTags.biome) {
        score += SCORE_WEIGHTS.BIOME_MATCH;
        matchedVectors.push('biome');
      }
    }
    
    if (worldState.environment && assetTags.environment) {
      if (worldState.environment === assetTags.environment) {
        score += SCORE_WEIGHTS.ENVIRONMENT_MATCH;
        matchedVectors.push('environment');
      }
    }
    
    return { score, matchedVectors };
  }
  
  /**
   * Stringify WorldLogicalState for cache key
   */
  private stringifyWorldState(state: WorldLogicalState): string {
    return JSON.stringify(state);
  }
  
  /**
   * THE OBSERVER FUNCTION: Collapses the logical state into visual reality
   * Uses Cost Brake: caches results for recurring identical states
   */
  public materializeEntity(worldState: WorldLogicalState): MaterializationResult {
    // Cost Brake: Check cache first
    const cacheKey = this.stringifyWorldState(worldState);
    const cached = this.materializationCache.get(cacheKey);
    if (cached) {
      console.log(`[AutonomousResonanceRouter] Cache hit for: ${cacheKey}`);
      return cached;
    }
    
    let highestResonance = -1;
    let selectedAsset: ResonanceAsset | null = null;
    let matchedVectors: string[] = [];
    
    // Search asset pool for highest resonance
    for (const asset of this.assetPool) {
      const { score, matchedVectors: vectors } = this.calculateResonanceScore(
        worldState,
        asset.tags
      );
      
      if (score > highestResonance) {
        highestResonance = score;
        selectedAsset = asset;
        matchedVectors = vectors;
      }
    }
    
    // Build result
    const result: MaterializationResult = selectedAsset
      ? {
          assetId: selectedAsset.assetId,
          path: selectedAsset.path,
          resonanceScore: highestResonance,
          matchedVectors,
          fallback: false,
        }
      : {
          assetId: FALLBACK_ASSET_ID,
          path: '/2d-assets/fallback_error_sprite.png',
          resonanceScore: 0,
          matchedVectors: [],
          fallback: true,
        };
    
    // Cache result
    this.materializationCache.set(cacheKey, result);
    
    console.log(
      `[AutonomousResonanceRouter] Materialized: ${worldState.baseType} ` +
      `(season=${worldState.season}, decay=${worldState.decayLevel}, culture=${worldState.culture}) ` +
      `-> ${result.assetId} (R=${result.resonanceScore})`
    );
    
    return result;
  }
  
  /**
   * Materialize multiple entities at once (batch processing)
   */
  public materializeEntities(worldStates: WorldLogicalState[]): MaterializationResult[] {
    return worldStates.map(state => this.materializeEntity(state));
  }
  
  /**
   * Get all assets that match a given world state (for preview/debugging)
   */
  public getMatchingAssets(worldState: WorldLogicalState): Array<{
    asset: ResonanceAsset;
    score: number;
    matchedVectors: string[];
  }> {
    const matches: Array<{
      asset: ResonanceAsset;
      score: number;
      matchedVectors: string[];
    }> = [];
    
    for (const asset of this.assetPool) {
      const { score, matchedVectors } = this.calculateResonanceScore(worldState, asset.tags);
      if (score > 0) {
        matches.push({ asset, score, matchedVectors });
      }
    }
    
    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    
    return matches;
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.materializationCache.size,
      entries: Array.from(this.materializationCache.keys()),
    };
  }
  
  /**
   * Clear materialization cache (for testing or reset)
   */
  public clearCache(): void {
    this.materializationCache.clear();
    console.log('[AutonomousResonanceRouter] Cache cleared');
  }
  
  /**
   * Get asset pool statistics
   */
  public getAssetPoolStats(): {
    totalAssets: number;
    byBaseType: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const byBaseType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    for (const asset of this.assetPool) {
      byBaseType[asset.tags.baseType] = (byBaseType[asset.tags.baseType] || 0) + 1;
      byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;
    }
    
    return {
      totalAssets: this.assetPool.length,
      byBaseType,
      byCategory,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE (for global access)
// ============================================================================

export const autonomousResonanceRouter = new AutonomousResonanceRouter();

// ============================================================================
// USAGE EXAMPLE (for documentation)
// ============================================================================

/*
// World state from server tick:
const worldState: WorldLogicalState = {
  baseType: 'tree',
  season: 'winter',
  decayLevel: 'high',
  culture: 'elven',
  biome: 'forest',
};

// Observer function collapses to visual reality:
const result = autonomousResonanceRouter.materializeEntity(worldState);
// -> Returns: { assetId: 'stitch_prop_eldritch_winter_tree', path: '...', resonanceScore: 1750, ... }

// Next tick with same state - uses Cost Brake cache:
const cached = autonomousResonanceRouter.materializeEntity(worldState);
// -> Returns cached result instantly (no recalculation)

// Batch materialization:
const results = autonomousResonanceRouter.materializeEntities([
  { baseType: 'tree', season: 'winter', decayLevel: 'high', culture: 'elven' },
  { baseType: 'enemy', season: 'winter', decayLevel: 'high', culture: 'undead' },
  { baseType: 'vfx', season: 'neutral', decayLevel: 'none', culture: 'arcane' },
]);
*/