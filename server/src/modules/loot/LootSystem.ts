import { ItemRegistry, ItemDefinition } from "../inventory/ItemRegistry.js";
import fs from "fs";
import path from "path";
import { resolveContentFile } from "../content/contentDataRoot.js";

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

  rollLoot(dropTable: LootTableEntry[]): { items: ItemDefinition[]; gold: number } {
    const items: ItemDefinition[] = [];
    let gold = 0;

    for (const entry of dropTable) {
      if (Math.random() < entry.chance) {
        const count = entry.minCount
          ? Math.floor(Math.random() * ((entry.maxCount || entry.minCount) - entry.minCount + 1)) + entry.minCount
          : 1;
        for (let i = 0; i < count; i++) {
          const item = ItemRegistry.createInstance(entry.itemId);
          if (item) items.push(item as ItemDefinition);
        }
      }
    }

    return { items, gold };
  }

  rollFromTable(tableId: string): { items: ItemDefinition[]; gold: number } {
    const table = this.lootTables.get(tableId);
    if (!table) return { items: [], gold: 0 };

    const result = this.rollLoot(table.entries);

    // Roll gold
    if (table.goldMin !== undefined && table.goldMax !== undefined) {
      result.gold = Math.floor(Math.random() * (table.goldMax - table.goldMin + 1)) + table.goldMin;
    }

    return result;
  }
}
