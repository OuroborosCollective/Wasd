/**
 * Asset Semantic Profiles
 * 
 * Defines semantic profiles for buildings, NPCs, props, and roads.
 * These profiles guide the binding decision with contextual hints.
 */

import type { AssetEntry } from "../assetManifest";
import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared/world";
import type { 
  AssetBindingContext, 
  BiomeType, 
  CultureType, 
  LodLevel,
  WorldAgePhase,
  WealthLevel,
  DangerLevel,
} from "./AssetBindingContext";

/**
 * Semantic query for asset binding.
 */
export interface SemanticQuery {
  readonly semanticType: string;
  readonly kind?: string;
  readonly group?: string;
  readonly tags: readonly string[];
  readonly biomeTags?: readonly string[];
  readonly cultureTags?: readonly string[];
  readonly factionTags?: readonly string[];
  readonly lod?: LodLevel;
  readonly wealthLevel?: WealthLevel;
  readonly dangerLevel?: DangerLevel;
  readonly worldAgePhase?: WorldAgePhase;
  readonly variantHint?: string;
}

/**
 * Building semantic profile.
 */
export interface BuildingProfile {
  readonly buildingType: BuildingType;
  readonly primaryKind: string;
  readonly secondaryKinds: readonly string[];
  readonly tags: readonly string[];
  readonly baseWeight: number;
  readonly qualityBonus: number;
  readonly lodPreference: LodLevel;
  readonly fortificationTags: readonly string[];
  readonly decorationTags: readonly string[];
}

/**
 * NPC semantic profile.
 */
export interface NpcProfile {
  readonly role: NpcRole;
  readonly primaryKind: string;
  readonly secondaryKinds: readonly string[];
  readonly tags: readonly string[];
  readonly baseWeight: number;
  readonly equipmentLevel: number;
  readonly combatTags: readonly string[];
  readonly civilianTags: readonly string[];
}

/**
 * Prop semantic profile.
 */
export interface PropProfile {
  readonly propType: PropType;
  readonly primaryKind: string;
  readonly secondaryKinds: readonly string[];
  readonly tags: readonly string[];
  readonly baseWeight: number;
  readonly sizeCategory: "small" | "medium" | "large";
  readonly animationTags: readonly string[];
  readonly decorativeTags: readonly string[];
}

/**
 * Road semantic profile.
 */
export interface RoadProfile {
  readonly roadType: RoadType;
  readonly primaryKind: string;
  readonly secondaryKinds: readonly string[];
  readonly tags: readonly string[];
  readonly baseWeight: number;
  readonly wearTags: readonly string[];
  readonly trafficTags: readonly string[];
}

/**
 * Building profiles for all building types.
 */
export const BUILDING_PROFILES: Record<BuildingType, BuildingProfile> = {
  house: {
    buildingType: "house",
    primaryKind: "house",
    secondaryKinds: ["hut", "cottage", "residence"],
    tags: ["house", "residence", "home", "dwelling"],
    baseWeight: 1.0,
    qualityBonus: 10,
    lodPreference: "high",
    fortificationTags: [],
    decorationTags: ["chimney", "window", "door", "garden"],
  },
  guard_post: {
    buildingType: "guard_post",
    primaryKind: "tower",
    secondaryKinds: ["watchtower", "tower", "military"],
    tags: ["guard", "tower", "military", "watch", "fortification"],
    baseWeight: 0.8,
    qualityBonus: 15,
    lodPreference: "high",
    fortificationTags: ["stone", "iron", "military"],
    decorationTags: ["flag", "torch", "banner"],
  },
  blacksmith: {
    buildingType: "blacksmith",
    primaryKind: "house",
    secondaryKinds: ["forge", "workshop", "smithy"],
    tags: ["blacksmith", "forge", "workshop", "craft", "metal"],
    baseWeight: 0.7,
    qualityBonus: 12,
    lodPreference: "medium",
    fortificationTags: [],
    decorationTags: ["anvil", "smoke", "fire", "tool"],
  },
  trader_shop: {
    buildingType: "trader_shop",
    primaryKind: "house",
    secondaryKinds: ["shop", "store", "market"],
    tags: ["trader", "shop", "store", "merchant", "commerce"],
    baseWeight: 0.6,
    qualityBonus: 14,
    lodPreference: "medium",
    fortificationTags: [],
    decorationTags: ["sign", "goods", "banner", "crate"],
  },
  inn: {
    buildingType: "inn",
    primaryKind: "house",
    secondaryKinds: ["tavern", "inn", "pub"],
    tags: ["inn", "tavern", "pub", "food", "rest"],
    baseWeight: 0.5,
    qualityBonus: 13,
    lodPreference: "medium",
    fortificationTags: [],
    decorationTags: ["sign", "bench", "barrel", "lamp"],
  },
  healer_hut: {
    buildingType: "healer_hut",
    primaryKind: "house",
    secondaryKinds: ["temple", "shrine", "hospital"],
    tags: ["healer", "temple", "shrine", "medical", "magic"],
    baseWeight: 0.4,
    qualityBonus: 18,
    lodPreference: "medium",
    fortificationTags: [],
    decorationTags: ["cross", "potion", "herb", "glow"],
  },
  church: {
    buildingType: "church",
    primaryKind: "house",
    secondaryKinds: ["temple", "cathedral", "shrine"],
    tags: ["church", "temple", "religious", "holy"],
    baseWeight: 0.3,
    qualityBonus: 20,
    lodPreference: "high",
    fortificationTags: [],
    decorationTags: ["cross", "spire", "stained", "bell"],
  },
  warehouse: {
    buildingType: "warehouse",
    primaryKind: "house",
    secondaryKinds: ["storage", "barn", "depot"],
    tags: ["warehouse", "storage", "barn", "depot"],
    baseWeight: 0.5,
    qualityBonus: 8,
    lodPreference: "medium",
    fortificationTags: [],
    decorationTags: ["crate", "barrel", "door"],
  },
  farm: {
    buildingType: "farm",
    primaryKind: "house",
    secondaryKinds: ["barn", "farmhouse", "silo"],
    tags: ["farm", "barn", "agriculture", "rural"],
    baseWeight: 0.7,
    qualityBonus: 6,
    lodPreference: "medium",
    fortificationTags: [],
    decorationTags: ["hay", "fence", "animal", "field"],
  },
  mine: {
    buildingType: "mine",
    primaryKind: "house",
    secondaryKinds: ["cave", "entrance", "dungeon"],
    tags: ["mine", "cave", "entrance", "underground", "resource"],
    baseWeight: 0.3,
    qualityBonus: 10,
    lodPreference: "low",
    fortificationTags: [],
    decorationTags: ["wood", "support", "cart", "pickaxe"],
  },
  castle: {
    buildingType: "castle",
    primaryKind: "castle",
    secondaryKinds: ["fort", "keep", "fortress"],
    tags: ["castle", "fort", "fortress", "military", "noble"],
    baseWeight: 0.2,
    qualityBonus: 25,
    lodPreference: "high",
    fortificationTags: ["stone", "tower", "wall", "moat"],
    decorationTags: ["flag", "banner", "emblem", "guard"],
  },
  wall: {
    buildingType: "wall",
    primaryKind: "house",
    secondaryKinds: ["fence", "barrier", "fortification"],
    tags: ["wall", "fence", "barrier", "defense"],
    baseWeight: 0.4,
    qualityBonus: 5,
    lodPreference: "low",
    fortificationTags: ["stone", "iron", "wood"],
    decorationTags: [],
  },
};

/**
 * NPC profiles for all roles.
 */
export const NPC_PROFILES: Record<NpcRole, NpcProfile> = {
  civilian: {
    role: "civilian",
    primaryKind: "npc",
    secondaryKinds: ["human", "adult", "worker"],
    tags: ["civilian", "human", "adult", "worker"],
    baseWeight: 1.0,
    equipmentLevel: 0,
    combatTags: [],
    civilianTags: ["dress", "simple", "apron", "tool"],
  },
  child: {
    role: "child",
    primaryKind: "npc",
    secondaryKinds: ["human", "young", "child"],
    tags: ["child", "young", "civilian", "kid"],
    baseWeight: 0.8,
    equipmentLevel: 0,
    combatTags: [],
    civilianTags: ["small", "simple", "toy"],
  },
  guard: {
    role: "guard",
    primaryKind: "soldier",
    secondaryKinds: ["warrior", "guard", "soldier"],
    tags: ["guard", "soldier", "warrior", "military"],
    baseWeight: 0.9,
    equipmentLevel: 2,
    combatTags: ["armor", "weapon", "shield", "sword"],
    civilianTags: [],
  },
  guard_captain: {
    role: "guard_captain",
    primaryKind: "soldier",
    secondaryKinds: ["captain", "commander", "knight"],
    tags: ["guard", "captain", "commander", "noble", "military"],
    baseWeight: 0.5,
    equipmentLevel: 4,
    combatTags: ["armor", "weapon", "shield", "cape", "helm"],
    civilianTags: [],
  },
  blacksmith: {
    role: "blacksmith",
    primaryKind: "npc",
    secondaryKinds: ["worker", "craftsman", "smith"],
    tags: ["blacksmith", "worker", "craftsman", "smith"],
    baseWeight: 0.6,
    equipmentLevel: 1,
    combatTags: [],
    civilianTags: ["apron", "hammer", "leather", "dirty"],
  },
  merchant: {
    role: "merchant",
    primaryKind: "npc",
    secondaryKinds: ["trader", "vendor", "shopkeeper"],
    tags: ["merchant", "trader", "vendor", "shopkeeper"],
    baseWeight: 0.5,
    equipmentLevel: 1,
    combatTags: [],
    civilianTags: ["rich", "fine", "robe", "coin"],
  },
  healer: {
    role: "healer",
    primaryKind: "npc",
    secondaryKinds: ["priest", "cleric", "doctor"],
    tags: ["healer", "priest", "cleric", "doctor", "magic"],
    baseWeight: 0.4,
    equipmentLevel: 1,
    combatTags: [],
    civilianTags: ["robe", "staff", "potion", "holy"],
  },
  noble: {
    role: "noble",
    primaryKind: "npc",
    secondaryKinds: ["lord", "lady", "royal"],
    tags: ["noble", "lord", "royal", "wealthy"],
    baseWeight: 0.3,
    equipmentLevel: 3,
    combatTags: [],
    civilianTags: ["fine", "rich", "silk", "crown", "jewel"],
  },
  farmer: {
    role: "farmer",
    primaryKind: "npc",
    secondaryKinds: ["worker", "peasant", "agricultural"],
    tags: ["farmer", "worker", "peasant", "rural"],
    baseWeight: 0.7,
    equipmentLevel: 0,
    combatTags: [],
    civilianTags: ["simple", "dirty", "hat", "tool"],
  },
  animal: {
    role: "animal",
    primaryKind: "animal",
    secondaryKinds: ["creature", "beast", "pet"],
    tags: ["animal", "creature", "beast", "pet", "mount"],
    baseWeight: 0.5,
    equipmentLevel: 0,
    combatTags: ["teeth", "claw", "horn"],
    civilianTags: ["domestic", "wild", "mount"],
  },
};

/**
 * Prop profiles for all prop types.
 */
export const PROP_PROFILES: Record<PropType, PropProfile> = {
  tree: {
    propType: "tree",
    primaryKind: "tree",
    secondaryKinds: ["pine", "oak", "plant"],
    tags: ["tree", "plant", "nature", "forest"],
    baseWeight: 1.0,
    sizeCategory: "large",
    animationTags: [],
    decorativeTags: ["leaf", "branch", "shadow"],
  },
  bush: {
    propType: "bush",
    primaryKind: "bush",
    secondaryKinds: ["shrub", "plant", "hedge"],
    tags: ["bush", "shrub", "plant", "nature"],
    baseWeight: 0.8,
    sizeCategory: "medium",
    animationTags: [],
    decorativeTags: ["leaf", "flower", "berry"],
  },
  flower: {
    propType: "flower",
    primaryKind: "flower",
    secondaryKinds: ["plant", "herb", "garden"],
    tags: ["flower", "plant", "herb", "garden"],
    baseWeight: 0.6,
    sizeCategory: "small",
    animationTags: ["sway"],
    decorativeTags: ["petal", "color", "sweet"],
  },
  rock: {
    propType: "rock",
    primaryKind: "rock",
    secondaryKinds: ["stone", "boulder", "debris"],
    tags: ["rock", "stone", "boulder", "mineral"],
    baseWeight: 0.7,
    sizeCategory: "medium",
    animationTags: [],
    decorativeTags: ["moss", "shadow"],
  },
  fence: {
    propType: "fence",
    primaryKind: "fence",
    secondaryKinds: ["barrier", "wall", "hedge"],
    tags: ["fence", "barrier", "wall", "defense"],
    baseWeight: 0.5,
    sizeCategory: "medium",
    animationTags: [],
    decorativeTags: ["wood", "post", "point"],
  },
  well: {
    propType: "well",
    primaryKind: "well",
    secondaryKinds: ["water", "source", "pump"],
    tags: ["well", "water", "source", "utility"],
    baseWeight: 0.4,
    sizeCategory: "medium",
    animationTags: [],
    decorativeTags: ["bucket", "rope", "stone"],
  },
  chest: {
    propType: "chest",
    primaryKind: "chest",
    secondaryKinds: ["container", "box", "treasure"],
    tags: ["chest", "container", "treasure", "loot"],
    baseWeight: 0.3,
    sizeCategory: "small",
    animationTags: [],
    decorativeTags: ["metal", "lock", "gold"],
  },
  sign: {
    propType: "sign",
    primaryKind: "sign",
    secondaryKinds: ["marker", "post", "board"],
    tags: ["sign", "marker", "post", "info"],
    baseWeight: 0.4,
    sizeCategory: "small",
    animationTags: [],
    decorativeTags: ["text", "wood", "nail"],
  },
};

/**
 * Road profiles for all road types.
 */
export const ROAD_PROFILES: Record<RoadType, RoadProfile> = {
  dirt_road: {
    roadType: "dirt_road",
    primaryKind: "road",
    secondaryKinds: ["path", "trail", "track"],
    tags: ["dirt", "road", "path", "trail", "ground"],
    baseWeight: 1.0,
    wearTags: ["worn", "rut", "dust"],
    trafficTags: ["low", "medium", "high"],
  },
  stone_road: {
    roadType: "stone_road",
    primaryKind: "road",
    secondaryKinds: ["cobblestone", "paved", "stone"],
    tags: ["stone", "road", "cobblestone", "paved", "urban"],
    baseWeight: 0.9,
    wearTags: ["worn", "crack", "moss"],
    trafficTags: ["low", "medium", "high"],
  },
  market_loop: {
    roadType: "market_loop",
    primaryKind: "road",
    secondaryKinds: ["plaza", "market", "stone"],
    tags: ["market", "plaza", "stone", "paved", "commercial"],
    baseWeight: 0.6,
    wearTags: ["worn", "stain", "debris"],
    trafficTags: ["high", "crowded"],
  },
  gate_road: {
    roadType: "gate_road",
    primaryKind: "road",
    secondaryKinds: ["gate", "entrance", "stone"],
    tags: ["gate", "entrance", "stone", "fortified"],
    baseWeight: 0.5,
    wearTags: ["worn", "traffic"],
    trafficTags: ["medium", "high"],
  },
  grass: {
    roadType: "grass",
    primaryKind: "tile",
    secondaryKinds: ["ground", "terrain", "field"],
    tags: ["grass", "ground", "terrain", "field", "nature"],
    baseWeight: 0.8,
    wearTags: [],
    trafficTags: ["low"],
  },
};

/**
 * Converts a building type to a semantic profile.
 */
export function getBuildingProfile(type: BuildingType): BuildingProfile {
  return BUILDING_PROFILES[type] ?? BUILDING_PROFILES.house;
}

/**
 * Converts an NPC role to a semantic profile.
 */
export function getNpcProfile(role: NpcRole): NpcProfile {
  return NPC_PROFILES[role] ?? NPC_PROFILES.civilian;
}

/**
 * Converts a prop type to a semantic profile.
 */
export function getPropProfile(type: PropType): PropProfile {
  return PROP_PROFILES[type] ?? PROP_PROFILES.tree;
}

/**
 * Converts a road type to a semantic profile.
 */
export function getRoadProfile(type: RoadType): RoadProfile {
  return ROAD_PROFILES[type] ?? ROAD_PROFILES.dirt_road;
}

/**
 * Creates a semantic query from a building binding context.
 */
export function createBuildingQuery(
  type: BuildingType,
  context: AssetBindingContext,
): SemanticQuery {
  const profile = getBuildingProfile(type);
  
  return {
    semanticType: type,
    kind: profile.primaryKind,
    tags: profile.tags,
    biomeTags: getBiomeTags(context.biome),
    cultureTags: getCultureTags(context.culture),
    lod: context.lod ?? profile.lodPreference,
    wealthLevel: context.wealthLevel,
    dangerLevel: context.dangerLevel,
    worldAgePhase: context.worldAgePhase,
    variantHint: context.variantHint,
  };
}

/**
 * Creates a semantic query from an NPC binding context.
 */
export function createNpcQuery(
  role: NpcRole,
  context: AssetBindingContext,
): SemanticQuery {
  const profile = getNpcProfile(role);
  
  return {
    semanticType: role,
    kind: profile.primaryKind,
    tags: profile.tags,
    biomeTags: getBiomeTags(context.biome),
    cultureTags: getCultureTags(context.culture),
    lod: context.lod ?? "high",
    wealthLevel: context.wealthLevel,
    dangerLevel: context.dangerLevel,
    worldAgePhase: context.worldAgePhase,
    variantHint: context.variantHint,
  };
}

/**
 * Creates a semantic query from a prop binding context.
 */
export function createPropQuery(
  type: PropType,
  context: AssetBindingContext,
): SemanticQuery {
  const profile = getPropProfile(type);
  
  return {
    semanticType: type,
    kind: profile.primaryKind,
    tags: profile.tags,
    biomeTags: getBiomeTags(context.biome),
    cultureTags: getCultureTags(context.culture),
    lod: context.lod ?? "high",
    wealthLevel: context.wealthLevel,
    dangerLevel: context.dangerLevel,
    worldAgePhase: context.worldAgePhase,
    variantHint: context.variantHint,
  };
}

/**
 * Creates a semantic query from a road binding context.
 */
export function createRoadQuery(
  type: RoadType,
  context: AssetBindingContext,
): SemanticQuery {
  const profile = getRoadProfile(type);
  
  return {
    semanticType: type,
    kind: profile.primaryKind,
    tags: profile.tags,
    biomeTags: getBiomeRoadTags(context.biome),
    cultureTags: getCultureTags(context.culture),
    lod: context.lod ?? "medium",
    wealthLevel: context.wealthLevel,
    dangerLevel: context.dangerLevel,
    worldAgePhase: context.worldAgePhase,
    variantHint: context.variantHint,
  };
}

/**
 * Gets biome tags for semantic queries.
 */
function getBiomeTags(biome?: BiomeType): readonly string[] {
  const biomeTagMap: Record<BiomeType, readonly string[]> = {
    forest: ["forest", "green", "tree", "moss"],
    plains: ["plains", "grass", "field", "meadow"],
    desert: ["desert", "sand", "dry", "cactus"],
    snow: ["snow", "ice", "winter", "frozen"],
    swamp: ["swamp", "mud", "wet", "marsh"],
    mountain: ["mountain", "rock", "alpine", "high"],
    coastal: ["coastal", "beach", "sand", "ocean"],
    urban: ["urban", "city", "paved", "stone"],
  };
  return biome ? (biomeTagMap[biome] ?? [biome]) : [];
}

/**
 * Gets biome tags for roads.
 */
function getBiomeRoadTags(biome?: BiomeType): readonly string[] {
  const biomeTagMap: Record<BiomeType, readonly string[]> = {
    forest: ["forest", "moss", "grass", "green"],
    plains: ["plains", "grass", "field", "neutral"],
    desert: ["desert", "sand", "dry", "dust"],
    snow: ["snow", "ice", "frozen", "winter"],
    swamp: ["swamp", "mud", "wet", "marsh"],
    mountain: ["mountain", "rocky", "stone", "highland"],
    coastal: ["coastal", "sand", "beach", "shore"],
    urban: ["urban", "stone", "paved", "city"],
  };
  return biome ? (biomeTagMap[biome] ?? ["grass"]) : ["grass"];
}

/**
 * Gets culture tags for semantic queries.
 */
function getCultureTags(culture?: CultureType): readonly string[] {
  const cultureTagMap: Record<CultureType, readonly string[]> = {
    nordic: ["nordic", "viking", "wood", "rune"],
    imperial: ["imperial", "roman", "stone", "marble"],
    tribal: ["tribal", "thatch", "wood", "primitive"],
    arcane: ["arcane", "crystal", "magic", "glow"],
    ruined: ["ruined", "broken", "ancient", "moss"],
    desert: ["desert", "sandstone", "mud", "nomad"],
    tropical: ["tropical", "bamboo", "palm", "jungle"],
    generic: ["generic", "standard", "neutral"],
  };
  return culture ? (cultureTagMap[culture] ?? [culture]) : [];
}