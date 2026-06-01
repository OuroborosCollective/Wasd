import { getFactionByStrand, type Faction } from "./factionRegistry.js";
import { spawnRegion, seededPick, seededRandom, type City, type Region } from "./worldSpawner.js";
import { buildFeatureTriggerSchedule, type FeatureTrigger } from "./featureTrigger.js";
import type { StrandGraph } from "./strandResolver.js";

export type QuestlineSeed = {
  id: string;
  title: string;
  strandKey: string;
  entryNode: string;
  graph: StrandGraph;
};

export type QuestStepType =
  | "travel"
  | "kill"
  | "collect"
  | "talk"
  | "craft"
  | "escort"
  | "spy"
  | "build"
  | "diplomacy"
  | "ritual"
  | "explore";

export type QuestStep = {
  id: string;
  type: QuestStepType;
  title: string;
  description: string;
  cityId: string;
  npcId?: string;
  targetId?: string;
  targetCount?: number;
  featureTriggers: string[];
  rewards: Record<string, unknown>;
  completed: boolean;
};

export type QuestType = "main" | "side" | "war" | "pvp" | "feature_intro";
export type QuestStatus = "locked" | "active" | "completed";

export type GeneratedQuest = {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  strandKey: string;
  factionId: string;
  cityId: string;
  regionId: string;
  steps: QuestStep[];
  nextQuestId?: string;
  crossroadsId?: string;
  flavor: string;
  rewards: Record<string, unknown>;
  status: QuestStatus;
  createdAt: number;
};

export type StrandQuestPack = {
  region: Region;
  mainQuest: GeneratedQuest;
  sideQuests: GeneratedQuest[];
  warQuest?: GeneratedQuest;
  pvpQuest?: GeneratedQuest;
  featureSchedule: FeatureTrigger[];
};

const STEP_TYPES: Record<
  QuestStepType,
  { verb: string; icon: string }
> = {
  travel: { verb: "Reise nach", icon: "🗺️" },
  kill: { verb: "Besiege", icon: "⚔️" },
  collect: { verb: "Sammle", icon: "📦" },
  talk: { verb: "Sprich mit", icon: "💬" },
  craft: { verb: "Fertige an", icon: "🔨" },
  escort: { verb: "Beschütze", icon: "🛡️" },
  spy: { verb: "Spioniere aus", icon: "👁️" },
  build: { verb: "Baue", icon: "🏗️" },
  diplomacy: { verb: "Verhandle mit", icon: "🤝" },
  ritual: { verb: "Vollführe", icon: "🕯️" },
  explore: { verb: "Erkunde", icon: "🔍" },
};

const STRAND_STEP_PREFERENCE: Record<string, QuestStepType[]> = {
  A: ["travel", "kill", "collect", "talk", "escort"],
  B: ["spy", "collect", "kill", "talk", "travel"],
  C: ["collect", "travel", "talk", "ritual", "explore"],
  D: ["ritual", "collect", "spy", "kill", "explore"],
  E: ["diplomacy", "talk", "travel", "build", "collect"],
};

const FEATURE_STEP_MAP: Record<string, QuestStepType> = {
  combat: "kill",
  crafting: "craft",
  trading: "talk",
  guilds: "talk",
  stealth: "spy",
  assassination: "kill",
  blackmarket: "collect",
  espionage: "spy",
  alchemy: "collect",
  beastmastery: "escort",
  herbalism: "collect",
  druidcraft: "ritual",
  necromancy: "ritual",
  mindbending: "spy",
  runemagic: "explore",
  soulbinding: "ritual",
  diplomacy: "diplomacy",
  building: "build",
  politics: "diplomacy",
  exploration: "explore",
  pvp: "kill",
  pve: "kill",
  housing: "build",
  fishing: "collect",
  mining: "collect",
  woodcutting: "collect",
  cooking: "craft",
  enchanting: "craft",
};

function pickDescription(
  stepType: QuestStepType,
  cityId: string,
  flavor: string,
  targetCount: number
): string {
  const pool: Record<QuestStepType, string[]> = {
    travel: [
      `Begib dich in die ${flavor}en Gefilde von ${cityId}.`,
      `Dein Weg führt dich tief in das Herz von ${cityId}.`,
    ],
    kill: [
      `Bezwinge die Feinde, die das Land ${flavor} belagern.`,
      `Vernichte ${targetCount} Widersacher in ${cityId}.`,
    ],
    collect: [
      `Sammle ${targetCount} ${flavor}e Ressourcen ein.`,
      `Die gesuchten Gegenstände liegen verborgen in der Nähe von ${cityId}.`,
    ],
    talk: [
      `Ein ${flavor}er Geselle in ${cityId} erwartet deine Worte.`,
      `Finde den Informanten in ${cityId} und sprich mit ihm.`,
    ],
    craft: [
      `Stelle in ${cityId} einen Gegenstand her, der deine ${flavor}e Reise symbolisiert.`,
      `Der Meisterhandwerker von ${cityId} verlangt ein Musterstück.`,
    ],
    escort: [
      `Beschütze eine Karawane auf dem Weg durch ${cityId}.`,
      `Ein wichtiger Bote muss unbeschadet ${cityId} verlassen.`,
    ],
    spy: [
      `Beobachte unauffällig die ${flavor}en Kreise um ${cityId}.`,
      `Lüfte das Geheimnis, das sich hinter den Mauern von ${cityId} verbirgt.`,
    ],
    build: [
      `Errichte in ${cityId} eine Stätte, die deiner Fraktion Ehre macht.`,
      `Baue eine Vorpostenstruktur nahe ${cityId}.`,
    ],
    diplomacy: [
      `Verhandle mit den Machthabern von ${cityId} — der Ton bleibt ${flavor}.`,
      `Bringe zwei Parteien in ${cityId} an einen Tisch.`,
    ],
    ritual: [
      `Vollführe in ${cityId} ein ${flavor}es Ritual gemäß der Lehre deiner Fraktion.`,
      `Die Sterne stehen günstig für eine Zeremonie bei ${cityId}.`,
    ],
    explore: [
      `Erkunde die unbekannten Winkel um ${cityId}.`,
      `Kartiere die ${flavor}e Wildnis jenseits von ${cityId}.`,
    ],
  };
  const options = pool[stepType] ?? pool.travel;
  const idx = Math.floor(seededRandom(`${cityId}_${stepType}_${targetCount}`) * options.length);
  return options[Math.min(idx, options.length - 1)]!;
}

/**
 * Generates one procedural quest step along a strand (feature intro or generic strand step).
 */
export function generateStep(opts: {
  strandKey: string;
  questId: string;
  stepIndex: number;
  cityId: string;
  factionId: string;
  featureToIntroduce?: string;
  flavor: string;
}): QuestStep {
  const seed = `${opts.questId}_step_${opts.stepIndex}`;
  const prefs = STRAND_STEP_PREFERENCE[opts.strandKey] ?? STRAND_STEP_PREFERENCE["E"]!;
  const fromFeature = opts.featureToIntroduce
    ? FEATURE_STEP_MAP[opts.featureToIntroduce]
    : undefined;
  const stepType: QuestStepType =
    fromFeature ?? (seededPick(prefs, seed) as QuestStepType | null) ?? "travel";
  const stepDef = STEP_TYPES[stepType] ?? STEP_TYPES.travel;
  const targetCount = Math.floor(seededRandom(`${seed}_count`) * 5) + 1;
  const description = pickDescription(stepType, opts.cityId, opts.flavor, targetCount);
  const npcId =
    stepType === "talk" || stepType === "diplomacy"
      ? `npc_${opts.cityId}_contact_${opts.stepIndex}`
      : undefined;
  const targetId = stepType === "kill" || stepType === "collect" ? `target_${opts.strandKey}_${opts.stepIndex}` : undefined;

  return {
    id: `${opts.questId}_step_${opts.stepIndex}`,
    type: stepType,
    title: `${stepDef.icon} ${stepDef.verb} ${opts.cityId}`,
    description,
    cityId: opts.cityId,
    npcId,
    targetId,
    targetCount,
    featureTriggers: opts.featureToIntroduce ? [opts.featureToIntroduce] : [],
    rewards: { xp: 10 + opts.stepIndex * 5, gold: opts.stepIndex * 2 },
    completed: false,
  };
}

function cityForStepIndex(cities: City[], index: number): string {
  if (!cities.length) return "open_world";
  return cities[index % cities.length]!.id;
}

/**
 * Builds main + side + war + pvp quests from a strand, faction themes, and full feature coverage schedule.
 */
export function generateStrandQuestPack(opts: {
  questlineId: string;
  strandKey: string;
  cityCount?: number;
  requiredFeatures?: string[];
}): StrandQuestPack | null {
  const faction = getFactionByStrand(opts.strandKey);
  if (!faction) return null;

  const region = spawnRegion({
    strandKey: opts.strandKey,
    questlineId: opts.questlineId,
    cityCount: opts.cityCount ?? 3,
    requiredFeatures: opts.requiredFeatures ?? [],
  });

  const cities = region.cities;
  const stepIds = cities.map((c) => c.id);
  if (stepIds.length === 0) stepIds.push("open_world");

  const schedule = buildFeatureTriggerSchedule(stepIds, faction.features);
  const flavor = faction.belief.questFlavor;
  const mainQuestId = `ql_${opts.questlineId}_main`;

  const mainSteps: QuestStep[] = schedule.map((t, i) =>
    generateStep({
      strandKey: opts.strandKey,
      questId: mainQuestId,
      stepIndex: i,
      cityId: t.questStepId,
      factionId: faction.id,
      featureToIntroduce: t.featureId,
      flavor,
    })
  );

  const capitalCity = cities[0];
  const mainQuest: GeneratedQuest = {
    id: mainQuestId,
    title: `${faction.questThemes.main} (${faction.name})`,
    description: `Leinenstrang ${opts.strandKey}: ${region.name}`,
    type: "main",
    strandKey: opts.strandKey,
    factionId: faction.id,
    cityId: capitalCity?.id ?? stepIds[0]!,
    regionId: region.id,
    steps: mainSteps,
    flavor,
    rewards: { titleUnlock: `strand_${opts.strandKey}_main` },
    status: "locked",
    createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
  };

  const sideQuests: GeneratedQuest[] = faction.questThemes.side.map((sideTitle, i) => {
    const qid = `ql_${opts.questlineId}_side_${i}`;
    const cityId = cityForStepIndex(cities, i + 1);
    return {
      id: qid,
      title: sideTitle,
      description: `Nebenquest im Gebiet ${region.landName}.`,
      type: "side" as const,
      strandKey: opts.strandKey,
      factionId: faction.id,
      cityId,
      regionId: region.id,
      steps: [
        generateStep({
          strandKey: opts.strandKey,
          questId: qid,
          stepIndex: 0,
          cityId,
          factionId: faction.id,
          flavor,
        }),
      ],
      flavor,
      rewards: { xp: 25 },
      status: "locked" as const,
      createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
    };
  });

  const warQuest: GeneratedQuest = {
    id: `ql_${opts.questlineId}_war`,
    title: faction.questThemes.war,
    description: `Kriegsstrang — ${faction.landName}.`,
    type: "war",
    strandKey: opts.strandKey,
    factionId: faction.id,
    cityId: cityForStepIndex(cities, 0),
    regionId: region.id,
    steps: [
      generateStep({
        strandKey: opts.strandKey,
        questId: `war_${opts.questlineId}`,
        stepIndex: 0,
        cityId: cityForStepIndex(cities, 0),
        factionId: faction.id,
        featureToIntroduce: "combat",
        flavor,
      }),
    ],
    flavor,
    rewards: { warToken: 1 },
    status: "locked",
    createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
  };

  const pvpQuest: GeneratedQuest = {
    id: `ql_${opts.questlineId}_pvp`,
    title: faction.questThemes.pvp,
    description: `Wettkampf im Zeichen von ${faction.belief.name}.`,
    type: "pvp",
    strandKey: opts.strandKey,
    factionId: faction.id,
    cityId: cityForStepIndex(cities, 1),
    regionId: region.id,
    steps: [
      generateStep({
        strandKey: opts.strandKey,
        questId: `pvp_${opts.questlineId}`,
        stepIndex: 0,
        cityId: cityForStepIndex(cities, 1),
        factionId: faction.id,
        featureToIntroduce: "pvp",
        flavor,
      }),
    ],
    flavor,
    rewards: { honor: 10 },
    status: "locked",
    createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
  };

  return {
    region,
    mainQuest,
    sideQuests,
    warQuest,
    pvpQuest,
    featureSchedule: schedule,
  };
}

export function proceduralSideQuestTitles(seedId: string, count = 2): string[] {
  const titles = ["Nebenpfad", "Verlorene Spur", "Ruf der Ferne", "Stille Spur", "Verborgenes Zeichen"];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${titles[(seedId.length + i) % titles.length]} (${seedId.slice(0, 4)})`);
  }
  return out;
}

export function generateRegionForQuestline(seed: QuestlineSeed): Region {
  return spawnRegion({
    strandKey: seed.strandKey,
    questlineId: seed.id,
    cityCount: 3,
    requiredFeatures: [],
  });
}

export function enrichQuestlineContext(seed: QuestlineSeed) {
  const faction = getFactionByStrand(seed.strandKey);
  const questPack = generateStrandQuestPack({
    questlineId: seed.id,
    strandKey: seed.strandKey,
    cityCount: 3,
  });
  const region = questPack?.region ?? generateRegionForQuestline(seed);
  return {
    questlineId: seed.id,
    strandKey: seed.strandKey,
    faction,
    region,
    sideQuests: proceduralSideQuestTitles(seed.id),
    generatedQuests: questPack
      ? {
          mainQuestId: questPack.mainQuest.id,
          sideQuestIds: questPack.sideQuests.map((q) => q.id),
          warQuestId: questPack.warQuest?.id,
          pvpQuestId: questPack.pvpQuest?.id,
          featureCoveragePending: questPack.featureSchedule.filter((t) => !t.satisfied).length,
        }
      : null,
    questPack,
  };
}
