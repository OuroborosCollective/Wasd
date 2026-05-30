/**
 * Ouroboros Item Signature Parser — Deterministic Derivation
 * 
 * Given an ItemSignature string, this pure function derives:
 * - Full item name
 * - Base stats (damage, armor, etc.)
 * - Visual asset IDs (sprite atlas, frame indices)
 * 
 * NO network calls. NO external state. Pure computation.
 * 
 * Axiom der Erhaltung: The signature encodes ALL identity.
 * Client can render items without server metadata.
 */

import {
  ItemSignature,
  ParsedSignature,
  ModularComponent,
  ItemStats,
  ModularItem,
  Rarity,
  ItemCategory,
  EquipSlot,
  MODULAR_COMPONENT_POOLS,
} from "./types.js";

const PREFIX_NAMES: Record<string, string> = {
  prefix_vorpal: "Vorpal",
  prefix_swift: "Swift",
  prefix_brutal: "Brutal",
  prefix_cursed: "Cursed",
  prefix_holy: "Holy",
  prefix_arcane: "Arcane",
  prefix_shadow: "Shadow",
  prefix_frost: "Frost",
};

const SUFFIX_NAMES: Record<string, string> = {
  suffix_bane: "of Bane",
  suffix_slaying: "of Slaying",
  suffix_wrath: "of Wrath",
  suffix_doom: "of Doom",
  suffix_fury: "of Fury",
  suffix_destr: "of Destruction",
  suffix_judgment: "of Judgment",
  suffix_ruin: "of Ruin",
};

const MATERIAL_TIERS: Record<string, number> = {
  material_iron: 1,
  material_steel: 2,
  material_silver: 3,
  material_mithril: 4,
  material_adamantine: 5,
  material_orichalcum: 6,
  material_dragon_scale: 7,
  material_star_metal: 8,
};

const MATERIAL_NAMES: Record<string, string> = {
  material_iron: "Iron",
  material_steel: "Steel",
  material_silver: "Silver",
  material_mithril: "Mithril",
  material_adamantine: "Adamantine",
  material_orichalcum: "Orichalcum",
  material_dragon_scale: "Dragon Scale",
  material_star_metal: "Star Metal",
};

const RUNE_ELEMENTS: Record<string, string> = {
  rune_fire: "Fire",
  rune_ice: "Ice",
  rune_lightning: "Lightning",
  rune_poison: "Poison",
  rune_void: "Void",
  rune_holy: "Holy",
  rune_shadow: "Shadow",
  rune_nature: "Nature",
};

const BLADE_NAMES: Record<string, string> = {
  blade_1: "Dagger",
  blade_2: "Shortsword",
  blade_3: "Longsword",
  blade_4: "Broadsword",
  blade_5: "Greatsword",
  blade_6: "Claymore",
  blade_7: "Flamberge",
  blade_8: "Zweihander",
};

const CHEST_NAMES: Record<string, string> = {
  chest_1: "Leather Vest",
  chest_2: "Chain Mail",
  chest_3: "Scale Mail",
  chest_4: "Plate Armor",
  chest_5: "Reinforced Plate",
  chest_6: "Dragon Scale",
  chest_7: "Mythril Plate",
  chest_8: "Adamantine Guard",
};

// ─── Rarity tier detection ─────────────────────────────────────

function detectRarityFromComponents(components: ModularComponent[]): Rarity {
  let tierScore = 0;
  for (const comp of components) {
    if (comp.type === "rune" || comp.type === "gem") tierScore += 2;
    if (comp.id.includes("mithril") || comp.id.includes("adamantine")) tierScore += 1;
    if (comp.id.includes("dragon") || comp.id.includes("star")) tierScore += 2;
  }
  if (tierScore >= 6) return "legendary";
  if (tierScore >= 4) return "epic";
  if (tierScore >= 2) return "rare";
  if (tierScore >= 1) return "uncommon";
  return "common";
}

// ─── Stat derivation ───────────────────────────────────────────

function deriveWeaponStats(sig: ParsedSignature, ilvl: number): ItemStats {
  const baseDmg = 10 + (ilvl * 2);
  const materialBonus = MATERIAL_TIERS[sig.material] ?? 1;
  const totalDmg = baseDmg + (materialBonus * 3);
  
  // Prefix bonuses
  let critChance = 0;
  let attackSpeed = 1.0;
  if (sig.prefix?.id === "prefix_swift") attackSpeed = 1.3;
  if (sig.prefix?.id === "prefix_vorpal") critChance = 10;
  if (sig.prefix?.id === "prefix_brutal") critChance = 5;
  
  // Suffix bonuses
  let critMultiplier = 1.5;
  if (sig.suffix?.id === "suffix_bane") critMultiplier = 1.75;
  if (sig.suffix?.id === "suffix_wrath") critMultiplier = 2.0;
  
  // Rune elemental damage
  const elemental: Record<string, number> = {};
  if (sig.rune?.id === "rune_fire") elemental.fireDmg = Math.floor(ilvl * 0.5);
  if (sig.rune?.id === "rune_ice") elemental.iceDmg = Math.floor(ilvl * 0.5);
  if (sig.rune?.id === "rune_lightning") elemental.lightningDmg = Math.floor(ilvl * 0.5);
  
  return {
    damage: totalDmg,
    attackSpeed,
    critChance,
    critMultiplier,
    ...elemental,
    strength: Math.floor(ilvl * 0.3),
  };
}

function deriveArmorStats(sig: ParsedSignature, ilvl: number): ItemStats {
  const baseArmor = 5 + (ilvl * 1.5);
  const materialBonus = MATERIAL_TIERS[sig.material] ?? 1;
  const totalArmor = Math.floor(baseArmor + (materialBonus * 2));
  
  const elementalRes: ItemStats = {};
  if (sig.rune?.id === "rune_fire") elementalRes.fireRes = Math.floor(ilvl * 0.4);
  if (sig.rune?.id === "rune_ice") elementalRes.iceRes = Math.floor(ilvl * 0.4);
  if (sig.rune?.id === "rune_lightning") elementalRes.lightningRes = Math.floor(ilvl * 0.4);
  
  return {
    armor: totalArmor,
    health: Math.floor(ilvl * 2),
    ...elementalRes,
    strength: Math.floor(ilvl * 0.4),
    agility: Math.floor(ilvl * 0.2),
  };
}

// ─── Visual ID derivation ──────────────────────────────────────
//
// Deterministic mapping from component IDs to sprite atlas indices.
// The 2D client uses the same index-to-sprite mapping for rendering.

function deriveVisualIds(sig: ParsedSignature): { base: string; material: string; rune?: string } {
  const baseComp = sig.base.id;
  const matComp = sig.material;
  
  // Base weapon/armor visual from component id
  const baseIdx = Object.keys(BLADE_NAMES).indexOf(baseComp);
  const baseVisual = baseIdx >= 0 
    ? `weapon_base_${baseIdx}` 
    : `armor_base_${Object.keys(CHEST_NAMES).indexOf(baseComp)}`;
  
  const matVisual = `mat_${MATERIAL_TIERS[matComp] ?? 1}`;
  const runeVisual = sig.rune ? `rune_${RUNE_ELEMENTS[sig.rune.id]?.toLowerCase() ?? "none"}` : undefined;
  
  return { base: baseVisual, material: matVisual, rune: runeVisual };
}

// ─── Main Parser ───────────────────────────────────────────────

/**
 * Parse an ItemSignature string into structured components.
 * This is the core deterministic derivation function.
 */
export function parseItemSignature(sig: ItemSignature): ParsedSignature {
  const parts = sig.split("|");
  const componentMap = new Map<string, ModularComponent>();
  
  for (const part of parts) {
    const [key, value] = part.split(":");
    if (!key || !value) continue;
    
    const compType = key as ModularComponent["type"];
    const compId = value;
    
    if (compType === "base") {
      componentMap.set("base", { id: compId, type: "base", name: BLADE_NAMES[compId] ?? CHEST_NAMES[compId] ?? compId });
    } else if (compType === "material") {
      componentMap.set("material", { 
        id: compId, 
        type: "material", 
        name: MATERIAL_NAMES[compId] ?? compId,
        statMods: { tier: MATERIAL_TIERS[compId] ?? 1 }
      });
    } else if (compType === "prefix") {
      componentMap.set("prefix", { 
        id: compId, 
        type: "prefix", 
        name: PREFIX_NAMES[compId] ?? compId 
      });
    } else if (compType === "suffix") {
      componentMap.set("suffix", { 
        id: compId, 
        type: "suffix", 
        name: SUFFIX_NAMES[compId] ?? compId 
      });
    } else if (compType === "rune") {
      componentMap.set("rune", { 
        id: compId, 
        type: "rune", 
        name: RUNE_ELEMENTS[compId] ?? compId,
        statMods: { elemental: 1 }
      });
    } else if (compType === "gem") {
      componentMap.set("gem", { 
        id: compId, 
        type: "gem", 
        name: compId.replace("gem_", "").replace(/_/g, " "),
        statMods: { gem: 1 }
      });
    }
  }
  
  const base = componentMap.get("base") ?? { id: "blade_1", type: "base" as const, name: "Dagger" };
  const material = componentMap.get("material")?.id ?? "material_iron";
  
  return {
    base,
    components: Array.from(componentMap.values()),
    material,
    prefix: componentMap.get("prefix"),
    suffix: componentMap.get("suffix"),
    rune: componentMap.get("rune"),
    gem: componentMap.get("gem"),
  };
}

/**
 * Build a full ModularItem from a signature.
 * Combines name, stats, visuals into a complete item representation.
 */
export function buildModularItem(sig: ItemSignature, overrideIlvl?: number): ModularItem {
  const parsed = parseItemSignature(sig);
  
  // Determine category from base component
  const isWeapon = parsed.base.id.startsWith("blade_");
  const category: ItemCategory = isWeapon ? "weapon" : "armor";
  
  // Calculate item level from material tier + components
  const materialTier = MATERIAL_TIERS[parsed.material] ?? 1;
  const bonusIlvl = (parsed.prefix ? 1 : 0) + (parsed.suffix ? 1 : 0) + (parsed.rune ? 2 : 0) + (parsed.gem ? 1 : 0);
  const ilvl = overrideIlvl ?? (materialTier * 5 + bonusIlvl * 2);
  
  // Build name
  const prefixName = parsed.prefix?.name ?? "";
  const suffixName = parsed.suffix?.name ?? "";
  const baseName = parsed.base.name;
  const materialName = MATERIAL_NAMES[parsed.material] ?? "";
  const runeName = parsed.rune ? ` ${parsed.rune.name}` : "";
  const gemName = parsed.gem ? ` ${parsed.gem.name}` : "";
  
  let name = "";
  if (prefixName) name += prefixName + " ";
  name += materialName ? `${materialName} ${baseName}` : baseName;
  if (runeName) name += runeName;
  if (suffixName) name += " " + suffixName;
  if (gemName) name += gemName;
  
  // Derive stats
  const stats = isWeapon 
    ? deriveWeaponStats(parsed, ilvl)
    : deriveArmorStats(parsed, ilvl);
  
  // Derive visuals
  const graphicIds = deriveVisualIds(parsed);
  
  // Determine rarity
  const rarity = detectRarityFromComponents(parsed.components);
  
  // Determine equip slot
  const slot: EquipSlot = isWeapon ? "MAIN_HAND" : "CHEST";
  
  return {
    signature: sig,
    name,
    category,
    rarity,
    ilvl,
    stats,
    visualId: graphicIds.base,
    graphicIds,
    slot,
    requiredLevel: Math.max(1, materialTier * 3),
  };
}

/**
 * Generate a modular weapon signature from components.
 * Used for procedural loot generation on the server.
 */
export function forgeSignature(
  blade: string,
  hilt: string,
  material: string,
  prefix?: string,
  suffix?: string,
  rune?: string,
  gem?: string
): ItemSignature {
  const parts = [`base:${blade}`, `hilt:${hilt}`, `material:${material}`];
  if (prefix) parts.push(`prefix:${prefix}`);
  if (suffix) parts.push(`suffix:${suffix}`);
  if (rune) parts.push(`rune:${rune}`);
  if (gem) parts.push(`gem:${gem}`);
  return parts.join("|");
}

/**
 * Extract the visual seed from a signature for client-side rendering.
 * The client uses this to select sprites from the atlas.
 */
export function getVisualSeed(sig: ItemSignature): string {
  const parsed = parseItemSignature(sig);
  return `${parsed.base.id}:${parsed.material}:${parsed.rune?.id ?? "none"}`;
}

/**
 * Validate a signature format. Returns true if structurally valid.
 */
export function isValidSignature(sig: string): boolean {
  if (typeof sig !== "string" || sig.length === 0) return false;
  const parts = sig.split("|");
  if (parts.length < 2) return false;
  return parts.some(p => p.startsWith("base:"));
}