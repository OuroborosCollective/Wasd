import { ALL_GAME_FEATURES } from "./factionRegistry.js";

export type FeatureTriggerKind = "unlock" | "require" | "reward" | "introduce";

export type FeatureTrigger = {
  featureId: string;
  questStepId: string;
  triggerType: FeatureTriggerKind;
  description: string;
  params?: Record<string, unknown>;
  satisfied: boolean;
  /** Set when `satisfyFeature` marks the trigger done */
  satisfiedAt?: number;
};

type FeatureDef = {
  label: string;
  introText: string;
  unlockAction: string;
  requiredLevel: number;
};

/** Full feature catalogue for questline scheduling (matches design doc). */
export const FEATURE_DEFINITIONS: Record<string, FeatureDef> = {
  combat: {
    label: "Kampfsystem",
    introText: "Du wirst in deinen ersten Kampf verwickelt.",
    unlockAction: "enable_combat_ui",
    requiredLevel: 1,
  },
  crafting: {
    label: "Handwerk",
    introText: "Ein Schmied zeigt dir die Grundlagen des Handwerks.",
    unlockAction: "enable_crafting_ui",
    requiredLevel: 2,
  },
  trading: {
    label: "Handel",
    introText: "Du erreichst den ersten Marktplatz.",
    unlockAction: "enable_trading_ui",
    requiredLevel: 1,
  },
  guilds: {
    label: "Gilden",
    introText: "Eine Gilde öffnet dir ihre Tore.",
    unlockAction: "enable_guild_ui",
    requiredLevel: 5,
  },
  stealth: {
    label: "Schleichen",
    introText: "Im Schatten lernst du dich zu bewegen.",
    unlockAction: "enable_stealth_mechanics",
    requiredLevel: 3,
  },
  assassination: {
    label: "Meuchelmord",
    introText: "Dein erster Auftrag im Dunkel.",
    unlockAction: "enable_assassination_quests",
    requiredLevel: 8,
  },
  blackmarket: {
    label: "Schwarzmarkt",
    introText: "Eine versteckte Tür führt in die Unterwelt.",
    unlockAction: "enable_blackmarket_ui",
    requiredLevel: 5,
  },
  espionage: {
    label: "Spionage",
    introText: "Informationen sind das wertvollste Gut.",
    unlockAction: "enable_espionage_system",
    requiredLevel: 6,
  },
  alchemy: {
    label: "Alchemie",
    introText: "Dein erster Trank sprudelt im Kessel.",
    unlockAction: "enable_alchemy_ui",
    requiredLevel: 2,
  },
  beastmastery: {
    label: "Tierbändigung",
    introText: "Ein Wildtier blickt dich an — und folgt dir.",
    unlockAction: "enable_beastmastery_ui",
    requiredLevel: 4,
  },
  herbalism: {
    label: "Kräuterkunde",
    introText: "Die Natur hält viele Geheimnisse bereit.",
    unlockAction: "enable_herbalism_ui",
    requiredLevel: 1,
  },
  druidcraft: {
    label: "Druidenmagie",
    introText: "Die Urkraft der Natur fließt durch dich.",
    unlockAction: "enable_druidcraft_ui",
    requiredLevel: 7,
  },
  necromancy: {
    label: "Nekromantie",
    introText: "Die Grenze zwischen Leben und Tod verschwimmt.",
    unlockAction: "enable_necromancy_ui",
    requiredLevel: 9,
  },
  mindbending: {
    label: "Gedankenkontrolle",
    introText: "Gedanken sind formbar — wenn man weiß wie.",
    unlockAction: "enable_mindbending_ui",
    requiredLevel: 10,
  },
  runemagic: {
    label: "Runenzauber",
    introText: "Uralte Schriftzeichen erwachen zu Leben.",
    unlockAction: "enable_runemagic_ui",
    requiredLevel: 6,
  },
  soulbinding: {
    label: "Seelenbindung",
    introText: "Eine Seele wird an dich gebunden — für immer.",
    unlockAction: "enable_soulbinding_ui",
    requiredLevel: 11,
  },
  diplomacy: {
    label: "Diplomatie",
    introText: "Worte können mehr bewirken als Schwerter.",
    unlockAction: "enable_diplomacy_ui",
    requiredLevel: 3,
  },
  building: {
    label: "Bauwesen",
    introText: "Dein erstes Gebäude erhebt sich aus dem Boden.",
    unlockAction: "enable_building_ui",
    requiredLevel: 4,
  },
  politics: {
    label: "Politik",
    introText: "Der Rat der Ältesten lädt dich ein.",
    unlockAction: "enable_politics_ui",
    requiredLevel: 8,
  },
  exploration: {
    label: "Erkundung",
    introText: "Die Karte vor dir ist leer — noch.",
    unlockAction: "enable_exploration_ui",
    requiredLevel: 1,
  },
  pvp: {
    label: "PvP",
    introText: "Ein anderer Spieler fordert dich heraus.",
    unlockAction: "enable_pvp_flag",
    requiredLevel: 5,
  },
  pve: {
    label: "PvE-Dungeons",
    introText: "Ein Kerker wartet auf mutige Seelen.",
    unlockAction: "enable_pve_dungeons",
    requiredLevel: 3,
  },
  housing: {
    label: "Hausbau",
    introText: "Ein Grundstück gehört dir — bau dir ein Zuhause.",
    unlockAction: "enable_housing_ui",
    requiredLevel: 6,
  },
  fishing: {
    label: "Angeln",
    introText: "Am ruhigen Ufer wartet die erste Angel.",
    unlockAction: "enable_fishing_ui",
    requiredLevel: 1,
  },
  mining: {
    label: "Bergbau",
    introText: "Tief im Berg schlummern Erze und Geheimnisse.",
    unlockAction: "enable_mining_ui",
    requiredLevel: 2,
  },
  woodcutting: {
    label: "Holzfällen",
    introText: "Eine Axt, ein Baum — der Anfang von allem.",
    unlockAction: "enable_woodcutting_ui",
    requiredLevel: 1,
  },
  cooking: {
    label: "Kochen",
    introText: "Ein warmes Mahl stärkt Körper und Geist.",
    unlockAction: "enable_cooking_ui",
    requiredLevel: 1,
  },
  enchanting: {
    label: "Verzauberung",
    introText: "Magische Energie fließt in deinen Gegenstand.",
    unlockAction: "enable_enchanting_ui",
    requiredLevel: 7,
  },
};

export function getFeatureDefinition(featureId: string): FeatureDef | null {
  return FEATURE_DEFINITIONS[featureId] ?? null;
}

export function listAllGameFeatures(): readonly string[] {
  return ALL_GAME_FEATURES;
}

export function createTrigger(
  featureId: string,
  questStepId: string,
  triggerType: FeatureTriggerKind,
  extra?: Record<string, unknown>
): FeatureTrigger {
  const def = getFeatureDefinition(featureId);
  return {
    featureId,
    questStepId,
    triggerType,
    description: def?.introText ?? `Feature: ${featureId}`,
    params: { unlockAction: def?.unlockAction, requiredLevel: def?.requiredLevel, ...extra },
    satisfied: false,
  };
}

/**
 * Spreads every `ALL_GAME_FEATURES` entry across quest steps; strand features first, then remainder.
 */
export function buildFeatureTriggerSchedule(
  questStepIds: string[],
  strandFeatures: string[]
): FeatureTrigger[] {
  if (!questStepIds.length) return [];
  const prioritized = [...strandFeatures];
  const remaining = ALL_GAME_FEATURES.filter((f) => !prioritized.includes(f));
  const fullList = [...prioritized, ...remaining];

  return fullList.map((featureId, idx) => {
    const stepId = questStepIds[idx % questStepIds.length]!;
    const def = FEATURE_DEFINITIONS[featureId];
    return {
      featureId,
      questStepId: stepId,
      triggerType: (idx < strandFeatures.length ? "introduce" : "unlock") as FeatureTriggerKind,
      description: def ? def.introText : `Feature ${featureId} wird freigeschaltet.`,
      params: {
        unlockAction: def ? def.unlockAction : `enable_${featureId}`,
        requiredLevel: def ? def.requiredLevel : 1,
      },
      satisfied: false,
    };
  });
}

export function isFeatureSatisfied(schedule: FeatureTrigger[], featureId: string): boolean {
  const entry = schedule.find((t) => t.featureId === featureId);
  return entry ? entry.satisfied : false;
}

export function satisfyFeature(
  schedule: FeatureTrigger[],
  featureId: string
): FeatureTrigger | null {
  const entry = schedule.find((t) => t.featureId === featureId);
  if (entry) {
    entry.satisfied = true;
    entry.satisfiedAt = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
  }
  return entry ?? null;
}

export function getPendingFeatures(schedule: FeatureTrigger[]): FeatureTrigger[] {
  return schedule.filter((t) => !t.satisfied);
}

export function getTriggersForStep(schedule: FeatureTrigger[], questStepId: string): FeatureTrigger[] {
  return schedule.filter((t) => t.questStepId === questStepId && !t.satisfied);
}

export function featureCoverageReport(schedule: FeatureTrigger[]): {
  complete: boolean;
  missing: string[];
  coveredCount: number;
  totalCount: number;
} {
  const satisfiedIds = schedule.filter((t) => t.satisfied).map((t) => t.featureId);
  const missing = ALL_GAME_FEATURES.filter((f) => !satisfiedIds.includes(f));
  return {
    complete: missing.length === 0,
    missing,
    coveredCount: satisfiedIds.length,
    totalCount: ALL_GAME_FEATURES.length,
  };
}

export function markSatisfied(triggers: FeatureTrigger[], featureId: string): void {
  satisfyFeature(triggers, featureId);
}
