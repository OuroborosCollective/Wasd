export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type ItemKind =
  | "weapon"
  | "armor"
  | "consumable"
  | "material"
  | "quest"
  | "currency";

export interface ItemDefinition {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: ItemRarity;
  icon?: string;
  maxStack: number;
  description?: string;
}

export interface ItemStack {
  itemId: string;
  quantity: number;
}

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  wood_sword: {
    id: "wood_sword",
    name: "Wood Sword",
    kind: "weapon",
    rarity: "common",
    maxStack: 1,
    description: "A simple starter blade."
  },
  training_armor: {
    id: "training_armor",
    name: "Training Armor",
    kind: "armor",
    rarity: "common",
    maxStack: 1,
    description: "Light protection for new adventurers."
  },
  slime_core: {
    id: "slime_core",
    name: "Slime Core",
    kind: "material",
    rarity: "uncommon",
    maxStack: 99,
    description: "A pulsing residue from a weak creature."
  },
  health_potion_small: {
    id: "health_potion_small",
    name: "Small Health Potion",
    kind: "consumable",
    rarity: "common",
    maxStack: 20,
    description: "Restores a small amount of health."
  }
};

export function getItemDefinition(itemId: string): ItemDefinition | null {
  return ITEM_DEFINITIONS[itemId] ?? null;
}