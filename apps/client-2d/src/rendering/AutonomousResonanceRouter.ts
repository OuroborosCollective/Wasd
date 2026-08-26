/**
 * AutonomousResonanceRouter.ts
 *
 * Deterministic observer-side asset binding for Areloria/WASD.
 *
 * The server remains authoritative. This router only collapses already-visible
 * logical world vectors into visual assets on the 2D client. It must never
 * create gameplay truth, rewards, combat results, NPC state or economy state.
 *
 * STRICT INTEGER SCORING ONLY.
 */

import type { StitchRuntimeAsset } from "../game/stitchAssetManifest";
import type { AssetEntry } from "../assetManifest";

export interface WorldLogicalState {
  readonly baseType: string;
  readonly season: string;
  readonly decayLevel: string;
  readonly culture: string;
  readonly biome?: string;
  readonly environment?: string;
}

export interface AssetResonanceTags {
  readonly baseType: string;
  readonly season: string;
  readonly decay: string;
  readonly culture: string;
  readonly biome?: string;
  readonly environment?: string;
}

export interface ResonanceAsset {
  readonly assetId: string;
  readonly category: string;
  readonly path: string;
  readonly atlasPath?: string;
  readonly tags: AssetResonanceTags;
  readonly sourcePath: string;
}

export interface MaterializationResult {
  readonly assetId: string;
  readonly path: string;
  readonly resonanceScore: number;
  readonly matchedVectors: readonly string[];
  readonly fallback: boolean;
}

const SCORE_WEIGHTS = {
  BASE_TYPE_MATCH: 1000,
  SEASON_MATCH: 300,
  SEASON_NEUTRAL: 100,
  DECAY_MATCH: 200,
  CULTURE_MATCH: 400,
  CULTURE_UNIVERSAL: 150,
  BIOME_MATCH: 250,
  ENVIRONMENT_MATCH: 150,
} as const;

const FALLBACK_ASSET_ID = "fallback_error_sprite";
const FALLBACK_ASSET_PATH = "/2d-assets/fallback_error_sprite.png";

const SEASON_KEYWORDS = ["winter", "spring", "summer", "autumn", "fall", "frost", "bloom", "snow"] as const;
const DECAY_KEYWORDS = ["decay", "ruined", "broken", "withered", "destroyed", "ancient"] as const;
const BIOME_KEYWORDS = ["forest", "wood", "swamp", "marsh", "mountain", "rock", "plains", "field", "desert", "sand", "snow", "ice", "cave", "dungeon"] as const;
const ENVIRONMENT_KEYWORDS = ["indoor", "inside", "outdoor", "underground", "ruin", "ruins", "settlement", "village", "city"] as const;

function tokenizeName(filename: string): readonly string[] {
  return filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .split(/[_\-/ .]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function detectSeason(tokens: readonly string[]): string {
  for (const token of tokens) {
    if (!SEASON_KEYWORDS.some((keyword) => token.includes(keyword))) continue;
    if (token.includes("frost") || token.includes("winter") || token.includes("snow")) return "winter";
    if (token.includes("bloom") || token.includes("spring")) return "spring";
    if (token.includes("summer")) return "summer";
    if (token.includes("autumn") || token.includes("fall")) return "autumn";
  }

  return "neutral";
}

function detectDecay(tokens: readonly string[]): string {
  for (const token of tokens) {
    if (!DECAY_KEYWORDS.some((keyword) => token.includes(keyword))) continue;
    if (token.includes("ancient") || token.includes("ruined") || token.includes("withered")) return "high";
    if (token.includes("destroyed") || token.includes("broken")) return "medium";
    return "high";
  }

  return "none";
}

function detectCulture(tokens: readonly string[]): string {
  for (const token of tokens) {
    if (token.includes("elf") || token.includes("elven")) return "elven";
    if (token.includes("human")) return "human";
    if (token.includes("dwarf") || token.includes("dwarven")) return "dwarven";
    if (token.includes("orc")) return "orc";
    if (token.includes("gothic") || token.includes("eldritch")) return "gothic";
    if (token.includes("nordic")) return "nordic";
    if (token.includes("arcane") || token.includes("magic") || token.includes("spell")) return "arcane";
    if (token.includes("cyber")) return "cyber";
    if (token.includes("undead")) return "undead";
    if (token.includes("crystal")) return "crystal";
    if (token.includes("solar")) return "solar";
    if (token.includes("void")) return "void";
    if (token.includes("arelorian") || token.includes("areloria")) return "arelorian";
  }

  return "universal";
}

function detectBiome(tokens: readonly string[]): string | undefined {
  for (const token of tokens) {
    if (!BIOME_KEYWORDS.some((keyword) => token.includes(keyword))) continue;
    if (token.includes("forest") || token.includes("wood")) return "forest";
    if (token.includes("swamp") || token.includes("marsh")) return "swamp";
    if (token.includes("mountain") || token.includes("rock")) return "mountain";
    if (token.includes("desert") || token.includes("sand")) return "desert";
    if (token.includes("snow") || token.includes("ice")) return "snow";
    if (token.includes("cave") || token.includes("dungeon")) return "dungeon";
    if (token.includes("plains") || token.includes("field")) return "plains";
  }

  return undefined;
}

function detectEnvironment(tokens: readonly string[]): string | undefined {
  for (const token of tokens) {
    if (!ENVIRONMENT_KEYWORDS.some((keyword) => token.includes(keyword))) continue;
    if (token.includes("indoor") || token.includes("inside")) return "indoor";
    if (token.includes("outdoor")) return "outdoor";
    if (token.includes("underground")) return "underground";
    if (token.includes("ruin")) return "ruins";
    if (token.includes("settlement") || token.includes("village") || token.includes("city")) return "settlement";
  }

  return undefined;
}

function categoryToBaseType(category: string): string {
  const map: Record<string, string> = {
    enemy: "enemy",
    boss: "enemy",
    hero: "hero",
    npc: "npc",
    vfx: "vfx",
    tile: "tile",
    building: "building",
    prop: "prop",
    item: "item",
    equipment_overlay: "equipment_overlay",
    ui: "ui",
  };

  return map[category] ?? category;
}

function stableWorldStateKey(state: WorldLogicalState): string {
  return [
    `baseType=${state.baseType}`,
    `season=${state.season}`,
    `decayLevel=${state.decayLevel}`,
    `culture=${state.culture}`,
    `biome=${state.biome ?? ""}`,
    `environment=${state.environment ?? ""}`,
  ].join("|");
}

function sortResonanceAssets(a: ResonanceAsset, b: ResonanceAsset): number {
  return (
    a.assetId.localeCompare(b.assetId) ||
    a.category.localeCompare(b.category) ||
    a.path.localeCompare(b.path)
  );
}

function makeFallbackResult(): MaterializationResult {
  return Object.freeze({
    assetId: FALLBACK_ASSET_ID,
    path: FALLBACK_ASSET_PATH,
    resonanceScore: 0,
    matchedVectors: Object.freeze([]),
    fallback: true,
  });
}

/**
 * Extract ontological tags from filename or deterministic asset id.
 */
export function extractResonanceTagsFromFilename(filename: string): AssetResonanceTags {
  const tokens = tokenizeName(filename);
  let baseType = tokens[0] || "unknown";

  if (baseType === "stitch" && tokens.length > 1) {
    baseType = categoryToBaseType(tokens[1] || "unknown");
  }

  const biome = detectBiome(tokens);
  const environment = detectEnvironment(tokens);

  return {
    baseType,
    season: detectSeason(tokens),
    decay: detectDecay(tokens),
    culture: detectCulture(tokens),
    ...(biome ? { biome } : {}),
    ...(environment ? { environment } : {}),
  };
}

export class AutonomousResonanceRouter {
  private assetPool: ResonanceAsset[] = [];
  private materializationCache: Map<string, MaterializationResult> = new Map();

  /**
   * Load accepted assets from both Stitch and main manifests.
   * Manual-review/reference-only assets must not be supplied here.
   */
  public loadAssetPool(
    stitchAssets: readonly StitchRuntimeAsset[],
    mainAssets: readonly AssetEntry[] = [],
  ): void {
    this.assetPool = [];
    this.materializationCache.clear();

    for (const asset of stitchAssets) {
      if (asset.status !== "accepted") continue;
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

    for (const asset of mainAssets) {
      if (!asset.src || asset.deprecated || asset.corrupt) continue;

      const filename = asset.src.split("/").pop() || asset.id || asset.src;
      const tags = extractResonanceTagsFromFilename(filename);

      this.assetPool.push({
        assetId: asset.id || asset.src,
        category: asset.category || "unknown",
        path: asset.src,
        tags,
        sourcePath: asset.sourcePath || asset.src,
      });
    }

    this.assetPool.sort(sortResonanceAssets);
  }

  private extractTagsFromStitchAsset(asset: StitchRuntimeAsset): AssetResonanceTags {
    const tags = extractResonanceTagsFromFilename(asset.assetId);
    const manifestTags = new Set(asset.tags.map((tag) => tag.toLowerCase()));

    const biome = tags.biome ?? this.detectTagBiome(manifestTags);
    const environment = tags.environment ?? this.detectTagEnvironment(manifestTags);

    return {
      ...tags,
      baseType: categoryToBaseType(asset.category),
      ...(biome ? { biome } : {}),
      ...(environment ? { environment } : {}),
    };
  }

  private detectTagBiome(tags: ReadonlySet<string>): string | undefined {
    if (tags.has("swamp") || tags.has("marsh")) return "swamp";
    if (tags.has("dungeon") || tags.has("cave")) return "dungeon";
    if (tags.has("forest") || tags.has("wood")) return "forest";
    if (tags.has("snow") || tags.has("ice")) return "snow";
    if (tags.has("desert") || tags.has("sand")) return "desert";
    return undefined;
  }

  private detectTagEnvironment(tags: ReadonlySet<string>): string | undefined {
    if (tags.has("village") || tags.has("city") || tags.has("settlement")) return "settlement";
    if (tags.has("dungeon") || tags.has("underground")) return "underground";
    if (tags.has("ruins") || tags.has("ruin")) return "ruins";
    return undefined;
  }

  private calculateResonanceScore(
    worldState: WorldLogicalState,
    assetTags: AssetResonanceTags,
  ): { score: number; matchedVectors: readonly string[] } {
    let score = 0;
    const matchedVectors: string[] = [];

    if (worldState.baseType !== assetTags.baseType) {
      return { score: 0, matchedVectors: Object.freeze([]) };
    }

    score += SCORE_WEIGHTS.BASE_TYPE_MATCH;
    matchedVectors.push("baseType");

    if (worldState.season === assetTags.season) {
      score += SCORE_WEIGHTS.SEASON_MATCH;
      matchedVectors.push("season");
    } else if (assetTags.season === "neutral") {
      score += SCORE_WEIGHTS.SEASON_NEUTRAL;
    }

    if (worldState.decayLevel === assetTags.decay) {
      score += SCORE_WEIGHTS.DECAY_MATCH;
      matchedVectors.push("decay");
    }

    if (worldState.culture === assetTags.culture) {
      score += SCORE_WEIGHTS.CULTURE_MATCH;
      matchedVectors.push("culture");
    } else if (assetTags.culture === "universal") {
      score += SCORE_WEIGHTS.CULTURE_UNIVERSAL;
    }

    if (worldState.biome && assetTags.biome && worldState.biome === assetTags.biome) {
      score += SCORE_WEIGHTS.BIOME_MATCH;
      matchedVectors.push("biome");
    }

    if (worldState.environment && assetTags.environment && worldState.environment === assetTags.environment) {
      score += SCORE_WEIGHTS.ENVIRONMENT_MATCH;
      matchedVectors.push("environment");
    }

    return { score, matchedVectors: Object.freeze(matchedVectors) };
  }

  public materializeEntity(worldState: WorldLogicalState): MaterializationResult {
    const cacheKey = stableWorldStateKey(worldState);
    const cached = this.materializationCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    let selectedAsset: ResonanceAsset | null = null;
    let highestResonance = 0;
    let matchedVectors: readonly string[] = Object.freeze([]);

    for (const asset of this.assetPool) {
      const scored = this.calculateResonanceScore(worldState, asset.tags);

      if (scored.score <= 0) continue;

      const beatsCurrent =
        scored.score > highestResonance ||
        (scored.score === highestResonance &&
          selectedAsset !== null &&
          sortResonanceAssets(asset, selectedAsset) < 0);

      if (beatsCurrent || selectedAsset === null) {
        highestResonance = scored.score;
        selectedAsset = asset;
        matchedVectors = scored.matchedVectors;
      }
    }

    const result: MaterializationResult = selectedAsset
      ? Object.freeze({
          assetId: selectedAsset.assetId,
          path: selectedAsset.path,
          resonanceScore: highestResonance,
          matchedVectors,
          fallback: false,
        })
      : makeFallbackResult();

    this.materializationCache.set(cacheKey, result);

    return result;
  }

  public materializeEntities(worldStates: readonly WorldLogicalState[]): readonly MaterializationResult[] {
    return Object.freeze(worldStates.map((state) => this.materializeEntity(state)));
  }

  public getMatchingAssets(worldState: WorldLogicalState): Array<{
    asset: ResonanceAsset;
    score: number;
    matchedVectors: readonly string[];
  }> {
    const matches: Array<{
      asset: ResonanceAsset;
      score: number;
      matchedVectors: readonly string[];
    }> = [];

    for (const asset of this.assetPool) {
      const scored = this.calculateResonanceScore(worldState, asset.tags);
      if (scored.score > 0) {
        matches.push({ asset, score: scored.score, matchedVectors: scored.matchedVectors });
      }
    }

    matches.sort((a, b) => b.score - a.score || sortResonanceAssets(a.asset, b.asset));

    return matches;
  }

  public getCacheStats(): { size: number; entries: readonly string[] } {
    return {
      size: this.materializationCache.size,
      entries: Object.freeze([...this.materializationCache.keys()].sort()),
    };
  }

  public clearCache(): void {
    this.materializationCache.clear();
  }

  public getAssetPoolStats(): {
    readonly totalAssets: number;
    readonly byBaseType: Record<string, number>;
    readonly byCategory: Record<string, number>;
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

export const autonomousResonanceRouter = new AutonomousResonanceRouter();
