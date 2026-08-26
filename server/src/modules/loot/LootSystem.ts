import { createARESeed, type ARERng, SeededARERng } from "../../core/determinism/AREDeterminism.js";
import { ItemRegistry, ItemDefinition } from "../inventory/ItemRegistry.js";
import { applyWeaponVisual } from "./WeaponVisualPool.js";
import fs from "fs";
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

const INTERNAL_LEGACY_KEY: unique symbol = Symbol("areloria.legacy.loot.key");
type InternalLegacyKey = typeof INTERNAL_LEGACY_KEY;

export interface LootSystemOptions {
  readonly usage?: "migration" | "test";
  readonly internalKey?: InternalLegacyKey;
}

function assertLegacyAllowed(options: LootSystemOptions): void {
  if (options.internalKey === INTERNAL_LEGACY_KEY) return;
  throw new Error("legacy_loot_system_disabled: use LootDirector + ProceduralLootMachine");
}

export function createLegacyLootSystemForMigration(usage: "migration" | "test"): LootSystem {
  return new LootSystem({ internalKey: INTERNAL_LEGACY_KEY, usage });
}

export class LootSystem {
  private lootTables: Map<string, LootTable> = new Map();
  private readonly options: LootSystemOptions;

  constructor(options: LootSystemOptions = {}) {
    this.options = Object.freeze({ ...options });
    assertLegacyAllowed(this.options);
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
      "legacy-loot-table-inline",
      this.options.usage ?? "unscoped",
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
              seed: item.seed ?? createARESeed(["legacy-loot-visual", entry.itemId, dropIndex, item.rarity ?? "common"]),
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

  rollFromTable(tableId: string, rng: ARERng = new SeededARERng(createARESeed(["legacy-loot-table", this.options.usage ?? "unscoped", tableId]))): { items: ItemDefinition[]; gold: number } {
    const table = this.lootTables.get(tableId);
    if (!table) return { items: [], gold: 0 };

    const result = this.rollLoot(table.entries, rng.fork(`${tableId}:entries`));

    if (table.goldMin !== undefined && table.goldMax !== undefined) {
      result.gold = rng.nextRange(table.goldMin, table.goldMax);
    }

    return result;
  }
}
