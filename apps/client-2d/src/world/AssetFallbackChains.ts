/**
 * Asset Fallback Chains
 * 
 * Defines deterministic fallback chains for asset binding.
 * Each chain is ordered from most specific to most generic.
 * Never uses Math.random() - falls back deterministically based on seed.
 */

import type { AssetEntry, AssetManifest } from "../assetManifest";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared/world";
import type { BiomeType, CultureType } from "./AssetBindingContext";
import { deterministicIndex } from "./DeterministicAssetRng";

/**
 * Fallback chains for buildings.
 * Extended with GraphicRiver-specific mappings for isometric assets.
 */
export const BUILDING_FALLBACK_CHAINS: Record<BuildingType, readonly string[]> = {
  house: ["house", "hut", "small_building", "building", "generic_building"],
  guard_post: ["guard_post", "tower", "castle", "military_building", "house", "building"],
  blacksmith: ["blacksmith", "workshop", "forge", "house", "building"],
  trader_shop: ["trader_shop", "shop", "store", "house", "building"],
  inn: ["inn", "tavern", "pub", "house", "building"],
  healer_hut: ["healer_hut", "healer", "hut", "house", "building"],
  church: ["church", "temple", "shrine", "house", "building"],
  warehouse: ["warehouse", "storage", "house", "building"],
  farm: ["farm", "barn", "house", "building"],
  mine: ["mine", "cave_entrance", "dungeon", "building"],
  castle: ["castle", "fort", "tower", "house", "building"],
  wall: ["wall", "fence", "barrier", "building"],
};

/**
 * Extended fallback chains for GraphicRiver isometric assets.
 * Maps GraphicRiver naming patterns to standard building types.
 */
export const GRAPHICRIVER_BUILDING_FALLBACKS: Record<string, readonly string[]> = {
  // Tower variants
  tower: ["tower", "military_tower", "defensive", "building"],
  cannon_tower: ["cannon_tower", "tower", "military_tower", "defensive", "building"],
  attack_tower: ["attack_tower", "tower", "military_tower", "defensive", "building"],
  
  // House variants
  small_house: ["small_house", "house", "hut", "building"],
  large_house: ["large_house", "house", "residential", "building"],
  
  // Military buildings
  guard_tower: ["guard_tower", "tower", "military", "defensive", "building"],
  military_tower: ["military_tower", "tower", "military", "defensive", "building"],
  watch_tower: ["watch_tower", "tower", "military", "defensive", "building"],
  
  // Workshop variants
  forge: ["forge", "blacksmith", "workshop", "building"],
  workshop: ["workshop", "craft", "building"],
  
  // Social buildings
  tavern: ["tavern", "inn", "pub", "building"],
  bar: ["bar", "tavern", "inn", "building"],
  restaurant: ["restaurant", "tavern", "inn", "building"],
  
  // Commercial buildings
  shop: ["shop", "trader_shop", "store", "building"],
  store: ["store", "shop", "trader_shop", "building"],
  market: ["market", "trader_shop", "shop", "building"],
  
  // Resource buildings
  storage: ["storage", "warehouse", "building"],
  warehouse: ["warehouse", "storage", "building"],
};

/**
 * Fallback chains for NPCs.
 */
export const NPC_FALLBACK_CHAINS: Record<NpcRole, readonly string[]> = {
  civilian: ["civilian", "adult", "human", "npc"],
  child: ["child", "young", "civilian", "npc"],
  guard: ["guard", "soldier", "warrior", "human", "npc"],
  guard_captain: ["captain", "guard", "soldier", "warrior", "human", "npc"],
  blacksmith: ["blacksmith", "worker", "craftsman", "civilian", "npc"],
  merchant: ["merchant", "trader", "civilian", "npc"],
  healer: ["healer", "priest", "civilian", "npc"],
  noble: ["noble", "lord", "civilian", "npc"],
  farmer: ["farmer", "worker", "civilian", "npc"],
  animal: ["animal", "creature", "npc"],
};

/**
 * Extended fallback chains for GraphicRiver isometric NPC assets.
 * Maps GraphicRiver naming patterns to standard NPC roles.
 */
export const GRAPHICRIVER_NPC_FALLBACKS: Record<string, readonly string[]> = {
  // Guard variants
  guard: ["guard", "soldier", "military", "npc"],
  soldier: ["soldier", "guard", "military", "npc"],
  warrior: ["warrior", "soldier", "guard", "npc"],
  knight: ["knight", "soldier", "guard", "npc"],
  
  // Merchant variants
  merchant: ["merchant", "trader", "shopkeeper", "npc"],
  trader: ["trader", "merchant", "shopkeeper", "npc"],
  shopkeeper: ["shopkeeper", "merchant", "trader", "npc"],
  vendor: ["vendor", "trader", "merchant", "npc"],
  
  // Crafting NPCs
  blacksmith: ["blacksmith", "craftsman", "worker", "npc"],
  craftsman: ["craftsman", "worker", "civilian", "npc"],
  artisan: ["artisan", "craftsman", "worker", "npc"],
  
  // Healer/Support NPCs
  healer: ["healer", "priest", "cleric", "npc"],
  priest: ["priest", "healer", "cleric", "npc"],
  cleric: ["cleric", "priest", "healer", "npc"],
  doctor: ["doctor", "healer", "priest", "npc"],
  
  // Noble/Royal NPCs
  noble: ["noble", "lord", "nobleman", "npc"],
  lord: ["lord", "noble", "nobleman", "npc"],
  king: ["king", "noble", "lord", "npc"],
  queen: ["queen", "noble", "lady", "npc"],
  
  // Commoner NPCs
  peasant: ["peasant", "worker", "civilian", "npc"],
  farmer: ["farmer", "worker", "peasant", "npc"],
  villager: ["villager", "civilian", "peasant", "npc"],
  commoner: ["commoner", "civilian", "peasant", "npc"],
  
  // Child NPCs
  child: ["child", "kid", "young", "npc"],
  kid: ["kid", "child", "young", "npc"],
  youth: ["youth", "young", "child", "npc"],
  
  // Combat NPCs
  archer: ["archer", "ranger", "soldier", "npc"],
  mage: ["mage", "wizard", "magic", "npc"],
  wizard: ["wizard", "mage", "magic", "npc"],
  ranger: ["ranger", "archer", "soldier", "npc"],
};

/**
 * Fallback chains for props.
 */
export const PROP_FALLBACK_CHAINS: Record<PropType, readonly string[]> = {
  tree: ["tree", "pine", "oak", "plant", "generic_plant"],
  bush: ["bush", "shrub", "plant", "generic_plant"],
  flower: ["flower", "plant", "generic_plant"],
  rock: ["rock", "stone", "boulder", "debris"],
  fence: ["fence", "barrier", "wall", "building"],
  well: ["well", "water_source", "building"],
  chest: ["chest", "container", "prop"],
  sign: ["sign", "marker", "prop"],
};

/**
 * Fallback chains for roads.
 */
export const ROAD_FALLBACK_CHAINS: Record<RoadType, readonly string[]> = {
  dirt_road: ["dirt_road", "path", "trail", "grass"],
  stone_road: ["stone_road", "cobblestone", "road", "dirt_road", "path"],
  market_loop: ["market_loop", "stone_road", "road", "dirt_road"],
  gate_road: ["gate_road", "stone_road", "road", "dirt_road"],
  grass: ["grass", "tile", "ground"],
};

/**
 * Biome-specific asset tags for roads.
 */
export const BIOME_ROAD_TAGS: Record<BiomeType, readonly string[]> = {
  forest: ["forest", "moss", "grass", "green"],
  plains: ["plains", "grass", "field", "neutral"],
  desert: ["desert", "sand", "dry", "dust"],
  snow: ["snow", "ice", "frozen", "winter"],
  swamp: ["swamp", "mud", "wet", "marsh"],
  mountain: ["mountain", "rocky", "stone", "highland"],
  coastal: ["coastal", "sand", "beach", "shore"],
  urban: ["urban", "stone", "paved", "city"],
};

/**
 * Biome-specific tree variants.
 */
export const BIOME_TREE_TAGS: Record<BiomeType, readonly string[]> = {
  forest: ["forest", "deciduous", "broadleaf", "green"],
  plains: ["plains", "sparse", "scattered", "grassland"],
  desert: ["dead_tree", "dry", "cactus", "desert"],
  snow: ["pine", "evergreen", "snowy", "winter"],
  swamp: ["swamp", "willow", "mangrove", "wet"],
  mountain: ["mountain", "alpine", "rocky", "highland"],
  coastal: ["palm", "tropical", "coastal", "beach"],
  urban: ["urban", "park", "garden", "city"],
};

/**
 * Culture-specific building styles.
 */
export const CULTURE_BUILDING_TAGS: Record<CultureType, readonly string[]> = {
  nordic: ["nordic", "wood", "rune", "snow", "viking"],
  imperial: ["imperial", "stone", "marble", "roman"],
  tribal: ["tribal", "thatch", "wood", "primitive"],
  arcane: ["arcane", "crystal", "magic", "glow"],
  ruined: ["ruined", "broken", "ancient", "moss"],
  desert: ["desert", "sandstone", "mud", "nomad"],
  tropical: ["tropical", "bamboo", "palm", "jungle"],
  generic: ["generic", "standard", "neutral"],
};

/**
 * Culture-specific character styles.
 */
export const CULTURE_CHARACTER_TAGS: Record<CultureType, readonly string[]> = {
  nordic: ["nordic", "viking", "warrior", "fur"],
  imperial: ["imperial", "roman", "legion", "armor"],
  tribal: ["tribal", "savage", "primitive", "tattoo"],
  arcane: ["arcane", "mage", "wizard", "robe"],
  ruined: ["ruined", "scavenger", "survivor", "ragged"],
  desert: ["desert", "bedouin", "nomad", "sandleather"],
  tropical: ["tropical", "islander", "natives", "leaf"],
  generic: ["generic", "civilian", "standard"],
};

/**
 * Wealth level visual modifiers.
 */
export const WEALTH_VISUAL_TAGS: Record<string, readonly string[]> = {
  destitute: ["rags", "poor", "tattered", "worn"],
  poor: ["poor", "worn", "simple", "basic"],
  moderate: ["moderate", "clean", "standard", "normal"],
  wealthy: ["wealthy", "fine", "decorated", "quality"],
  rich: ["rich", "luxury", "ornate", "gold"],
};

/**
 * Danger level visual modifiers.
 */
export const DANGER_VISUAL_TAGS: Record<string, readonly string[]> = {
  safe: ["safe", "peaceful", "calm"],
  unprotected: ["unprotected", "vulnerable", "exposed"],
  protected: ["protected", "guarded", "secured"],
  dangerous: ["dangerous", "fortified", "military"],
  deadly: ["deadly", "fortress", "armed", "war"],
};

/**
 * LOD preference tags.
 */
export const LOD_TAGS = {
  low: ["low-poly", "simple", "minimal", "performance"],
  medium: ["medium", "balanced", "standard"],
  high: ["high-detail", "detailed", "quality", "ultra"],
};

/**
 * World age phase visual tags.
 */
export const WORLD_AGE_TAGS = {
  new: ["new", "fresh", "pristine", "construction"],
  settled: ["settled", "inhabited", "lived-in", "normal"],
  aged: ["aged", "old", "worn", "weathered"],
  ruined: ["ruined", "destroyed", "debris", "abandoned"],
};

/**
 * Searches for an asset entry by category and fallback keys.
 */
export function findFallbackEntry(
  manifest: AssetManifest | null,
  category: string,
  fallbackChain: readonly string[],
  seed: string,
): AssetEntry | null {
  if (!manifest) return null;
  
  const entries = manifest[category as keyof AssetManifest] as Record<string, AssetEntry> | undefined;
  if (!entries) return null;
  
  for (const key of fallbackChain) {
    const entry = entries[key];
    if (entry && entry.src && !entry.src.toLowerCase().endsWith('.json')) {
      return entry;
    }
  }
  
  // No fallback found, return first renderable entry
  const renderableKeys = Object.keys(entries).filter(k => {
    const e = entries[k];
    return e?.src && !e.src.toLowerCase().endsWith('.json');
  });
  
  if (renderableKeys.length === 0) return null;
  return entries[renderableKeys[deterministicIndex(seed, renderableKeys.length)]];
}

/**
 * Returns fallback chain for a building type.
 */
export function getBuildingFallbackChain(type: BuildingType): readonly string[] {
  return BUILDING_FALLBACK_CHAINS[type] ?? ["building", "house"];
}

/**
 * Returns fallback chain for NPC role.
 */
export function getNpcFallbackChain(role: NpcRole): readonly string[] {
  return NPC_FALLBACK_CHAINS[role] ?? ["npc", "civilian", "human"];
}

/**
 * Returns fallback chain for prop type.
 */
export function getPropFallbackChain(type: PropType): readonly string[] {
  return PROP_FALLBACK_CHAINS[type] ?? ["prop", "generic"];
}

/**
 * Returns fallback chain for road type.
 */
export function getRoadFallbackChain(type: RoadType): readonly string[] {
  return ROAD_FALLBACK_CHAINS[type] ?? ["road", "tile", "grass"];
}

/**
 * Gets biome-appropriate tags for roads.
 */
export function getBiomeRoadTags(biome?: BiomeType): readonly string[] {
  return biome ? BIOME_ROAD_TAGS[biome] ?? ["grass"] : ["grass"];
}

/**
 * Gets biome-appropriate tags for trees.
 */
export function getBiomeTreeTags(biome?: BiomeType): readonly string[] {
  return biome ? BIOME_TREE_TAGS[biome] ?? ["tree"] : ["tree"];
}

/**
 * Gets culture-appropriate tags for buildings.
 */
export function getCultureBuildingTags(culture?: CultureType): readonly string[] {
  return culture ? CULTURE_BUILDING_TAGS[culture] ?? ["generic"] : ["generic"];
}

/**
 * Gets culture-appropriate tags for characters.
 */
export function getCultureCharacterTags(culture?: CultureType): readonly string[] {
  return culture ? CULTURE_CHARACTER_TAGS[culture] ?? ["generic"] : ["generic"];
}

/**
 * Combines all context tags into a single array for scoring.
 */
export function combineContextTags(
  biome?: BiomeType,
  culture?: CultureType,
  wealthLevel?: string,
  dangerLevel?: string,
  worldAgePhase?: string,
  lod?: string,
): readonly string[] {
  const tags: string[] = [];
  
  if (biome) tags.push(...(BIOME_ROAD_TAGS[biome] ?? [biome]));
  if (culture) tags.push(...(CULTURE_BUILDING_TAGS[culture] ?? [culture]));
  if (wealthLevel) tags.push(...(WEALTH_VISUAL_TAGS[wealthLevel] ?? []));
  if (dangerLevel) tags.push(...(DANGER_VISUAL_TAGS[dangerLevel] ?? []));
  if (worldAgePhase) tags.push(...(WORLD_AGE_TAGS[worldAgePhase as keyof typeof WORLD_AGE_TAGS] ?? []));
  if (lod) tags.push(...(LOD_TAGS[lod as keyof typeof LOD_TAGS] ?? []));
  
  return tags;
}

/**
 * Gets GraphicRiver fallback chain for a building variant.
 */
export function getGraphicRiverBuildingFallback(variant: string): readonly string[] {
  const normalized = variant.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return GRAPHICRIVER_BUILDING_FALLBACKS[normalized] ?? ["building", "house"];
}

/**
 * Gets GraphicRiver fallback chain for an NPC variant.
 */
export function getGraphicRiverNpcFallback(variant: string): readonly string[] {
  const normalized = variant.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return GRAPHICRIVER_NPC_FALLBACKS[normalized] ?? ["npc", "civilian", "human"];
}

/**
 * Extracts the variant name from a GraphicRiver-style asset ID.
 * Example: "gr_iso_2_towers_cannon_tower_png" -> "cannon_tower"
 */
export function extractGraphicRiverVariant(assetId: string): string | null {
  const match = assetId.match(/gr_iso_\d+_(?:[\w]+_)*([\w]+)(?:_\w+)*/);
  return match ? match[1] : null;
}

/**
 * Checks if an asset ID follows GraphicRiver naming pattern.
 */
export function isGraphicRiverAsset(assetId: string): boolean {
  return /^gr_iso_\d+_/.test(assetId.toLowerCase());
}