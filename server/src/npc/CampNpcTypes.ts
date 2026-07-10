/**
 * CAMP NPC GATHERER TYPES
 *
 * Deterministic camp gatherer NPC types for ARELogic.
 */

export type CampNpcType = "camp_woodcutter" | "camp_miner" | "camp_fisher";
export type CampNpcActivity = "gathering" | "returning" | "depositing";
export type CampNpcState = "idle" | "working" | "resting";

export interface CampNpcPosition {
  x: number;
  y: number;
}

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

export interface CampStockEntry {
  readonly itemId: string;
  readonly quantity: number;
  readonly buyPrice?: number | null;
}

export interface CampStockSnapshot {
  readonly poiId: string;
  readonly items: readonly CampStockEntry[];
  readonly lastUpdatedTick: number | null;
  readonly observedAtTick: number;
  readonly revisionHash: string;
}

export const POI_TO_NPC_TYPE: Record<string, CampNpcType> = Object.freeze({
  logging_camp: "camp_woodcutter",
  mining_camp: "camp_miner",
  fishing_camp: "camp_fisher",
});

export function getNpcTypeForPoiType(poiType: string): CampNpcType | null {
  return POI_TO_NPC_TYPE[poiType] ?? null;
}

export const CAMP_OUTPUT_ITEM: Record<CampNpcType, string> = Object.freeze({
  camp_woodcutter: "wood_log",
  camp_miner: "copper_ore",
  camp_fisher: "raw_fish",
});

export function getNpcName(type: CampNpcType): string {
  switch (type) {
    case "camp_woodcutter": return "Arel Woodcutter";
    case "camp_miner": return "Arel Miner";
    case "camp_fisher": return "Arel Fisher";
  }
}

export function getNpcRole(type: CampNpcType): string {
  switch (type) {
    case "camp_woodcutter": return "Lumberjack";
    case "camp_miner": return "Miner";
    case "camp_fisher": return "Fisher";
  }
}

export const ACTIVITY_MESSAGES: Record<CampNpcType, Record<CampNpcActivity, string>> = Object.freeze({
  camp_woodcutter: Object.freeze({
    gathering: "Chopping nearby trees",
    returning: "Carrying wood",
    depositing: "Stacking logs",
  }),
  camp_miner: Object.freeze({
    gathering: "Mining ore vein",
    returning: "Hauling ore",
    depositing: "Sorting ore",
  }),
  camp_fisher: Object.freeze({
    gathering: "Casting line",
    returning: "Carrying fish",
    depositing: "Packing fish",
  }),
});

export const NPC_DIALOGUE: Record<CampNpcType, { greeting: string; gathering: string; depositing: string; trading: string }> = Object.freeze({
  camp_woodcutter: Object.freeze({
    greeting: "Trees are thick here. Better axes bring better yield.",
    gathering: "I'm working now.",
    depositing: "We have some stock at camp.",
    trading: "I can sell you spare logs from the camp stock.",
  }),
  camp_miner: Object.freeze({
    greeting: "Ore runs deep in this camp. Bring a stronger pickaxe.",
    gathering: "I'm working now.",
    depositing: "We have some stock at camp.",
    trading: "We have ore stock if you can pay.",
  }),
  camp_fisher: Object.freeze({
    greeting: "Fish bite better near calm water.",
    gathering: "I'm working now.",
    depositing: "We have some stock at camp.",
    trading: "Fresh fish from the camp, if you have coin.",
  }),
});

export const ACTIVITY_CYCLE_LENGTH = 40;

export function getActivityPhase(currentTick: number): CampNpcActivity {
  const safeTick = Number.isSafeInteger(currentTick) && currentTick >= 0 ? currentTick : 0;
  const phase = safeTick % ACTIVITY_CYCLE_LENGTH;
  if (phase < 20) return "gathering";
  if (phase < 30) return "returning";
  return "depositing";
}

export function isGatheringCamp(poiType: string): boolean {
  return poiType in POI_TO_NPC_TYPE;
}

export function getCampOutputItemId(poiType: string): string | null {
  const npcType = getNpcTypeForPoiType(poiType);
  return npcType ? CAMP_OUTPUT_ITEM[npcType] : null;
}
