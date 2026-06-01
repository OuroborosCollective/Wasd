/**
 * Asset Binding Director
 * 
 * Core scoring and deterministic selection engine for asset binding.
 * Uses weighted scoring, candidate ranking, and deterministic random.
 * NEVER uses Date.now(), Math.random(), or any time-based seeds.
 */

import type { AssetEntry, AssetManifest } from "../assetManifest";
import type { BindingOptions, AssetBindingContext } from "./AssetBindingContext";
import type { SemanticQuery } from "./AssetSemanticProfiles";
import { 
  hash32, 
  deterministicFloat, 
  deterministicInt, 
  pickWeightedDeterministic,
  combineSeed,
  type WeightedEntry,
} from "./DeterministicAssetRng";
import {
  getBuildingFallbackChain,
  getNpcFallbackChain,
  getPropFallbackChain,
  getRoadFallbackChain,
  getBiomeRoadTags,
  getBiomeTreeTags,
  getCultureBuildingTags,
  getCultureCharacterTags,
  combineContextTags,
  findFallbackEntry,
} from "./AssetFallbackChains";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared/world";

/**
 * Asset scoring result with debug info.
 */
export interface ScoredAsset {
  readonly id: string;
  readonly entry: AssetEntry;
  readonly score: number;
  readonly matchReasons: readonly string[];
}

/**
 * Binding result with debug info.
 */
export interface BindingResult {
  readonly id: string;
  readonly entry: AssetEntry | null;
  readonly debug: BindingDebug;
}

/**
 * Debug information for binding decisions.
 */
export interface BindingDebug {
  readonly seed: string;
  readonly semanticType: string;
  readonly candidates: number;
  readonly scores: readonly { id: string; score: number; reasons: readonly string[] }[];
  readonly fallbackUsed: boolean;
  readonly fallbackReason?: string;
  readonly finalScore: number;
}

/**
 * Score weights for semantic matching.
 */
const SCORE_WEIGHTS = {
  exactKind: 100,
  exactGroup: 50,
  matchingTag: 15,
  biomeTag: 20,
  cultureTag: 15,
  factionTag: 25,
  lodMatch: 10,
  wealthMatch: 12,
  dangerMatch: 12,
  worldAgeMatch: 8,
  variantMatch: 5,
  baseWeight: 20,
  qualityBonus: 2,
  deprecated: -100,
  corrupt: -100,
  missing: -100,
};

/**
 * AssetBindingDirector handles scoring and deterministic selection.
 */
export class AssetBindingDirector {
  private manifest: AssetManifest | null;
  private debugMode: boolean;

  constructor(manifest: AssetManifest | null, debugMode = false) {
    this.manifest = manifest;
    this.debugMode = debugMode;
  }

  /**
   * Sets the manifest for binding.
   */
  setManifest(manifest: AssetManifest | null): void {
    this.manifest = manifest;
  }

  /**
   * Sets debug mode for verbose logging.
   */
  setDebugMode(debugMode: boolean): void {
    this.debugMode = debugMode;
  }

  /**
   * Scores a single asset entry against a semantic query.
   */
  scoreAsset(entry: AssetEntry, query: SemanticQuery, context: AssetBindingContext): ScoredAsset {
    let score = SCORE_WEIGHTS.baseWeight;
    const reasons: string[] = [];

    const entryTags = (entry.tags ?? []).map(t => String(t).toLowerCase());
    const entryKind = String(entry.kind ?? '').toLowerCase();
    const entryGroup = String(entry.group ?? '').toLowerCase();
    const entryBiomeTags = (entry as any).biomeTags?.map((t: string) => t.toLowerCase()) ?? [];
    const entryCultureTags = (entry as any).cultureTags?.map((t: string) => t.toLowerCase()) ?? [];
    const entryFactionTags = (entry as any).factionTags?.map((t: string) => t.toLowerCase()) ?? [];

    // Exact kind match
    if (entryKind === query.kind?.toLowerCase()) {
      score += SCORE_WEIGHTS.exactKind;
      reasons.push(`kind:${query.kind}`);
    }

    // Exact group match
    if (entryGroup === query.semanticType.toLowerCase() || 
        entryTags.includes(query.semanticType.toLowerCase())) {
      score += SCORE_WEIGHTS.exactGroup;
      reasons.push(`group:${query.semanticType}`);
    }

    // Tag matching
    for (const tag of query.tags) {
      if (entryTags.includes(tag.toLowerCase())) {
        score += SCORE_WEIGHTS.matchingTag;
        reasons.push(`tag:${tag}`);
      }
    }

    // Biome tag matching
    if (query.biomeTags?.length) {
      const biomeMatches = query.biomeTags.filter(t => entryBiomeTags.includes(t.toLowerCase())).length;
      score += biomeMatches * SCORE_WEIGHTS.biomeTag;
      if (biomeMatches > 0) reasons.push(`biome:${biomeMatches}`);
    }

    // Culture tag matching
    if (query.cultureTags?.length) {
      const cultureMatches = query.cultureTags.filter(t => entryCultureTags.includes(t.toLowerCase())).length;
      score += cultureMatches * SCORE_WEIGHTS.cultureTag;
      if (cultureMatches > 0) reasons.push(`culture:${cultureMatches}`);
    }

    // Faction tag matching
    if (context.factionId && entryFactionTags.length) {
      const factionTag = context.factionId.toLowerCase();
      if (entryFactionTags.some(t => t.includes(factionTag) || factionTag.includes(t))) {
        score += SCORE_WEIGHTS.factionTag;
        reasons.push(`faction:${context.factionId}`);
      }
    }

    // LOD matching
    if (query.lod && (entry as any).lod === query.lod) {
      score += SCORE_WEIGHTS.lodMatch;
      reasons.push(`lod:${query.lod}`);
    }

    // Wealth level matching
    if (query.wealthLevel && entryTags.includes(query.wealthLevel)) {
      score += SCORE_WEIGHTS.wealthMatch;
      reasons.push(`wealth:${query.wealthLevel}`);
    }

    // Danger level matching
    if (query.dangerLevel && entryTags.includes(query.dangerLevel)) {
      score += SCORE_WEIGHTS.dangerMatch;
      reasons.push(`danger:${query.dangerLevel}`);
    }

    // World age matching
    if (query.worldAgePhase && entryTags.includes(query.worldAgePhase)) {
      score += SCORE_WEIGHTS.worldAgeMatch;
      reasons.push(`age:${query.worldAgePhase}`);
    }

    // Variant hint matching
    if (query.variantHint && entryTags.some(t => t.includes(query.variantHint!.toLowerCase()))) {
      score += SCORE_WEIGHTS.variantMatch;
      reasons.push(`variant:${query.variantHint}`);
    }

    // Quality bonus
    const quality = (entry as any).quality ?? 50;
    score += (quality / 100) * SCORE_WEIGHTS.qualityBonus;

    // Deprecated penalty
    if ((entry as any).deprecated) {
      score += SCORE_WEIGHTS.deprecated;
      reasons.push('deprecated');
    }

    // Corrupt penalty
    if ((entry as any).corrupt) {
      score += SCORE_WEIGHTS.corrupt;
      reasons.push('corrupt');
    }

    return {
      id: entry.id ?? String(Math.random()), // Fallback, should not happen
      entry,
      score,
      matchReasons: reasons,
    };
  }

  /**
   * Collects candidate assets from manifest category.
   */
  collectCandidates(category: string): [string, AssetEntry][] {
    if (!this.manifest) return [];
    
    const group = this.manifest[category as keyof AssetManifest] as Record<string, AssetEntry> | undefined;
    if (!group) return [];

    return Object.entries(group).filter(([, entry]) => {
      // Must have valid src
      if (!entry?.src) return false;
      // Must not be JSON
      if (entry.src.toLowerCase().endsWith('.json')) return false;
      // Must not be deprecated or corrupt
      if ((entry as any).deprecated || (entry as any).corrupt) return false;
      return true;
    });
  }

  /**
   * Selects best candidate using deterministic weighted selection.
   */
  selectBestCandidate(
    seed: string,
    candidates: readonly ScoredAsset[],
    topN: number = 5,
  ): ScoredAsset | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Sort by score descending
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    
    // Take top N for weighted selection
    const topCandidates = sorted.slice(0, Math.min(topN, candidates.length));
    
    if (topCandidates.length === 0) return null;
    if (topCandidates.length === 1) return topCandidates[0];

    // Weighted deterministic selection among top candidates
    const weights: WeightedEntry<ScoredAsset>[] = topCandidates.map(c => ({
      item: c,
      weight: Math.max(1, c.score),
    }));

    return pickWeightedDeterministic(seed, weights);
  }

  /**
   * Binds a building deterministically.
   */
  bindBuilding(
    buildingType: BuildingType,
    context: AssetBindingContext,
  ): BindingResult {
    const seed = combineSeed('building', String(buildingType), String(context.seed));
    const candidates = this.collectCandidates('buildings');
    
    if (candidates.length === 0) {
      return this.createEmptyResult(seed, buildingType, true, 'no buildings in manifest');
    }

    // Create semantic query
    const query = {
      semanticType: buildingType,
      kind: buildingType,
      tags: [buildingType],
      biomeTags: getBiomeRoadTags(context.biome),
      cultureTags: getCultureBuildingTags(context.culture),
      lod: context.lod,
      wealthLevel: context.wealthLevel,
      dangerLevel: context.dangerLevel,
      worldAgePhase: context.worldAgePhase,
      variantHint: context.variantHint,
    };

    // Score all candidates
    const scored = candidates.map(([id, entry]) => {
      const enhancedEntry = { ...entry, id } as AssetEntry & { id: string };
      return this.scoreAsset(enhancedEntry, query, context);
    });

    // Select best candidate
    const best = this.selectBestCandidate(seed, scored, 10);

    if (best) {
      return {
        id: best.id,
        entry: best.entry,
        debug: {
          seed,
          semanticType: buildingType,
          candidates: candidates.length,
          scores: scored.slice(0, 10).map(s => ({ id: s.id, score: s.score, reasons: s.matchReasons })),
          fallbackUsed: false,
          finalScore: best.score,
        },
      };
    }

    // Fallback chain
    return this.bindBuildingFallback(seed, buildingType, context);
  }

  /**
   * Handles building binding fallback.
   */
  private bindBuildingFallback(
    seed: string,
    buildingType: BuildingType,
    context: AssetBindingContext,
  ): BindingResult {
    const chain = getBuildingFallbackChain(buildingType);
    
    for (const key of chain) {
      const entry = findFallbackEntry(this.manifest, 'buildings', [key], seed);
      if (entry) {
        return {
          id: entry.id ?? key,
          entry,
          debug: {
            seed,
            semanticType: buildingType,
            candidates: 0,
            scores: [],
            fallbackUsed: true,
            fallbackReason: `used chain key: ${key}`,
            finalScore: 0,
          },
        };
      }
    }

    return this.createEmptyResult(seed, buildingType, true, 'fallback chain exhausted');
  }

  /**
   * Binds an NPC deterministically.
   */
  bindNpc(
    role: NpcRole,
    context: AssetBindingContext,
  ): BindingResult {
    const seed = combineSeed('npc', role, String(context.seed));
    const candidates = this.collectCandidates('characters');
    
    if (candidates.length === 0) {
      return this.createEmptyResult(seed, role, true, 'no characters in manifest');
    }

    // Create semantic query
    const query = {
      semanticType: role,
      kind: role === 'animal' ? 'animal' : 'npc',
      tags: [role, role === 'animal' ? 'animal' : 'human'],
      biomeTags: getBiomeRoadTags(context.biome),
      cultureTags: getCultureCharacterTags(context.culture),
      lod: context.lod,
      wealthLevel: context.wealthLevel,
      dangerLevel: context.dangerLevel,
      worldAgePhase: context.worldAgePhase,
      variantHint: context.variantHint,
    };

    // Score all candidates
    const scored = candidates.map(([id, entry]) => {
      const enhancedEntry = { ...entry, id } as AssetEntry & { id: string };
      return this.scoreAsset(enhancedEntry, query, context);
    });

    // Select best candidate
    const best = this.selectBestCandidate(seed, scored, 10);

    if (best) {
      return {
        id: best.id,
        entry: best.entry,
        debug: {
          seed,
          semanticType: role,
          candidates: candidates.length,
          scores: scored.slice(0, 10).map(s => ({ id: s.id, score: s.score, reasons: s.matchReasons })),
          fallbackUsed: false,
          finalScore: best.score,
        },
      };
    }

    // Fallback chain
    return this.bindNpcFallback(seed, role, context);
  }

  /**
   * Handles NPC binding fallback.
   */
  private bindNpcFallback(
    seed: string,
    role: NpcRole,
    context: AssetBindingContext,
  ): BindingResult {
    const chain = getNpcFallbackChain(role);
    
    for (const key of chain) {
      const entry = findFallbackEntry(this.manifest, 'characters', [key], seed);
      if (entry) {
        return {
          id: entry.id ?? key,
          entry,
          debug: {
            seed,
            semanticType: role,
            candidates: 0,
            scores: [],
            fallbackUsed: true,
            fallbackReason: `used chain key: ${key}`,
            finalScore: 0,
          },
        };
      }
    }

    return this.createEmptyResult(seed, role, true, 'fallback chain exhausted');
  }

  /**
   * Binds a prop deterministically.
   */
  bindProp(
    propType: PropType,
    context: AssetBindingContext,
  ): BindingResult {
    const seed = combineSeed('prop', String(propType), String(context.seed));
    const candidates = [
      ...this.collectCandidates('props'),
      ...this.collectCandidates('tilesets'),
    ];
    
    if (candidates.length === 0) {
      return this.createEmptyResult(seed, propType, true, 'no props in manifest');
    }

    // Create semantic query with biome-specific tree tags
    const query = {
      semanticType: propType,
      kind: propType === 'tree' ? 'tree' : propType,
      tags: [propType, ...(propType === 'tree' ? getBiomeTreeTags(context.biome) : [])],
      biomeTags: getBiomeRoadTags(context.biome),
      cultureTags: getCultureBuildingTags(context.culture),
      lod: context.lod,
      wealthLevel: context.wealthLevel,
      dangerLevel: context.dangerLevel,
      worldAgePhase: context.worldAgePhase,
      variantHint: context.variantHint,
    };

    // Score all candidates
    const scored = candidates.map(([id, entry]) => {
      const enhancedEntry = { ...entry, id } as AssetEntry & { id: string };
      return this.scoreAsset(enhancedEntry, query, context);
    });

    // Select best candidate
    const best = this.selectBestCandidate(seed, scored, 10);

    if (best) {
      return {
        id: best.id,
        entry: best.entry,
        debug: {
          seed,
          semanticType: propType,
          candidates: candidates.length,
          scores: scored.slice(0, 10).map(s => ({ id: s.id, score: s.score, reasons: s.matchReasons })),
          fallbackUsed: false,
          finalScore: best.score,
        },
      };
    }

    // Fallback chain
    return this.bindPropFallback(seed, propType, context);
  }

  /**
   * Handles prop binding fallback.
   */
  private bindPropFallback(
    seed: string,
    propType: PropType,
    context: AssetBindingContext,
  ): BindingResult {
    const chain = getPropFallbackChain(propType);
    
    for (const category of ['props', 'tilesets']) {
      for (const key of chain) {
        const entry = findFallbackEntry(this.manifest, category, [key], seed);
        if (entry) {
          return {
            id: entry.id ?? key,
            entry,
            debug: {
              seed,
              semanticType: propType,
              candidates: 0,
              scores: [],
              fallbackUsed: true,
              fallbackReason: `used chain key: ${key} in ${category}`,
              finalScore: 0,
            },
          };
        }
      }
    }

    return this.createEmptyResult(seed, propType, true, 'fallback chain exhausted');
  }

  /**
   * Binds a road deterministically.
   */
  bindRoad(
    roadType: RoadType,
    context: AssetBindingContext,
  ): BindingResult {
    const seed = combineSeed('road', String(roadType), String(context.seed));
    const candidates = this.collectCandidates('tilesets');
    
    if (candidates.length === 0) {
      return this.createEmptyResult(seed, roadType, true, 'no tilesets in manifest');
    }

    // Create semantic query with biome-specific road tags
    const query = {
      semanticType: roadType,
      kind: roadType === 'grass' ? 'grass' : 'road',
      tags: [roadType, ...getBiomeRoadTags(context.biome)],
      biomeTags: getBiomeRoadTags(context.biome),
      cultureTags: getCultureBuildingTags(context.culture),
      lod: context.lod,
      wealthLevel: context.wealthLevel,
      dangerLevel: context.dangerLevel,
      worldAgePhase: context.worldAgePhase,
      variantHint: context.variantHint,
    };

    // Score all candidates
    const scored = candidates.map(([id, entry]) => {
      const enhancedEntry = { ...entry, id } as AssetEntry & { id: string };
      return this.scoreAsset(enhancedEntry, query, context);
    });

    // Select best candidate
    const best = this.selectBestCandidate(seed, scored, 10);

    if (best) {
      return {
        id: best.id,
        entry: best.entry,
        debug: {
          seed,
          semanticType: roadType,
          candidates: candidates.length,
          scores: scored.slice(0, 10).map(s => ({ id: s.id, score: s.score, reasons: s.matchReasons })),
          fallbackUsed: false,
          finalScore: best.score,
        },
      };
    }

    // Fallback chain
    return this.bindRoadFallback(seed, roadType, context);
  }

  /**
   * Handles road binding fallback.
   */
  private bindRoadFallback(
    seed: string,
    roadType: RoadType,
    context: AssetBindingContext,
  ): BindingResult {
    const chain = getRoadFallbackChain(roadType);
    
    for (const key of chain) {
      const entry = findFallbackEntry(this.manifest, 'tilesets', [key], seed);
      if (entry) {
        return {
          id: entry.id ?? key,
          entry,
          debug: {
            seed,
            semanticType: roadType,
            candidates: 0,
            scores: [],
            fallbackUsed: true,
            fallbackReason: `used chain key: ${key}`,
            finalScore: 0,
          },
        };
      }
    }

    return this.createEmptyResult(seed, roadType, true, 'fallback chain exhausted');
  }

  /**
   * Creates an empty binding result.
   */
  private createEmptyResult(
    seed: string,
    semanticType: string,
    fallbackUsed: boolean,
    reason: string,
  ): BindingResult {
    return {
      id: 'none',
      entry: null,
      debug: {
        seed,
        semanticType,
        candidates: 0,
        scores: [],
        fallbackUsed,
        fallbackReason: reason,
        finalScore: -1000,
      },
    };
  }
}

/**
 * Creates a new AssetBindingDirector instance.
 */
export function createAssetBindingDirector(
  manifest: AssetManifest | null,
  debugMode = false,
): AssetBindingDirector {
  return new AssetBindingDirector(manifest, debugMode);
}