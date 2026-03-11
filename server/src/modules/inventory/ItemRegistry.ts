export interface ItemDefinition {
  id: string;
  name: string;
  type: "weapon" | "armor" | "consumable" | "misc";
  slot?: "weapon" | "armor";
  damage?: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  description: string;
}

export const ITEM_REGISTRY: Record<string, ItemDefinition> = {
  "starter_sword": {
    id: "starter_sword",
    name: "Starter Sword",
    type: "weapon",
    slot: "weapon",
    damage: 25,
    rarity: "common",
    description: "A simple iron sword given to new recruits."
  },
  "wooden_shield": {
    id: "wooden_shield",
    name: "Wooden Shield",
    type: "armor",
    slot: "armor",
    damage: 0,
    rarity: "common",
    description: "A basic shield made of sturdy oak."
  }
};

export class ItemRegistry {
  static getItem(id: string): ItemDefinition | undefined {
    return ITEM_REGISTRY[id];
  }

  static createInstance(id: string) {
    const def = this.getItem(id);
    if (!def) return null;
    // Return a copy to avoid mutation of the registry
    return { ...def };
  }

  static hydrate(item: any) {
    if (!item || !item.id) return item;
    const def = this.getItem(item.id);
    if (!def) return item;
    // Merge registry definition into the item object
    return { ...item, ...def };
  }
}
