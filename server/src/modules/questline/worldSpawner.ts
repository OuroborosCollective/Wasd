import { createHash } from "node:crypto";
import { getFactionByStrand, type Faction } from "./factionRegistry.js";

export type CityType = "capital" | "town" | "village" | "outpost" | "ruin";

export type City = {
  id: string;
  name: string;
  regionId: string;
  factionId: string;
  strandKey: string;
  type: CityType;
  biome: string;
  features: string[];
  npcs: Array<{
    id: string;
    role: string;
    factionId: string;
    cityId: string;
    name: string;
    dialogue: string;
    quest: string;
  }>;
  shops: Array<{ id: string; name: string; type: string }>;
  quests: string[];
  worldPos: { x: number; z: number };
  generatedFor: string;
  population: "large" | "medium" | "small";
  createdAt: number;
};

export type Region = {
  id: string;
  name: string;
  landName: string;
  factionId: string;
  strandKey: string;
  biome: string;
  cities: City[];
  features: string[];
  createdAt: number;
};

const CITY_TYPES: CityType[] = ["capital", "town", "village", "outpost", "ruin"];

const BIOMES: Record<string, string[]> = {
  A: ["plains", "mountain", "desert"],
  B: ["swamp", "ruins", "underground"],
  C: ["forest", "jungle", "wetland"],
  D: ["tundra", "void", "ashlands"],
  E: ["plains", "coastal", "island"],
};

const NPC_ROLES_BY_STRAND: Record<string, string[]> = {
  A: ["knight", "priest", "merchant", "herald"],
  B: ["assassin", "smuggler", "spy", "fence"],
  C: ["druid", "ranger", "herbalist", "beast_tamer"],
  D: ["necromancer", "cultist", "seer", "rune_scholar"],
  E: ["diplomat", "trader", "senator", "mediator"],
};

export function seededRandom(input: string): number {
  const hash = createHash("md5").update(String(input)).digest("hex");
  return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
}

export function seededPick<T>(arr: T[], seed: string): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(seededRandom(seed) * arr.length)]!;
}

export function generateCityName(faction: Faction, seed: string): string {
  const prefix = seededPick(faction.cityPrefixes, `${seed}_prefix`);
  const suffix = seededPick(faction.citySuffixes, `${seed}_suffix`);
  return `${prefix ?? "Neu"}${suffix ?? "stadt"}`;
}

export function generateCityNpcs(strandKey: string, cityId: string, factionId: string) {
  const roles = NPC_ROLES_BY_STRAND[strandKey] ?? NPC_ROLES_BY_STRAND["E"]!;
  return roles.map((role, i) => ({
    id: `npc_${cityId}_${role}_${i}`,
    role,
    factionId,
    cityId,
    name: `${role.charAt(0).toUpperCase() + role.slice(1)} von ${cityId}`,
    dialogue: `dialogue_${cityId}_${role}`,
    quest: `quest_${cityId}_${role}_intro`,
  }));
}

export function generateShops(features: string[], cityId: string) {
  const shopMap: Record<string, { id: string; name: string; type: string }> = {
    trading: { id: `shop_${cityId}_general`, name: "Allgemeinladen", type: "general" },
    crafting: { id: `shop_${cityId}_smith`, name: "Schmied", type: "crafting" },
    alchemy: { id: `shop_${cityId}_alchemist`, name: "Alchemist", type: "alchemy" },
    herbalism: { id: `shop_${cityId}_herbalist`, name: "Kräuterhändler", type: "herbalism" },
    blackmarket: { id: `shop_${cityId}_blackmarket`, name: "Schwarzmarkt", type: "illegal" },
    runemagic: { id: `shop_${cityId}_runesmith`, name: "Runenschmied", type: "magic" },
    enchanting: { id: `shop_${cityId}_enchanter`, name: "Verzauberer", type: "magic" },
    diplomacy: { id: `shop_${cityId}_embassy`, name: "Botschaft", type: "politics" },
  };
  return features.filter((f) => shopMap[f]).map((f) => shopMap[f]!);
}

export function calcWorldPos(strandKey: string, cityIndex: number, regionId: string): { x: number; z: number } {
  const strandAngleMap: Record<string, number> = { A: 0, B: 72, C: 144, D: 216, E: 288 };
  const baseAngle = ((strandAngleMap[strandKey] ?? 0) * Math.PI) / 180;
  const spread = seededRandom(`${regionId}_${cityIndex}`) * 0.4 - 0.2;
  const angle = baseAngle + spread;
  const radius = 500 + cityIndex * 300 + seededRandom(regionId) * 150;
  return {
    x: Math.round(Math.cos(angle) * radius),
    z: Math.round(Math.sin(angle) * radius),
  };
}

export function spawnCity(opts: {
  strandKey: string;
  factionId: string;
  questId: string;
  regionId: string;
  cityIndex: number;
  requiredFeatures?: string[];
  forceType?: CityType;
}): City {
  const faction = getFactionByStrand(opts.strandKey);
  if (!faction) throw new Error(`Unknown strand: ${opts.strandKey}`);

  const seed = `${opts.strandKey}_${opts.regionId}_${opts.cityIndex}`;
  const cityId = `city_${opts.strandKey.toLowerCase()}_${opts.regionId}_${opts.cityIndex}`;
  const name = generateCityName(faction, seed);

  const typePool = opts.cityIndex === 0 ? (["capital"] as CityType[]) : CITY_TYPES.slice(1) as CityType[];
  const type = opts.forceType ?? (seededPick(typePool, `${seed}_type`) as CityType) ?? "town";

  const features = [...new Set([...faction.features, ...(opts.requiredFeatures ?? [])])];

  const city: City = {
    id: cityId,
    name,
    regionId: opts.regionId,
    factionId: faction.id,
    strandKey: opts.strandKey,
    type,
    biome: seededPick(BIOMES[opts.strandKey] ?? BIOMES["E"], `${seed}_biome`) ?? "plains",
    features,
    npcs: generateCityNpcs(opts.strandKey, cityId, faction.id),
    shops: generateShops(features, cityId),
    quests: [`quest_${cityId}_main`, `quest_${cityId}_side_1`, `quest_${cityId}_side_2`],
    worldPos: calcWorldPos(opts.strandKey, opts.cityIndex, opts.regionId),
    generatedFor: opts.questId,
    population: type === "capital" ? "large" : type === "town" ? "medium" : "small",
    createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
  };
  return city;
}

export function spawnRegion(opts: {
  strandKey: string;
  questlineId: string;
  cityCount?: number;
  requiredFeatures?: string[];
}): Region {
  const faction = getFactionByStrand(opts.strandKey);
  if (!faction) throw new Error(`Unknown strand: ${opts.strandKey}`);

  const regionId = `region_${opts.strandKey.toLowerCase()}_${opts.questlineId}`;
  const regionName = `${faction.landName} — Gebiet ${opts.questlineId.slice(-4)}`;
  const cityCount = opts.cityCount ?? 3;

  const cities = Array.from({ length: cityCount }, (_, i) =>
    spawnCity({
      strandKey: opts.strandKey,
      factionId: faction.id,
      questId: opts.questlineId,
      regionId,
      cityIndex: i,
      requiredFeatures: opts.requiredFeatures,
      forceType: i === 0 ? "capital" : undefined,
    })
  );

  return {
    id: regionId,
    name: regionName,
    landName: faction.landName,
    factionId: faction.id,
    strandKey: opts.strandKey,
    biome: seededPick(BIOMES[opts.strandKey] ?? BIOMES["E"], regionId) ?? "plains",
    cities,
    features: [...new Set(cities.flatMap((c) => c.features))],
    createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
  };
}
