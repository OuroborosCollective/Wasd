import fs from "fs";
import path from "path";

export interface ItemDefinition {
  id: string;
  name: string;
  type: "weapon" | "armor" | "consumable" | "misc";
  slot?: "weapon" | "armor";
  damage?: number;
  /** If set on a weapon, `attack` uses this max distance instead of default melee range */
  attackRange?: number;
  /** Mana consumed per attack when set (>0); ranged weapons without this use server default */
  manaCost?: number;
  /** Consumable: restore health (capped at maxHealth) */
  healAmount?: number;
  /** Consumable: restore mana (capped at maxMana) */
  restoreMana?: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  description: string;
}

export class ItemRegistry {
  private static ITEM_REGISTRY: Record<string, ItemDefinition> = {};
  private static initialized = false;

  private static resolveItemsPath(): string | null {
    const cwd = process.cwd();
    const a = path.resolve(cwd, "game-data/items/items.json");
    const b = path.resolve(cwd, "../game-data/items/items.json");
    if (fs.existsSync(a)) return a;
    if (fs.existsSync(b)) return b;
    return null;
  }

  static init() {
    if (this.initialized) return;
    try {
      const itemsPath = this.resolveItemsPath();
      if (itemsPath) {
        const itemData = JSON.parse(fs.readFileSync(itemsPath, "utf-8"));
        itemData.forEach((item: ItemDefinition) => {
          this.ITEM_REGISTRY[item.id] = item;
        });
      }
    } catch (error) {
      console.error("Error loading Item data:", error);
    }
    this.initialized = true;
  }

  static getItem(id: string): ItemDefinition | undefined {
    if (!this.initialized) this.init();
    return this.ITEM_REGISTRY[id];
  }

  static createInstance(id: string) {
    if (!this.initialized) this.init();
    const def = this.getItem(id);
    if (!def) return null;
    // Return a copy to avoid mutation of the registry
    return { ...def };
  }

  static hydrate(item: any) {
    if (!this.initialized) this.init();
    if (!item || !item.id) return item;
    const def = this.getItem(item.id);
    if (!def) return item;
    // Merge registry definition into the item object
    return { ...item, ...def };
  }
}
