/**
 * Ouroboros Itemization — Shared Type Definitions
 * Deterministic modular weapon/armor system.
 * 
 * Axiom der Erhaltung: Every item is a deterministic signature.
 * No duplication possible — the signature IS the identity.
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mystic";

export type ItemCategory = "weapon" | "armor" | "accessory" | "consumable" | "material" | "quest";

/** 
 * Equip slot mapping — keys must align with server InventoryDirector guards.
 * HEAD, CHEST, MAIN_HAND, OFF_HAND, RING_1, RING_2, BOOTS, GLOVES
 */
export type EquipSlot = 
  | "HEAD" 
  | "CHEST" 
  | "MAIN_HAND" 
  | "OFF_HAND" 
  | "RING_1" 
  | "RING_2" 
  | "BOOTS" 
  | "GLOVES";

export const EQUIP_SLOTS: EquipSlot[] = [
  "HEAD", "CHEST", "MAIN_HAND", "OFF_HAND", 
  "RING_1", "RING_2", "BOOTS", "GLOVES"
];

/** Determines which equip slot accepts this item type */
export function slotForCategory(cat: ItemCategory): EquipSlot | null {
  switch (cat) {
    case "weapon": return "MAIN_HAND";
    case "armor": return "CHEST";
    case "accessory": return null; // rings, amulets, etc.
    default: return null;
  }
}

/** 
 * Modular weapon/armor signature format:
 * base:blade_3|hilt_12|material_iron|runefire|prefix_swift|suffix_bane
 * 
 * Components:
 * - base: Core component (blade, chestplate, etc.)
 * - prefix: Optional name modifier (Swift, Brutal, etc.)
 * - suffix: Optional name modifier (of Bane, of the Fallen, etc.)
 * - material: Primary material (iron, steel, mithril, etc.)
 * - rune/affix: Optional enchantments
 */
export type ItemSignature = string; // e.g. "base:blade_3|hilt_12|material_iron|prefix_swift|suffix_bane"

export interface ModularComponent {
  id: string;
  type: "base" | "prefix" | "suffix" | "material" | "rune" | "gem";
  name: string;
  statMods?: Record<string, number>;
  visualId?: string;
}

export interface ParsedSignature {
  base: ModularComponent;
  components: ModularComponent[];
  material: string;
  prefix?: ModularComponent;
  suffix?: ModularComponent;
  rune?: ModularComponent;
  gem?: ModularComponent;
}

/** Base stats derived deterministically from signature */
export interface ItemStats {
  damage?: number;
  armor?: number;
  attackSpeed?: number;
  critChance?: number;
  critMultiplier?: number;
  health?: number;
  mana?: number;
  strength?: number;
  agility?: number;
  intelligence?: number;
  fireRes?: number;
  iceRes?: number;
  lightningRes?: number;
}

/** Full item representation — client derives visuals/stats from signature */
export interface ModularItem {
  signature: ItemSignature;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  ilvl: number; // item level — affects stat ranges
  stats: ItemStats;
  visualId: string; // sprite/atlas frame id
  graphicIds: {
    base: string;
    material: string;
    rune?: string;
  };
  slot?: EquipSlot;
  requiredLevel?: number;
  requiredClass?: string;
  boundOnAcquire?: boolean;
  tradeable?: boolean;
  droppable?: boolean;
}

/** 
 * Inventory grid — fixed capacity with null = empty slot.
 * Server is authoritative. Client renders from this snapshot.
 */
export interface InventoryState {
  slots: (ModularItem | null)[];
  maxSlots: number;
  gold: number;
  weight: number;
  maxWeight: number;
}

/** Equipment state — one item per slot, null = empty */
export type EquipmentState = Partial<Record<EquipSlot, ModularItem>>;

/** Player inventory state snapshot broadcast via WebSocket */
export interface PlayerInventorySnapshot {
  inventory: InventoryState;
  equipment: EquipmentState;
  tick: number;
}

// ─── Intents (Client → Server) ─────────────────────────────────

export type InventoryIntent =
  | { intent: "equip"; inventorySlotIndex: number; targetEquipSlot: EquipSlot }
  | { intent: "unequip"; equipSlot: EquipSlot; targetInventorySlotIndex: number }
  | { intent: "move"; fromSlot: number; toSlot: number }
  | { intent: "drop"; inventorySlotIndex: number }
  | { intent: "use"; inventorySlotIndex: number };

// ─── Server Responses ──────────────────────────────────────────

export type InventoryEvent =
  | { event: "inventory_snapshot"; snapshot: PlayerInventorySnapshot }
  | { event: "inventory_error"; code: string; message: string }
  | { event: "item_equipped"; slot: EquipSlot; item: ModularItem | null }
  | { event: "item_unequipped"; slot: EquipSlot; item: ModularItem | null };

// ─── Mod Pool Constants ─────────────────────────────────────────
//
// 64 parts total for modular generation:
// 8 blade variants + 8 hilt variants + 8 material tiers 
// + 8 prefix names + 8 suffix names + 8 rune types + 8 gem types

export const MODULAR_COMPONENT_POOLS = {
  blades: ["blade_1", "blade_2", "blade_3", "blade_4", "blade_5", "blade_6", "blade_7", "blade_8"],
  hilts: ["hilt_1", "hilt_2", "hilt_3", "hilt_4", "hilt_5", "hilt_6", "hilt_7", "hilt_8"],
  materials: ["material_iron", "material_steel", "material_silver", "material_mithril", 
              "material_adamantine", "material_orichalcum", "material_dragon_scale", "material_star_metal"],
  prefixes: ["prefix_vorpal", "prefix_swift", "prefix_brutal", "prefix_cursed", 
             "prefix_holy", "prefix_arcane", "prefix_shadow", "prefix_frost"],
  suffixes: ["suffix_bane", "suffix_slaying", "suffix_wrath", "suffix_doom", 
             "suffix_fury", "suffix_destr", "suffix_judgment", "suffix_ruin"],
  runes: ["rune_fire", "rune_ice", "rune_lightning", "rune_poison", 
          "rune_void", "rune_holy", "rune_shadow", "rune_nature"],
  gems: ["gem_ruby", "gem_sapphire", "gem_emerald", "gem_diamond", 
         "gem_amethyst", "gem_topaz", "gem_onix", "gem_opal"],
} as const;

// ─── Deterministic Item Seed Generation ────────────────────────
//
// Uses world tick + player UID + slot index for reproducible signatures.
// This enables the client to derive visuals/stats WITHOUT downloading
// the full item database — critical for 30k+ weapon permutations.

export function generateItemSeed(playerUid: string, slotIndex: number, worldTick: number): string {
  const combined = `${playerUid}:${slotIndex}:${worldTick}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}