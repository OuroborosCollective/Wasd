/**
 * Ouroboros ItemIconMapper — Deterministic Asset Resolution
 * 
 * Parses ItemSignature strings and derives CSS class names or icon paths
 * for rendering item icons in the inventory grid.
 * 
 * Design: WoW-style icon squares with rarity borders.
 * No external dependencies - pure deterministic derivation.
 */

import { type Rarity, type ModularItem, parseItemSignature } from "@wasd/shared";

/**
 * Rarity-to-border-color mapping (WoW palette)
 */
export const RARITY_BORDER_COLORS: Record<Rarity, string> = {
  common: "#9d9d9d",
  uncommon: "#1eff00",
  rare: "#0070dd",
  epic: "#a335ee",
  legendary: "#ff8000",
  mystic: "#00ccff",
};

/**
 * Rarity glow colors for legendary+ items
 */
export const RARITY_GLOW_COLORS: Record<Rarity, string> = {
  common: "transparent",
  uncommon: "rgba(30, 255, 0, 0.15)",
  rare: "rgba(0, 112, 221, 0.2)",
  epic: "rgba(163, 53, 238, 0.25)",
  legendary: "rgba(255, 128, 0, 0.3)",
  mystic: "rgba(0, 204, 255, 0.3)",
};

/**
 * Icon categories for different item types
 */
type IconCategory = "weapon" | "armor" | "accessory" | "consumable" | "material" | "quest";

/**
 * Maps base component IDs to 2-character icon abbreviations
 * These map to CSS classes that render the icon letter-pair
 */
const WEAPON_ICON_MAP: Record<string, string> = {
  blade_1: "DG", // Dagger
  blade_2: "SW", // Shortsword
  blade_3: "LS", // Longsword
  blade_4: "BS", // Broadsword
  blade_5: "GS", // Greatsword
  blade_6: "CL", // Claymore
  blade_7: "FL", // Flamberge
  blade_8: "ZW", // Zweihander
};

const ARMOR_ICON_MAP: Record<string, string> = {
  chest_1: "LV", // Leather Vest
  chest_2: "CM", // Chain Mail
  chest_3: "SM", // Scale Mail
  chest_4: "PA", // Plate Armor
  chest_5: "RP", // Reinforced Plate
  chest_6: "DS", // Dragon Scale
  chest_7: "MP", // Mythril Plate
  chest_8: "AG", // Adamantine Guard
};

const ACCESSORY_ICON_MAP: Record<string, string> = {
  ring: "RG",
  amulet: "AM",
  talisman: "TM",
};

const CONSUMABLE_ICON_MAP: Record<string, string> = {
  potion: "PT",
  scroll: "SC",
  food: "FD",
  drink: "DK",
};

const MATERIAL_ICON_MAP: Record<string, string> = {
  ore: "OR",
  ingot: "IG",
  cloth: "CL",
  leather: "LT",
  wood: "WD",
  gem: "GM",
};

const GATHERING_TOOL_ICON_MAP: Record<string, string> = {
  wooden_axe: "🪓",
  copper_pickaxe: "⛏️",
  simple_fishing_rod: "🎣",
  copper_axe: "🪓",
  reinforced_pickaxe: "⛏️",
  reinforced_fishing_rod: "🎣",
};

const QUEST_ICON_MAP: Record<string, string> = {
  quest_item: "QS",
  key: "KY",
  scroll: "SC",
};

/**
 * Material tier to suffix for visual distinction
 * Higher tier = more ornate icon background
 */
const MATERIAL_TIER_SUFFIX: Record<number, string> = {
  1: "",
  2: "_st",
  3: "_sv",
  4: "_mi",
  5: "_ad",
  6: "_or",
  7: "_dr",
  8: "_st",
};

/**
 * Rune element to icon suffix
 */
const RUNE_ELEMENT_SUFFIX: Record<string, string> = {
  rune_fire: "_fr",
  rune_ice: "_ic",
  rune_lightning: "_li",
  rune_poison: "_ps",
  rune_void: "_vd",
  rune_holy: "_hy",
  rune_shadow: "_sh",
  rune_nature: "_na",
};

/**
 * Internal icon resolution result
 */
export interface IconResolution {
  iconClass: string;
  rarityClass: string;
  borderColor: string;
  glowColor: string;
  category: IconCategory;
  abbreviation: string;
}

/**
 * Parse an item signature and resolve to icon parameters.
 * Pure deterministic function - no side effects.
 */
export function resolveItemIcon(item: ModularItem): IconResolution {
  const parsed = parseItemSignature(item.signature);
  const rarity = item.rarity;
  
  const category: IconCategory = item.category === "weapon" ? "weapon" 
    : item.category === "armor" ? "armor"
    : item.category === "accessory" ? "accessory"
    : item.category === "consumable" ? "consumable"
    : item.category === "material" ? "material"
    : "quest";

  let abbreviation = "IT";
  if (category === "weapon") {
    abbreviation = WEAPON_ICON_MAP[parsed.base.id] ?? "WP";
  } else if (category === "armor") {
    abbreviation = ARMOR_ICON_MAP[parsed.base.id] ?? "AR";
  } else if (category === "accessory") {
    abbreviation = ACCESSORY_ICON_MAP[parsed.base.id] ?? "AC";
  } else if (category === "consumable") {
    abbreviation = CONSUMABLE_ICON_MAP[parsed.base.id] ?? "CN";
  } else if (category === "material") {
    abbreviation = MATERIAL_ICON_MAP[parsed.base.id] ?? "MT";
  } else {
    abbreviation = QUEST_ICON_MAP[parsed.base.id] ?? "QT";
  }

  const basePrefix = category.slice(0, 2).toLowerCase();
  const materialTier = getMaterialTier(parsed.material);
  const materialSuffix = MATERIAL_TIER_SUFFIX[materialTier] ?? "";
  const runeSuffix = parsed.rune ? (RUNE_ELEMENT_SUFFIX[parsed.rune.id] ?? "") : "";
  
  const iconClass = `icon-${basePrefix}-${abbreviation.toLowerCase()}${materialSuffix}${runeSuffix}`;
  const rarityClass = `rarity-${rarity}`;

  return {
    iconClass,
    rarityClass,
    borderColor: RARITY_BORDER_COLORS[rarity],
    glowColor: RARITY_GLOW_COLORS[rarity],
    category,
    abbreviation,
  };
}

function getMaterialTier(materialId: string): number {
  const tierMatch = materialId.match(/material_(\d+)/);
  if (tierMatch) return parseInt(tierMatch[1], 10);
  
  const namedTiers: Record<string, number> = {
    material_iron: 1,
    material_steel: 2,
    material_silver: 3,
    material_mithril: 4,
    material_adamantine: 5,
    material_orichalcum: 6,
    material_dragon_scale: 7,
    material_star_metal: 8,
  };
  
  return namedTiers[materialId] ?? 1;
}

export function getEmptySlotClass(): string {
  return "slot-empty";
}

export function hasGlowEffect(rarity: Rarity): boolean {
  return rarity === "legendary" || rarity === "mystic";
}

export function getTooltipTitleClass(rarity: Rarity): string {
  return `tooltip-title rarity-text-${rarity}`;
}

export function hasRuneEnchantment(item: ModularItem): boolean {
  return parseItemSignature(item.signature).rune !== undefined;
}

export function hasPrefix(item: ModularItem): boolean {
  return parseItemSignature(item.signature).prefix !== undefined;
}

export function hasSuffix(item: ModularItem): boolean {
  return parseItemSignature(item.signature).suffix !== undefined;
}

export function getMaterialName(materialId: string): string {
  const names: Record<string, string> = {
    material_iron: "Iron",
    material_steel: "Steel",
    material_silver: "Silver",
    material_mithril: "Mithril",
    material_adamantine: "Adamantine",
    material_orichalcum: "Orichalcum",
    material_dragon_scale: "Dragon Scale",
    material_star_metal: "Star Metal",
  };
  return names[materialId] ?? materialId;
}

export function getRuneElementName(runeId: string): string {
  const names: Record<string, string> = {
    rune_fire: "Fire",
    rune_ice: "Ice",
    rune_lightning: "Lightning",
    rune_poison: "Poison",
    rune_void: "Void",
    rune_holy: "Holy",
    rune_shadow: "Shadow",
    rune_nature: "Nature",
  };
  return names[runeId] ?? runeId;
}

/**
 * Get PNG icon path for gathering tool items.
 * Returns null if itemId is not a gathering tool.
 * Icons are 64x64 PNG with transparent background.
 */
export function getGatheringToolIcon(itemId: string): string | null {
  const iconPaths: Record<string, string> = {
    wooden_axe: "/2d-assets/symbols/gathering/wooden_axe.png",
    copper_pickaxe: "/2d-assets/symbols/gathering/copper_pickaxe.png",
    simple_fishing_rod: "/2d-assets/symbols/gathering/simple_fishing_rod.png",
    // Tier 2 upgrade tools
    copper_axe: "/2d-assets/symbols/gathering/copper_axe.png",
    reinforced_pickaxe: "/2d-assets/symbols/gathering/reinforced_pickaxe.png",
    reinforced_fishing_rod: "/2d-assets/symbols/gathering/reinforced_fishing_rod.png",
  };
  return iconPaths[itemId] ?? null;
}

/**
 * Check if item is a gathering tool.
 */
export function isGatheringTool(itemId: string): boolean {
  return itemId in GATHERING_TOOL_ICON_MAP;
}