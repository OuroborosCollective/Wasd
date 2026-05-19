import type { ARERng } from "../../core/determinism/AREDeterminism.js";

export type WeaponVisualRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mystic";
export type WeaponVisualClass = "weapon" | "sword" | "axe" | "dagger" | "spear" | "mace" | "greatsword";

export interface WeaponVisualMeta {
  weaponClass: WeaponVisualClass;
  visualRarity: WeaponVisualRarity;
  visualSeed: string;
  visualId: string;
}

const WEAPON_CLASSES: readonly WeaponVisualClass[] = ["weapon", "sword", "axe", "dagger", "spear", "mace", "greatsword"];
const WEAPON_RARITIES: readonly WeaponVisualRarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mystic"];

const WEAPON_VISUAL_POOL: Record<WeaponVisualClass, Partial<Record<WeaponVisualRarity, readonly string[]>>> = {
  weapon: {
    common: ["weapon_generic_common_001", "weapon_generic_common_002", "weapon_generic_common_007", "weapon_generic_common_008", "weapon_generic_common_013", "weapon_generic_common_014", "weapon_generic_common_019", "weapon_generic_common_020", "weapon_generic_common_025", "weapon_generic_common_026", "weapon_generic_common_031", "weapon_generic_common_032", "weapon_generic_common_037", "weapon_generic_common_038", "weapon_generic_common_043", "weapon_generic_common_044", "weapon_generic_common_049", "weapon_generic_common_050", "weapon_generic_common_055", "weapon_generic_common_056", "weapon_generic_common_061", "weapon_generic_common_062", "weapon_generic_common_067", "weapon_generic_common_068", "weapon_generic_common_073", "weapon_generic_common_074", "weapon_generic_common_079", "weapon_generic_common_080", "weapon_generic_common_085", "weapon_generic_common_086", "weapon_generic_common_091", "weapon_generic_common_092", "weapon_generic_common_097", "weapon_generic_common_098", "weapon_generic_common_122", "weapon_generic_common_123", "weapon_generic_common_128", "weapon_generic_common_131", "weapon_generic_common_132", "weapon_generic_common_133", "weapon_generic_common_134"],
    uncommon: ["weapon_generic_uncommon_003", "weapon_generic_uncommon_009", "weapon_generic_uncommon_015", "weapon_generic_uncommon_021", "weapon_generic_uncommon_027", "weapon_generic_uncommon_033", "weapon_generic_uncommon_039", "weapon_generic_uncommon_045", "weapon_generic_uncommon_051", "weapon_generic_uncommon_057", "weapon_generic_uncommon_063", "weapon_generic_uncommon_069", "weapon_generic_uncommon_075", "weapon_generic_uncommon_081", "weapon_generic_uncommon_087", "weapon_generic_uncommon_093", "weapon_generic_uncommon_099", "weapon_generic_uncommon_118", "weapon_generic_uncommon_124", "weapon_generic_uncommon_129"],
    rare: ["weapon_generic_rare_004", "weapon_generic_rare_010", "weapon_generic_rare_016", "weapon_generic_rare_022", "weapon_generic_rare_028", "weapon_generic_rare_034", "weapon_generic_rare_040", "weapon_generic_rare_046", "weapon_generic_rare_052", "weapon_generic_rare_058", "weapon_generic_rare_064", "weapon_generic_rare_070", "weapon_generic_rare_076", "weapon_generic_rare_082", "weapon_generic_rare_088", "weapon_generic_rare_094", "weapon_generic_rare_100", "weapon_generic_rare_101", "weapon_generic_rare_102", "weapon_generic_rare_103", "weapon_generic_rare_104", "weapon_generic_rare_105", "weapon_generic_rare_106", "weapon_generic_rare_107", "weapon_generic_rare_108", "weapon_generic_rare_109", "weapon_generic_rare_110", "weapon_generic_rare_111", "weapon_generic_rare_112", "weapon_generic_rare_113", "weapon_generic_rare_114", "weapon_generic_rare_115", "weapon_generic_rare_116", "weapon_generic_rare_117", "weapon_generic_rare_119", "weapon_generic_rare_125", "weapon_generic_rare_130"],
    epic: ["weapon_generic_epic_005", "weapon_generic_epic_011", "weapon_generic_epic_017", "weapon_generic_epic_023", "weapon_generic_epic_029", "weapon_generic_epic_035", "weapon_generic_epic_041", "weapon_generic_epic_047", "weapon_generic_epic_053", "weapon_generic_epic_059", "weapon_generic_epic_065", "weapon_generic_epic_071", "weapon_generic_epic_077", "weapon_generic_epic_083", "weapon_generic_epic_089", "weapon_generic_epic_095", "weapon_generic_epic_120", "weapon_generic_epic_126"],
    legendary: ["weapon_generic_mystic_006", "weapon_generic_mystic_012", "weapon_generic_mystic_018", "weapon_generic_mystic_024", "weapon_generic_mystic_030", "weapon_generic_mystic_036", "weapon_generic_mystic_042", "weapon_generic_mystic_048", "weapon_generic_mystic_054", "weapon_generic_mystic_060", "weapon_generic_mystic_066", "weapon_generic_mystic_072", "weapon_generic_mystic_078", "weapon_generic_mystic_084", "weapon_generic_mystic_090", "weapon_generic_mystic_096", "weapon_generic_mystic_121", "weapon_generic_mystic_127"],
    mystic: ["weapon_generic_mystic_006", "weapon_generic_mystic_012", "weapon_generic_mystic_018", "weapon_generic_mystic_024", "weapon_generic_mystic_030", "weapon_generic_mystic_036", "weapon_generic_mystic_042", "weapon_generic_mystic_048", "weapon_generic_mystic_054", "weapon_generic_mystic_060", "weapon_generic_mystic_066", "weapon_generic_mystic_072", "weapon_generic_mystic_078", "weapon_generic_mystic_084", "weapon_generic_mystic_090", "weapon_generic_mystic_096", "weapon_generic_mystic_121", "weapon_generic_mystic_127"],
  },
  sword: {
    common: ["weapon_sword_common_001", "weapon_sword_common_002", "weapon_sword_common_003", "weapon_sword_common_004", "weapon_sword_common_005", "weapon_sword_common_006", "weapon_sword_common_007", "weapon_sword_common_008", "weapon_sword_common_059", "weapon_sword_common_060", "weapon_sword_common_061", "weapon_sword_common_062", "weapon_sword_common_063", "weapon_sword_common_064", "weapon_sword_common_065"],
    uncommon: ["weapon_sword_uncommon_009", "weapon_sword_uncommon_010", "weapon_sword_uncommon_011", "weapon_sword_uncommon_012", "weapon_sword_uncommon_013", "weapon_sword_uncommon_014", "weapon_sword_uncommon_015", "weapon_sword_uncommon_016", "weapon_sword_uncommon_017", "weapon_sword_uncommon_018", "weapon_sword_uncommon_019", "weapon_sword_uncommon_020", "weapon_sword_uncommon_021", "weapon_sword_uncommon_022", "weapon_sword_uncommon_023", "weapon_sword_uncommon_024", "weapon_sword_uncommon_025", "weapon_sword_uncommon_026", "weapon_sword_uncommon_027", "weapon_sword_uncommon_028", "weapon_sword_uncommon_029", "weapon_sword_uncommon_030", "weapon_sword_uncommon_031", "weapon_sword_uncommon_032", "weapon_sword_uncommon_033", "weapon_sword_uncommon_034", "weapon_sword_uncommon_035", "weapon_sword_uncommon_036", "weapon_sword_uncommon_037", "weapon_sword_uncommon_038", "weapon_sword_uncommon_039", "weapon_sword_uncommon_040", "weapon_sword_uncommon_041", "weapon_sword_uncommon_042", "weapon_sword_uncommon_043", "weapon_sword_uncommon_044", "weapon_sword_uncommon_045", "weapon_sword_uncommon_046", "weapon_sword_uncommon_047", "weapon_sword_uncommon_048", "weapon_sword_uncommon_049", "weapon_sword_uncommon_050", "weapon_sword_uncommon_051", "weapon_sword_uncommon_052", "weapon_sword_uncommon_053", "weapon_sword_uncommon_054"],
    rare: ["weapon_sword_rare_055", "weapon_sword_rare_056", "weapon_sword_rare_057", "weapon_sword_rare_058"],
  },
  axe: { uncommon: ["weapon_axe_uncommon_001", "weapon_axe_uncommon_002", "weapon_axe_uncommon_003", "weapon_axe_uncommon_004", "weapon_axe_uncommon_005", "weapon_axe_uncommon_006", "weapon_axe_uncommon_007", "weapon_axe_uncommon_008", "weapon_axe_uncommon_009", "weapon_axe_uncommon_010", "weapon_axe_uncommon_011", "weapon_axe_uncommon_012"] },
  dagger: { common: ["weapon_dagger_common_001", "weapon_dagger_common_002"], uncommon: ["weapon_dagger_uncommon_003", "weapon_dagger_uncommon_004", "weapon_dagger_uncommon_005", "weapon_dagger_uncommon_006", "weapon_dagger_uncommon_007", "weapon_dagger_uncommon_008", "weapon_dagger_uncommon_009", "weapon_dagger_uncommon_010", "weapon_dagger_uncommon_011"] },
  spear: { common: ["weapon_spear_common_001", "weapon_spear_common_002", "weapon_spear_common_003", "weapon_spear_common_004"], uncommon: ["weapon_spear_uncommon_005", "weapon_spear_uncommon_006", "weapon_spear_uncommon_007", "weapon_spear_uncommon_008", "weapon_spear_uncommon_009", "weapon_spear_uncommon_010"], rare: ["weapon_spear_rare_011"] },
  mace: {
    common: ["weapon_mace_common_001", "weapon_mace_common_006", "weapon_mace_common_007", "weapon_mace_common_012", "weapon_mace_common_013", "weapon_mace_common_021", "weapon_mace_common_022", "weapon_mace_common_023", "weapon_mace_common_024"],
    uncommon: ["weapon_mace_uncommon_002", "weapon_mace_uncommon_008"],
    rare: ["weapon_mace_rare_003", "weapon_mace_rare_009", "weapon_mace_rare_014", "weapon_mace_rare_015", "weapon_mace_rare_016", "weapon_mace_rare_017", "weapon_mace_rare_018", "weapon_mace_rare_019", "weapon_mace_rare_020"],
    epic: ["weapon_mace_epic_004", "weapon_mace_epic_010"],
    legendary: ["weapon_mace_mystic_005", "weapon_mace_mystic_011"],
    mystic: ["weapon_mace_mystic_005", "weapon_mace_mystic_011"],
  },
  greatsword: { common: ["weapon_greatsword_common_001", "weapon_greatsword_common_002", "weapon_greatsword_common_003"], uncommon: ["weapon_greatsword_uncommon_004", "weapon_greatsword_uncommon_005", "weapon_greatsword_uncommon_006", "weapon_greatsword_uncommon_007", "weapon_greatsword_uncommon_008", "weapon_greatsword_uncommon_009", "weapon_greatsword_uncommon_010", "weapon_greatsword_uncommon_011"], rare: ["weapon_greatsword_rare_012", "weapon_greatsword_rare_013"] },
};

export function applyWeaponVisual<T extends Record<string, any>>(
  item: T,
  options: { rng?: ARERng; seed?: string | number; dropIndex?: number } = {},
): T & WeaponVisualMeta {
  if (item.visualId && item.weaponClass && item.visualSeed) return item as T & WeaponVisualMeta;

  const weaponClass = normalizeWeaponClass(item.weaponClass ?? inferWeaponClass(item));
  const visualRarity = normalizeRarity(item.visualRarity ?? item.rarity);
  const visualSeed = String(options.seed ?? item.seed ?? `${item.id ?? item.name ?? "weapon"}:${visualRarity}:${options.dropIndex ?? 0}`);
  const pool = selectPool(weaponClass, visualRarity);
  const index = options.rng ? options.rng.nextInt(pool.length) : stableIndex(visualSeed, pool.length);
  const visualId = pool[index] ?? pool[0];

  return { ...item, seed: item.seed ?? visualSeed, weaponClass, visualRarity, visualSeed, visualId };
}

function normalizeWeaponClass(value: unknown): WeaponVisualClass {
  const raw = String(value ?? "weapon").toLowerCase();
  return WEAPON_CLASSES.includes(raw as WeaponVisualClass) ? raw as WeaponVisualClass : "weapon";
}

function normalizeRarity(value: unknown): WeaponVisualRarity {
  const raw = String(value ?? "common").toLowerCase();
  if (WEAPON_RARITIES.includes(raw as WeaponVisualRarity)) return raw as WeaponVisualRarity;
  return "common";
}

function inferWeaponClass(item: Record<string, any>): WeaponVisualClass {
  const haystack = [item.id, item.name, item.baseId, ...(Array.isArray(item.tags) ? item.tags : [])].filter(Boolean).join(" ").toLowerCase();
  if (/great\s*sword|greatsword|claymore|zweihander|twohand|two_hand/.test(haystack)) return "greatsword";
  if (/dagger|knife|dirk|stiletto/.test(haystack)) return "dagger";
  if (/spear|pike|lance|halberd|glaive/.test(haystack)) return "spear";
  if (/mace|club|hammer|maul|flail/.test(haystack)) return "mace";
  if (/axe|hatchet/.test(haystack)) return "axe";
  if (/sword|blade|sabre|saber|katana|rapier/.test(haystack)) return "sword";
  return "weapon";
}

function selectPool(weaponClass: WeaponVisualClass, rarity: WeaponVisualRarity): readonly string[] {
  return WEAPON_VISUAL_POOL[weaponClass][rarity] ?? WEAPON_VISUAL_POOL.weapon[rarity] ?? WEAPON_VISUAL_POOL[weaponClass].uncommon ?? WEAPON_VISUAL_POOL[weaponClass].common ?? WEAPON_VISUAL_POOL.weapon.common ?? ["weapon_generic_common_001"];
}

function stableIndex(seed: string, maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % maxExclusive;
}
