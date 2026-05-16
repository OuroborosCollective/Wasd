import { ARELootEngine } from "./ARELootEngine";
import type { LootRegistrySnapshot, LootRollContext, LootRollResult } from "./ARELootTypes";

export const defaultAreloriaLootMatrix: LootRegistrySnapshot = {
  items: [
    { id: "matrix_shard", name: "Matrix Shard", itemType: "currency", baseQuality: "common", tier: 1, tags: ["currency", "crafting"] },
    { id: "rusted_blade", name: "Rusted Blade", itemType: "weapon", baseQuality: "common", tier: 1, tags: ["starter", "melee"] },
    { id: "field_herb", name: "Field Herb", itemType: "consumable", baseQuality: "common", tier: 1, tags: ["healing", "forest"] },
    { id: "iron_scale", name: "Iron Scale", itemType: "material", baseQuality: "magic", tier: 2, tags: ["armor", "crafting"] },
    { id: "oracle_rune", name: "Oracle Rune", itemType: "rune", baseQuality: "rare", tier: 3, tags: ["oracle", "determinism"] },
    { id: "warden_relic", name: "Warden Relic", itemType: "relic", baseQuality: "epic", tier: 4, tags: ["guardian", "chunk"] },
    { id: "ouroboros_core", name: "Ouroboros Core", itemType: "relic", baseQuality: "legendary", tier: 5, tags: ["worldhash", "selfheal"] },
  ],
  treasureClasses: [
    {
      id: "tc_world_common",
      label: "World Common Matrix",
      numPicks: 2,
      noDropWeight: 45,
      entries: [
        { id: "matrix_shard", type: "item", weight: 80, quantity: 1 },
        { id: "field_herb", type: "item", weight: 40, quantity: 1 },
        { id: "rusted_blade", type: "item", weight: 20, quantity: 1 },
        { id: "tc_materials_tier2", type: "treasureClass", weight: 15 },
      ],
    },
    {
      id: "tc_materials_tier2",
      label: "Tier 2 Materials",
      numPicks: 1,
      noDropWeight: 15,
      entries: [
        { id: "iron_scale", type: "item", weight: 60, qualityHint: "magic" },
        { id: "matrix_shard", type: "item", weight: 40, quantity: 2 },
      ],
    },
    {
      id: "tc_oracle_cache",
      label: "Oracle Cache",
      numPicks: -2,
      entries: [
        { id: "oracle_rune", type: "item", weight: 1, qualityHint: "rare" },
        { id: "tc_dynamic_relic", type: "treasureClass", weight: 1 },
      ],
    },
    {
      id: "tc_dynamic_relic",
      label: "Dynamic Relic Matrix",
      numPicks: 1,
      entries: [
        { id: "relic_pool", type: "dynamic", weight: 100, qualityHint: "epic" },
      ],
      dynamicPools: {
        relic_pool: ["warden_relic", "ouroboros_core"],
      },
    },
  ],
};

export function createDefaultAreloriaLootEngine(): ARELootEngine {
  return new ARELootEngine(defaultAreloriaLootMatrix, { maxDepth: 8 });
}

export function rollDefaultAreloriaLoot(rootTreasureClassId: string, context: LootRollContext): LootRollResult {
  return createDefaultAreloriaLootEngine().roll(rootTreasureClassId, context);
}
