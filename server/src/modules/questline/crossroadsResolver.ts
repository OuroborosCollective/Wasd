/**
 * Major-branch “Scheideweg” resolution (faction / strand), separate from graph node `strandResolver`.
 */

import { getFactionByStrand, type Faction } from "./factionRegistry.js";
import { deepClone } from "../../utils/deepClone.js";

export type CrossroadsChoice = {
  id: string;
  label: string;
  description: string;
  strandKey: string;
  factionId: string;
  flavor: string;
  unlocks: string[];
  locks: string[];
  consequences: {
    world: string;
    story: string;
    enemies: string[];
    war: string;
  };
};

export type Crossroads = {
  id: string;
  title: string;
  description: string;
  triggerQuestId: string;
  choices: CrossroadsChoice[];
  resolvedChoice?: string;
  resolvedAt?: number;
  resolvedBy?: string;
};

const CROSSROADS_TEMPLATES: Record<string, Crossroads> = {
  crossroads_main: {
    id: "crossroads_main",
    title: "Der Weg gabelt sich",
    description:
      "Du stehst am Scheideweg. Jede Richtung führt in eine andere Welt, eine andere Wahrheit. Wähle weise — es gibt kein Zurück.",
    triggerQuestId: "quest_tutorial_final",
    choices: [
      {
        id: "A",
        label: "Dem Kaiserreich dienen",
        description:
          "Schließe dich dem Goldenen Kaiserreich Aelion an. Orden, Ruhm und Licht erwarten dich.",
        strandKey: "A",
        factionId: "kaiserreich_aelion",
        flavor: "ehrenhaft",
        unlocks: ["combat", "crafting", "guilds", "trading"],
        locks: ["stealth", "assassination", "necromancy"],
        consequences: {
          world: "Aeloria öffnet sich: Städte im Goldenen Strang erscheinen",
          story: "Du wirst zum Ritter ernannt und erhältst deinen ersten Auftrag vom Kaiser",
          enemies: ["dunkelrat", "leerkirche_fraktion"],
          war: "Der Kreuzzug gegen den Dunkelrat beginnt",
        },
      },
      {
        id: "B",
        label: "Den Dunkelrat infiltrieren",
        description: "Tauche ein in die Schattenwelt. Macht, Verrat und Geheimnisse locken dich.",
        strandKey: "B",
        factionId: "dunkelrat",
        flavor: "verräterisch",
        unlocks: ["stealth", "assassination", "blackmarket", "espionage"],
        locks: ["guilds", "diplomacy", "politics"],
        consequences: {
          world: "Umbrath öffnet sich: Verborgene Städte im Schatten erscheinen",
          story: "Ein Dunkelrat-Agent nimmt dich unter seine Fittiche",
          enemies: ["kaiserreich_aelion", "eisenwacht"],
          war: "Schattenkrieg — Operationen im Verborgenen beginnen",
        },
      },
      {
        id: "C",
        label: "Den Grünen Bund unterstützen",
        description: "Kämpfe für die alten Wälder und das Gleichgewicht der Natur.",
        strandKey: "C",
        factionId: "gruener_bund",
        flavor: "naturverbunden",
        unlocks: ["herbalism", "alchemy", "beastmastery", "druidcraft"],
        locks: ["necromancy", "assassination", "blackmarket"],
        consequences: {
          world: "Sylvaria öffnet sich: Waldstädte und Haine erscheinen",
          story: "Der Ältestenrat begrüßt dich als Beschützer der Ewigen Eiche",
          enemies: ["kaiserreich_aelion", "dunkelrat"],
          war: "Verteidigung der Wälder gegen Holzfäller-Armeen",
        },
      },
    ],
  },

  crossroads_war: {
    id: "crossroads_war",
    title: "Das Blut der Entscheidung",
    description:
      "Der erste Krieg ist entschieden. Doch neue Mächte rücken ins Licht. Wohin gehst du als nächstes?",
    triggerQuestId: "quest_war_arc_end",
    choices: [
      {
        id: "D",
        label: "Der Stille Bruderschaft beitreten",
        description: "Jenseits des Krieges wartet die Leere. Verlorenes Wissen ruft dich.",
        strandKey: "D",
        factionId: "leerkirche_fraktion",
        flavor: "mysteriös",
        unlocks: ["necromancy", "mindbending", "runemagic", "soulbinding"],
        locks: ["combat", "trading", "diplomacy"],
        consequences: {
          world: "Nullgrad öffnet sich: Die vergessene Stille-Heimat erscheint",
          story: "Ein stummer Bote überreicht dir ein versiegeltes Pergament",
          enemies: ["kaiserreich_aelion", "gruener_bund"],
          war: "Der Stille Krieg beginnt — Untote erheben sich",
        },
      },
      {
        id: "E",
        label: "Die Allianz der Waage gründen",
        description:
          "Alle Fraktionen an einen Tisch bringen. Frieden ist möglich — wenn du stark genug bist.",
        strandKey: "E",
        factionId: "gleichgewicht_allianz",
        flavor: "diplomatisch",
        unlocks: ["diplomacy", "politics", "building", "trading"],
        locks: ["assassination", "necromancy"],
        consequences: {
          world: "Equilibria öffnet sich: Neutrale Städte und Botschaften erscheinen",
          story: "Du wirst zum Botschafter aller Länder ernannt",
          enemies: [],
          war: "Kein Krieg — Verhandlungstische statt Schlachtfelder",
        },
      },
    ],
  },

  crossroads_endgame: {
    id: "crossroads_endgame",
    title: "Das Ende aller Wege",
    description:
      "Du hast die Welt durchquert. Alle Fraktionen kennen deinen Namen. Nun entscheidest du über das Schicksal Arelorias.",
    triggerQuestId: "quest_all_features_complete",
    choices: [
      {
        id: "A",
        label: "Die Welt unter dem Kaiser vereinen",
        description: "Eine Ordnung, eine Wahrheit, ein Reich.",
        strandKey: "A",
        factionId: "kaiserreich_aelion",
        flavor: "imperialistisch",
        unlocks: ["politics", "building", "guilds"],
        locks: [],
        consequences: {
          world: "Alle Gebiete werden unter dem Kaiserreich vereint",
          story: "Du wirst zum Reichsmarschall ernannt",
          enemies: ["dunkelrat"],
          war: "Der finale Kreuzzug — Einigung oder Untergang",
        },
      },
      {
        id: "B",
        label: "Die Welt im Chaos versinken lassen",
        description: "Nur aus dem Chaos kann wahre Freiheit entstehen.",
        strandKey: "B",
        factionId: "dunkelrat",
        flavor: "anarchistisch",
        unlocks: ["stealth", "espionage", "blackmarket"],
        locks: [],
        consequences: {
          world: "Alle Fraktionen implodieren — neue Machtvakuums entstehen",
          story: "Der Dunkelrat übernimmt die Kontrolle im Verborgenen",
          enemies: ["kaiserreich_aelion", "gleichgewicht_allianz"],
          war: "Weltweiter Schatten-Aufstand",
        },
      },
      {
        id: "C",
        label: "Die Welt dem Gleichgewicht übergeben",
        description: "Keine Fraktion dominiert — alle leben im Einklang.",
        strandKey: "E",
        factionId: "gleichgewicht_allianz",
        flavor: "friedfertig",
        unlocks: ["diplomacy", "building", "politics"],
        locks: [],
        consequences: {
          world: "Alle Gebiete koexistieren — neue neutrale Zonen entstehen",
          story: "Die Allianz der Waage übernimmt die Weltregierung",
          enemies: [],
          war: "Kein finaler Krieg — der ewige Frieden beginnt",
        },
      },
    ],
  },
};

export type WorldEffect = {
  activateStrand: string;
  activateFaction: string;
  spawnRegion: boolean;
  requiredFeatures: string[];
  lockedFeatures: string[];
  startWar: string;
  newLand: string;
  storyTrigger: string;
  enemyFactions: string[];
};

export type ResolveCrossroadsResult = {
  resolved: Crossroads;
  choice: CrossroadsChoice;
  nextStrand: string;
  worldEffect: WorldEffect;
};

export function getCrossroads(crossroadsId: string): Crossroads | null {
  const template = CROSSROADS_TEMPLATES[crossroadsId];
  if (!template) return null;
  return deepClone(template) as Crossroads;
}

export function getCrossroadsByTrigger(questId: string): Crossroads[] {
  return Object.values(CROSSROADS_TEMPLATES)
    .filter((c) => c.triggerQuestId === questId)
    .map((c) => deepClone(c) as Crossroads);
}

export function resolveCrossroadsChoice(
  crossroadsId: string,
  choiceId: string,
  playerState: { playerId: string; completedFeatures?: string[] }
): ResolveCrossroadsResult {
  const crossroads = getCrossroads(crossroadsId);
  if (!crossroads) {
    throw new Error(`Scheideweg nicht gefunden: ${crossroadsId}`);
  }
  const choice = crossroads.choices.find((c) => c.id === choiceId);
  if (!choice) {
    throw new Error(`Ungültige Entscheidung: ${choiceId} bei Scheideweg ${crossroadsId}`);
  }
  const faction = getFactionByStrand(choice.strandKey);

  crossroads.resolvedChoice = choiceId;
  crossroads.resolvedAt = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
  crossroads.resolvedBy = playerState.playerId;

  const worldEffect: WorldEffect = {
    activateStrand: choice.strandKey,
    activateFaction: choice.factionId,
    spawnRegion: true,
    requiredFeatures: choice.unlocks,
    lockedFeatures: choice.locks,
    startWar: choice.consequences.war,
    newLand: faction ? faction.landName : "Unbekanntes Land",
    storyTrigger: choice.consequences.story,
    enemyFactions: choice.consequences.enemies ?? [],
  };

  return { resolved: crossroads, choice, nextStrand: choice.strandKey, worldEffect };
}

export type CrossroadsChoiceUi = {
  id: string;
  label: string;
  description: string;
  flavor: string;
  kingdom: string;
  land: string;
  belief: string;
  deity: string;
  ethos: string;
  consequence: string;
};

export function buildChoiceUI(crossroadsId: string): CrossroadsChoiceUi[] {
  const crossroads = getCrossroads(crossroadsId);
  if (!crossroads) return [];
  return crossroads.choices.map((c) => {
    const f: Faction | null = getFactionByStrand(c.strandKey);
    return {
      id: c.id,
      label: c.label,
      description: c.description,
      flavor: c.flavor,
      kingdom: f ? f.kingdom : "Unbekannt",
      land: f ? f.landName : "Unbekannt",
      belief: f ? f.belief.name : "Unbekannt",
      deity: f ? f.belief.deity : "Unbekannt",
      ethos: f ? f.belief.ethos : "unknown",
      consequence: c.consequences.story,
    };
  });
}

export function checkCrossroadsEligibility(
  crossroadsId: string,
  playerState: { completedQuests?: string[] },
  /** If you persist crossroads resolution on the player, pass the stored choice id here. */
  persistedResolvedChoice?: string | null
): { eligible: boolean; reason: string } {
  const crossroads = getCrossroads(crossroadsId);
  if (!crossroads) {
    return { eligible: false, reason: "Scheideweg nicht gefunden" };
  }
  if (persistedResolvedChoice || crossroads.resolvedChoice) {
    return { eligible: false, reason: "Scheideweg wurde bereits aufgelöst" };
  }
  const triggerDone = (playerState.completedQuests ?? []).includes(crossroads.triggerQuestId);
  if (!triggerDone) {
    return { eligible: false, reason: `Benötigt abgeschlossene Quest: ${crossroads.triggerQuestId}` };
  }
  return { eligible: true, reason: "Bereit" };
}

export { CROSSROADS_TEMPLATES };
