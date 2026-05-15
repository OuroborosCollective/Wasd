export type LootQuality = "common" | "magic" | "rare" | "epic" | "legendary" | "mythic";

export interface LootRollContext {
  seed: string;
  worldHash: string;
  chunkHash: string;
  chunkId: string;
  tick: number;
  actorId: string;
  sourceId: string;
  playerPublicKey?: string;
  modifiers?: Partial<Record<LootQuality | "noDrop" | "quantity", number>>;
}

export interface LootItemDefinition {
  id: string;
  name: string;
  itemType: "currency" | "material" | "consumable" | "weapon" | "armor" | "trinket" | "rune" | "relic" | "quest";
  baseQuality: LootQuality;
  tier: number;
  tags?: string[];
  glbAssetId?: string;
}

export interface TreasureClassEntry {
  id: string;
  weight: number;
  type: "item" | "treasureClass" | "dynamic" | "noDrop";
  qualityHint?: LootQuality;
  quantity?: number;
}

export interface TreasureClassDefinition {
  id: string;
  label: string;
  numPicks: number;
  noDropWeight?: number;
  entries: TreasureClassEntry[];
  dynamicPools?: Record<string, string[]>;
  maxDepth?: number;
}

export interface LootDrop {
  itemId: string;
  name: string;
  quality: LootQuality;
  tier: number;
  quantity: number;
  tags: string[];
  glbAssetId?: string;
  sourceTreasureClass: string;
  rollHash: string;
}

export interface LootRollStep {
  depth: number;
  pickIndex: number;
  treasureClassId: string;
  selectedEntryId: string;
  selectedType: TreasureClassEntry["type"];
  rollValue: number;
  totalWeight: number;
  rollHash: string;
  note?: string;
}

export interface LootRollResult {
  context: LootRollContext;
  rootTreasureClassId: string;
  drops: LootDrop[];
  steps: LootRollStep[];
  finalHash: string;
}

export interface LootRegistrySnapshot {
  items: LootItemDefinition[];
  treasureClasses: TreasureClassDefinition[];
}
