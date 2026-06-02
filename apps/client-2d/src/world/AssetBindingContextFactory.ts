/**
 * Asset Binding Context Factory
 * 
 * Constructs deterministic AssetBindingContext for chunk rendering.
 * Follows "Stateless Determinism" principle - context is derived from
 * chunk metadata and world state, never from runtime randomness.
 * 
 * PERFORMANCE: Context is built once per chunk load, not per frame.
 */

import type { BindingOptions, LodLevel, BiomeType, CultureType } from "./AssetBindingContext";
import { deriveWorldAgePhase, deriveTimeBand } from "./AssetBindingContext";
import type { ChunkScenePlan } from "@wasd/shared";

/**
 * World state information for context construction.
 * Derives from server manifest, never from Date.now().
 */
export interface WorldStateContext {
  readonly worldTick: number;
  readonly worldSeed: string;
}

/**
 * Settlement metadata for context construction.
 */
export interface SettlementContext {
  readonly settlementTier?: "camp" | "village" | "town" | "city" | "capital";
  readonly controllingFaction?: string;
  readonly culture?: CultureType;
  readonly wealthLevel?: string;
  readonly dangerLevel?: string;
}

/**
 * Chunk metadata for context construction.
 */
export interface ChunkMetadata {
  readonly chunkX: number;
  readonly chunkZ: number;
  readonly biomeId: string;
  readonly regionId?: string;
}

/**
 * Default LOD based on device profile.
 * Mobile devices get "medium", desktop can use "high".
 */
const DEFAULT_LOD: LodLevel = "medium";

/**
 * Maps biome ID string to BiomeType enum.
 */
function mapBiomeId(biomeId: string): BiomeType {
  const normalized = biomeId.toLowerCase();
  if (normalized.includes("forest")) return "forest";
  if (normalized.includes("desert")) return "desert";
  if (normalized.includes("snow") || normalized.includes("tundra")) return "snow";
  if (normalized.includes("swamp") || normalized.includes("marsh")) return "swamp";
  if (normalized.includes("mountain") || normalized.includes("highland")) return "mountain";
  if (normalized.includes("coast") || normalized.includes("beach")) return "coastal";
  if (normalized.includes("city") || normalized.includes("urban")) return "urban";
  return "plains";
}

/**
 * Derives wealth level from settlement tier.
 */
function deriveWealthLevel(tier?: string): string | undefined {
  switch (tier) {
    case "capital": return "rich";
    case "city": return "wealthy";
    case "town": return "moderate";
    case "village": return "poor";
    case "camp": return "destitute";
    default: return undefined;
  }
}

/**
 * Derives danger level from faction and location.
 */
function deriveDangerLevel(faction?: string): string | undefined {
  if (!faction) return undefined;
  const normalized = faction.toLowerCase();
  if (normalized.includes("guard") || normalized.includes("military")) return "protected";
  if (normalized.includes("bandit") || normalized.includes("monster")) return "dangerous";
  return "safe";
}

/**
 * Builds a deterministic seed from chunk coordinates.
 * Used for consistent asset selection across chunk renders.
 */
export function buildChunkSeed(chunkX: number, chunkZ: number, suffix = ""): string {
  return `chunk:${chunkX}:${chunkZ}${suffix ? `:${suffix}` : ""}`;
}

/**
 * Creates the base AssetBindingContext for a chunk.
 * 
 * This is called once per chunk load (not per frame) for performance.
 * The returned context can be reused for all entities in the chunk.
 */
export function buildChunkAssetContext(
  chunk: ChunkMetadata,
  worldState: WorldStateContext,
  settlement?: SettlementContext,
  options?: { forceLod?: LodLevel; variantHint?: string },
): BindingOptions {
  const { chunkX, chunkZ, biomeId, regionId } = chunk;
  
  // Derive deterministic values from world tick (never from Date.now())
  const worldAgePhase = deriveWorldAgePhase(worldState.worldTick);
  const timeBand = deriveTimeBand(worldState.worldTick);
  
  // Map biome ID to BiomeType
  const biome = mapBiomeId(biomeId);
  
  // Build deterministic seed from chunk coordinates
  const seed = buildChunkSeed(chunkX, chunkZ, worldState.worldSeed);
  
  // Derive wealth/danger from settlement context
  const wealthLevel = settlement?.wealthLevel ?? deriveWealthLevel(settlement?.settlementTier);
  const dangerLevel = settlement?.dangerLevel ?? deriveDangerLevel(settlement?.controllingFaction);
  
  return {
    seed,
    biome,
    regionId,
    factionId: settlement?.controllingFaction,
    culture: settlement?.culture,
    wealthLevel: wealthLevel as BindingOptions["wealthLevel"],
    dangerLevel: dangerLevel as BindingOptions["dangerLevel"],
    worldAgePhase,
    lod: options?.forceLod ?? DEFAULT_LOD,
    variantHint: options?.variantHint,
  };
}

/**
 * Creates a specialized NPC binding context.
 * 
 * @param chunkContext - Base context from buildChunkAssetContext()
 * @param npcRole - NPC role (guard, blacksmith, etc.)
 * @param npcId - Unique NPC identifier
 * @param npcFaction - Optional NPC-specific faction override
 */
export function buildNpcAssetContext(
  chunkContext: BindingOptions,
  npcRole: string,
  npcId: string,
  npcFaction?: string,
  npcCulture?: CultureType,
): BindingOptions {
  // Combine chunk seed with NPC-specific seed component
  const npcSeed = `${chunkContext.seed}:npc:${npcId}`;
  
  return {
    ...chunkContext,
    seed: npcSeed,
    // NPC-specific faction overrides chunk-level faction
    factionId: npcFaction ?? chunkContext.factionId,
    culture: npcCulture ?? chunkContext.culture,
  };
}

/**
 * Creates a specialized building binding context.
 */
export function buildBuildingAssetContext(
  chunkContext: BindingOptions,
  buildingType: string,
  buildingId: string,
  buildingVariant?: string,
): BindingOptions {
  const buildingSeed = `${chunkContext.seed}:building:${buildingId}`;
  
  return {
    ...chunkContext,
    seed: buildingSeed,
    variantHint: buildingVariant,
  };
}

/**
 * Creates a specialized prop binding context.
 */
export function buildPropAssetContext(
  chunkContext: BindingOptions,
  propType: string,
  propId: string,
): BindingOptions {
  const propSeed = `${chunkContext.seed}:prop:${propId}`;
  
  return {
    ...chunkContext,
    seed: propSeed,
  };
}

/**
 * Creates a specialized road binding context.
 */
export function buildRoadAssetContext(
  chunkContext: BindingOptions,
  roadType: string,
  roadKey: string,
): BindingOptions {
  const roadSeed = `${chunkContext.seed}:road:${roadKey}`;
  
  return {
    ...chunkContext,
    seed: roadSeed,
  };
}

/**
 * Batch-builds all binding contexts for a chunk scene plan.
 * Call once when chunk loads, then reuse contexts.
 */
export interface ChunkBindingContexts {
  readonly chunk: BindingOptions;
  readonly roadContexts: Map<string, BindingOptions>;
  readonly buildingContexts: Map<string, BindingOptions>;
  readonly propContexts: Map<string, BindingOptions>;
  readonly npcContexts: Map<string, BindingOptions>;
}

export function buildAllChunkContexts(
  chunk: ChunkMetadata,
  worldState: WorldStateContext,
  plan: ChunkScenePlan,
  settlement?: SettlementContext,
  options?: { forceLod?: LodLevel },
): ChunkBindingContexts {
  // Build base chunk context once
  const chunkContext = buildChunkAssetContext(chunk, worldState, settlement, options);
  
  // Pre-build road contexts
  const roadContexts = new Map<string, BindingOptions>();
  for (const [roadCell] of Object.entries(plan.roads.roadCells)) {
    const [xRaw, zRaw] = roadCell.split(":");
    const roadKey = `${xRaw}:${zRaw}`;
    roadContexts.set(roadKey, buildRoadAssetContext(chunkContext, "dirt_road", roadKey));
  }
  
  // Pre-build building contexts
  const buildingContexts = new Map<string, BindingOptions>();
  for (const lot of plan.settlement.lots) {
    buildingContexts.set(lot.id, buildBuildingAssetContext(chunkContext, lot.buildingType, lot.id));
  }
  
  // Pre-build prop contexts
  const propContexts = new Map<string, BindingOptions>();
  for (const prop of [...plan.settlement.props, ...plan.props]) {
    propContexts.set(prop.id, buildPropAssetContext(chunkContext, prop.propType, prop.id));
  }
  
  // Pre-build NPC contexts
  const npcContexts = new Map<string, BindingOptions>();
  for (const npc of plan.npcs) {
    npcContexts.set(npc.id, buildNpcAssetContext(chunkContext, npc.role, npc.id));
  }
  
  return {
    chunk: chunkContext,
    roadContexts,
    buildingContexts,
    propContexts,
    npcContexts,
  };
}