import { createARESeed, type ARERng, SeededARERng } from "../../core/determinism/AREDeterminism.js";
import { ItemRegistry, ItemDefinition } from "../inventory/ItemRegistry.js";
import { applyWeaponVisual } from "./WeaponVisualPool.js";
import fs from "fs";
import { resolveContentFile } from "../content/contentDataRoot.js";

/**
 * @deprecated LootSystem.ts - PARALLEL RUNTIME TRUTH (DO NOT USE IN PRODUCTION)
 * 
 * This module exists as a PARALLEL DROP TRUTH and is NOT part of the canonical loot path.
 * 
 * CANONICAL PATH (USE THIS):
 * - ProceduralLootMachine (server/src/loot/ProceduralLootMachine.ts)
 * - LootDirector (server/src/loot/LootDirector.ts)
 * - loot_delta events from server
 * 
 * This module is kept for:
 * - Dev/test compatibility
 * - Migration shim
 * - Legacy code support
 * 
 * DO NOT use this for runtime loot generation.
 * DO NOT create new code that depends on this module for loot.
 * 
 * @see LootDirector for canonical loot handling
 * @see ProceduralLootMachine for the Infinite ARE Loot Machine
 */

export interface LootTableEntry {
  itemId: string;
  chance: number;
  minCount?: number;
  maxCount?: number;
}

export interface LootTable {
  id: string;
  entries: LootTableEntry[];
  goldMin?: number;
  goldMax?: number;
}

export class LootSystem {
  private lootTables: Map<string, LootTable> = new Map();

  constructor() {
    this.loadLootTables();
  }

  private loadLootTables() {
    try {
      const lootPath = resolveContentFile("items/loot-tables.json");
      if (fs.existsSync(lootPath)) {
        const data = JSON.parse(fs.readFileSync(lootPath, "utf-8"));
        if (Array.isArray(data)) {
          data.forEach((lt: LootTable) => this.lootTables.set(lt.id, lt));
        } else if (typeof data === "object") {
          for (const [key, val] of Object.entries(data)) {
            if (typeof val === "object" && val !== null) {
              this.lootTables.set(key, { id: key, ...(val as any) });
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to load loot tables:", e);
    }
  }

  rollLoot(
    dropTable: LootTableEntry[],
    rng: ARERng = new SeededARERng(createARESeed([
      "loot-table-inline",
      dropTable.map((entry) => `${entry.itemId}:${entry.chance}:${entry.minCount ?? 1}:${entry.maxCount ?? entry.minCount ?? 1}`).join(","),
    ]))
  ): { items: ItemDefinition[]; gold: number } {
    const items: ItemDefinition[] = [];
    let gold = 0;
    let dropIndex = 0;

    for (const entry of dropTable) {
      if (rng.nextFloat() < entry.chance) {
        const count = entry.minCount
          ? rng.nextRange(entry.minCount, entry.maxCount || entry.minCount)
          : 1;
        for (let i = 0; i < count; i++) {
          const item = ItemRegistry.createInstance(entry.itemId);
          if (item) {
            const seededItem = {
              ...item,
              seed: item.seed ?? createARESeed(["loot-visual", entry.itemId, dropIndex, item.rarity ?? "common"]),
            };
            items.push((seededItem.type === "weapon"
              ? applyWeaponVisual(seededItem, { rng: rng.fork(`visual:${entry.itemId}:${dropIndex}`), dropIndex })
              : seededItem) as ItemDefinition);
            dropIndex += 1;
          }
        }
      }
    }

    return { items, gold };
  }

  rollFromTable(tableId: string, rng: ARERng = new SeededARERng(createARESeed(["loot-table", tableId]))): { items: ItemDefinition[]; gold: number } {
    const table = this.lootTables.get(tableId);
    if (!table) return { items: [], gold: 0 };

    const result = this.rollLoot(table.entries, rng.fork(`${tableId}:entries`));

    // Roll gold
    if (table.goldMin !== undefined && table.goldMax !== undefined) {
      result.gold = rng.nextRange(table.goldMin, table.goldMax);
    }

    return result;
  }
}
