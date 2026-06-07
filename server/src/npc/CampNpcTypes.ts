/**
 * CAMP NPC GATHERER TYPES
 *
 * Deterministic camp gatherer NPC types for ARELogic.
 * These NPCs inhabit gathering camp POIs and perform gathering loops.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now()
 * - Deterministic IDs based on POI ID
 * - Deterministic activity based on currentTick
 * - NPC output goes to camp stock, NOT player inventory
 */

/**
 * Camp NPC types - one per gathering camp type.
 */
export type CampNpcType = "camp_woodcutter" | "camp_miner" | "camp_fisher";

/**
 * Camp NPC activity states.
 */
export type CampNpcActivity = "gathering" | "returning" | "depositing";

/**
 * NPC state for snapshot.
 */
export type CampNpcState = "idle" | "working" | "resting";

/**
 * Camp NPC position.
 */
export interface CampNpcPosition {
  x: number;
  y: number;
}

/**
 * Camp NPC snapshot for server-authoritative display.
 */
export interface CampNpcSnapshot {
  readonly id: string;
  readonly type: CampNpcType;
  readonly name: string;
  readonly role: string;
  readonly poiId: string;
  readonly position: CampNpcPosition;
  readonly state: CampNpcState;
  readonly activity: CampNpcActivity;
  readonly activityMessage: string;
}

/**
 * Camp stock entry - tracks resources at the camp.
 */
export interface CampStockEntry {
  readonly itemId: string;
  readonly quantity: number;
  /** Buy price in coins, null if not buyable */
  readonly buyPrice?: number | null;
}

/**
 * Camp stock snapshot for display.
 */
export interface CampStockSnapshot {
  readonly poiId: string;
  readonly items: readonly CampStockEntry[];
  readonly lastUpdatedTick: number;
}

/**
 * Mapping from POI type to NPC type.
 */
export const POI_TO_NPC_TYPE: Record<string, CampNpcType> = {
  logging_camp: "camp_woodcutter",
  mining_camp: "camp_miner",
  fishing_camp: "camp_fisher",
};

/**
 * Get NPC type for a POI type.
 */
export function getNpcTypeForPoiType(poiType: string): CampNpcType | null {
  return POI_TO_NPC_TYPE[poiType] ?? null;
}

/**
 * Get the resource item ID produced by each camp type.
 */
export const CAMP_OUTPUT_ITEM: Record<CampNpcType, string> = {
  camp_woodcutter: "wood_log",
  camp_miner: "copper_ore",
  camp_fisher: "raw_fish",
};

/**
 * Get NPC name based on type.
 */
export function getNpcName(type: CampNpcType): string {
  switch (type) {
    case "camp_woodcutter":
      return "Arel Woodcutter";
    case "camp_miner":
      return "Arel Miner";
    case "camp_fisher":
      return "Arel Fisher";
  }
}

/**
 * Get NPC role based on type.
 */
export function getNpcRole(type: CampNpcType): string {
  switch (type) {
    case "camp_woodcutter":
      return "Lumberjack";
    case "camp_miner":
      return "Miner";
    case "camp_fisher":
      return "Fisher";
  }
}

/**
 * Activity messages for each NPC type and activity state.
 */
export const ACTIVITY_MESSAGES: Record<CampNpcType, Record<CampNpcActivity, string>> = {
  camp_woodcutter: {
    gathering: "Chopping nearby trees",
    returning: "Carrying wood",
    depositing: "Stacking logs",
  },
  camp_miner: {
    gathering: "Mining ore vein",
    returning: "Hauling ore",
    depositing: "Sorting ore",
  },
  camp_fisher: {
    gathering: "Casting line",
    returning: "Carrying fish",
    depositing: "Packing fish",
  },
};

/**
 * Interaction dialogue lines for camp NPCs.
 */
export const NPC_DIALOGUE: Record<CampNpcType, { greeting: string; gathering: string; depositing: string; trading: string }> = {
  camp_woodcutter: {
    greeting: "Trees are thick here. Better axes bring better yield.",
    gathering: "I'm working now.",
    depositing: "We have some stock at camp.",
    trading: "I can sell you spare logs from the camp stock.",
  },
  camp_miner: {
    greeting: "Ore runs deep in this camp. Bring a stronger pickaxe.",
    gathering: "I'm working now.",
    depositing: "We have some stock at camp.",
    trading: "We have ore stock if you can pay.",
  },
  camp_fisher: {
    greeting: "Fish bite better near calm water.",
    gathering: "I'm working now.",
    depositing: "We have some stock at camp.",
    trading: "Fresh fish from the camp, if you have coin.",
  },
};

/**
 * Activity cycle length in ticks (40 ticks = 4 seconds at 10Hz).
 */
export const ACTIVITY_CYCLE_LENGTH = 40;

/**
 * Get the current activity phase based on tick.
 * 0-19: gathering (20 ticks)
 * 20-29: returning (10 ticks)
 * 30-39: depositing (10 ticks)
 */
export function getActivityPhase(currentTick: number): CampNpcActivity {
  const phase = currentTick % ACTIVITY_CYCLE_LENGTH;
  if (phase < 20) return "gathering";
  if (phase < 30) return "returning";
  return "depositing";
}

/**
 * Check if a POI type is a gathering camp.
 */
export function isGatheringCamp(poiType: string): boolean {
  return poiType in POI_TO_NPC_TYPE;
}

/**
 * Get the resource item ID produced by a camp POI type.
 */
export function getCampOutputItemId(poiType: string): string | null {
  const npcType = getNpcTypeForPoiType(poiType);
  if (!npcType) return null;
  return CAMP_OUTPUT_ITEM[npcType];
}