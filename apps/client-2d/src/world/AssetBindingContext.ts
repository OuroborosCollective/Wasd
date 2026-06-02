/**
 * Asset Binding Context Types
 * 
 * Extended context for deterministic, adaptive asset binding.
 * Supports biome, culture, faction, wealth, danger, and LOD awareness.
 * Never uses Date.now() or Math.random() - all decisions are seeded.
 */

import type { BuildingType, NpcRole, PropType, RoadType } from "@wasd/shared/world";

/**
 * Supported biome types for visual adaptation.
 */
export type BiomeType = "forest" | "plains" | "desert" | "snow" | "swamp" | "mountain" | "coastal" | "urban";

/**
 * Settlement tiers that affect visual complexity and quality.
 */
export type SettlementTier = "camp" | "village" | "town" | "city" | "capital";

/**
 * Cultural styles that affect building and character visuals.
 */
export type CultureType = "nordic" | "imperial" | "tribal" | "arcane" | "ruined" | "desert" | "tropical" | "generic";

/**
 * Faction identifier for visual theming.
 */
export type FactionId = string;

/**
 * Level of Detail for performance-aware asset selection.
 */
export type LodLevel = "low" | "medium" | "high";

/**
 * World age phases for deterministic visual evolution.
 */
export type WorldAgePhase = "new" | "settled" | "aged" | "ruined";

/**
 * Time band derived from WorldTick, not Date.now().
 */
export type TimeBand = "day" | "night" | "dawn" | "dusk";

/**
 * Seasons affect vegetation and atmosphere.
 */
export type SeasonType = "spring" | "summer" | "autumn" | "winter";

/**
 * Wealth level affects building decoration and NPC equipment.
 */
export type WealthLevel = "destitute" | "poor" | "moderate" | "wealthy" | "rich";

/**
 * Danger level affects NPC presence and building fortification.
 */
export type DangerLevel = "safe" | "unprotected" | "protected" | "dangerous" | "deadly";

/**
 * Complete context for asset binding decisions.
 * All values come from world state, NOT from runtime/time sources.
 */
export interface AssetBindingContext {
  /** Deterministic seed for this binding decision */
  readonly seed: string | number;
  
  /** Primary biome affecting visual style */
  readonly biome?: BiomeType;
  
  /** Region identifier for unique theming */
  readonly regionId?: string;
  
  /** Settlement tier for visual complexity */
  readonly settlementTier?: SettlementTier;
  
  /** Faction ID for visual theming */
  readonly factionId?: string;
  
  /** Cultural style */
  readonly culture?: CultureType;
  
  /** Danger level affecting NPC/building visuals */
  readonly dangerLevel?: DangerLevel;
  
  /** Wealth level affecting decoration quality */
  readonly wealthLevel?: WealthLevel;
  
  /** Season affecting vegetation and atmosphere */
  readonly season?: SeasonType;
  
  /** Time band derived from WorldTick */
  readonly timeBand?: TimeBand;
  
  /** Level of detail for performance */
  readonly lod?: LodLevel;
  
  /** Variant hint for additional variation */
  readonly variantHint?: string;
  
  /** World age phase for visual evolution */
  readonly worldAgePhase?: WorldAgePhase;
  
  /** Distance from camera for LOD decisions */
  readonly cameraDistance?: number;
  
  /** Performance mode (e.g., "android-low") */
  readonly performanceMode?: string;
}

/**
 * Binding context for NPCs with role-specific data.
 */
export interface NpcBindingContext extends AssetBindingContext {
  /** NPC role affecting appearance */
  readonly role: NpcRole;
  
  /** NPC rank within faction */
  readonly rank?: string;
  
  /** NPC profession for equipment visual */
  readonly profession?: string;
  
  /** Whether NPC is a leader */
  readonly isLeader?: boolean;
  
  /** Whether NPC is a merchant */
  readonly isMerchant?: boolean;
}

/**
 * Binding context for buildings.
 */
export interface BuildingBindingContext extends AssetBindingContext {
  /** Building type */
  readonly buildingType: BuildingType;
  
  /** Building size category */
  readonly sizeCategory?: "small" | "medium" | "large" | "fortification";
  
  /** Building condition for visual damage */
  readonly condition?: "pristine" | "worn" | "damaged" | "ruined";
  
  /** Whether building is fortified */
  readonly fortified?: boolean;
}

/**
 * Binding context for props.
 */
export interface PropBindingContext extends AssetBindingContext {
  /** Prop type */
  readonly propType: PropType;
  
  /** Prop size */
  readonly size?: "small" | "medium" | "large";
  
  /** Whether prop is animated */
  readonly animated?: boolean;
}

/**
 * Binding context for roads.
 */
export interface RoadBindingContext extends AssetBindingContext {
  /** Road type */
  readonly roadType: RoadType;
  
  /** Road condition */
  readonly condition?: "pristine" | "worn" | "damaged";
  
  /** Road traffic level */
  readonly trafficLevel?: "low" | "medium" | "high";
}

/**
 * Simplified binding options for quick bindings.
 */
export interface BindingOptions {
  /** Seed for deterministic selection */
  seed: string | number;
  
  /** Biome for visual adaptation */
  biome?: BiomeType;
  
  /** Faction for theming */
  factionId?: string;
  
  /** Culture for style */
  culture?: CultureType;
  
  /** LOD for performance */
  lod?: LodLevel;
  
  /** Wealth level for decoration */
  wealthLevel?: WealthLevel;
  
  /** Danger level for fortification */
  dangerLevel?: DangerLevel;
  
  /** World age phase */
  worldAgePhase?: WorldAgePhase;
  
  /** Variant hint for variation */
  variantHint?: string;
}

/**
 * Creates an AssetBindingContext from BindingOptions with defaults.
 */
export function createBindingContext(options: BindingOptions): AssetBindingContext {
  return {
    seed: options.seed,
    biome: options.biome ?? "forest",
    factionId: options.factionId,
    culture: options.culture ?? "generic",
    lod: options.lod ?? "high",
    wealthLevel: options.wealthLevel,
    dangerLevel: options.dangerLevel,
    worldAgePhase: options.worldAgePhase,
    variantHint: options.variantHint,
  };
}

/**
 * Derives world age phase from world tick deterministically.
 * NOT from Date.now() - uses world tick from server state.
 */
export function deriveWorldAgePhase(worldTick: number): WorldAgePhase {
  if (worldTick < 100_000) return "new";
  if (worldTick < 1_000_000) return "settled";
  if (worldTick < 5_000_000) return "aged";
  return "ruined";
}

/**
 * Derives time band from world tick deterministically.
 */
export function deriveTimeBand(worldTick: number): TimeBand {
  // World tick cycles through day phases
  const phase = worldTick % 1000;
  if (phase < 100) return "dawn";
  if (phase < 250) return "day";
  if (phase < 450) return "dusk";
  if (phase < 650) return "night";
  if (phase < 750) return "dusk";
  return "dawn";
}

/**
 * Derives season from world tick deterministically.
 */
export function deriveSeason(worldTick: number): SeasonType {
  const seasonIndex = Math.floor((worldTick / 1_000_000) % 4);
  return ["spring", "summer", "autumn", "winter"][seasonIndex] as SeasonType;
}