/**
 * Factions, beliefs, and strand keys (A–E) for questline “Leinenstrang” routing.
 */

export type BeliefEthos = "order" | "chaos" | "nature" | "void" | "balance";

export type Belief = {
  id: string;
  name: string;
  deity: string;
  ethos: BeliefEthos;
  rituals: string[];
  questFlavor: string;
};

export type Faction = {
  id: string;
  name: string;
  kingdom: string;
  landName: string;
  belief: Belief;
  features: string[];
  enemies: string[];
  allies: string[];
  strandKey: "A" | "B" | "C" | "D" | "E";
  cityPrefixes: string[];
  citySuffixes: string[];
  questThemes: { main: string; side: string[]; war: string; pvp: string };
};

export const BELIEFS: Record<string, Belief> = {
  solaren: {
    id: "solaren",
    name: "Sonnenorden",
    deity: "Aelios, der Ewige Morgen",
    ethos: "order",
    rituals: ["Morgengebet", "Sonnenopfer", "Reinigungsritus"],
    questFlavor: "heilig",
  },
  schatten: {
    id: "schatten",
    name: "Schattenweberei",
    deity: "Moraan, das Gesicht-ohne-Augen",
    ethos: "chaos",
    rituals: ["Mondtaufe", "Blutpakt", "Seelenbindung"],
    questFlavor: "düster",
  },
  naturpakt: {
    id: "naturpakt",
    name: "Der Grüne Bund",
    deity: "Tessara, Mutter aller Wurzeln",
    ethos: "nature",
    rituals: ["Erntesegen", "Tierkommunion", "Baumeid"],
    questFlavor: "naturverbunden",
  },
  leerkirche: {
    id: "leerkirche",
    name: "Kirche der Stille",
    deity: "Das Namenlose",
    ethos: "void",
    rituals: ["Stille Meditation", "Gedächtnislöschung", "Nullgebet"],
    questFlavor: "mysteriös",
  },
  gleichgewicht: {
    id: "gleichgewicht",
    name: "Waage des Seins",
    deity: "Auryn, das Zwillingswesen",
    ethos: "balance",
    rituals: ["Doppelschwur", "Gegenopfer", "Resonanzritus"],
    questFlavor: "neutral",
  },
};

export const FACTIONS: Record<string, Faction> = {
  kaiserreich_aelion: {
    id: "kaiserreich_aelion",
    name: "Kaiserreich Aelion",
    kingdom: "Das Goldene Kaiserreich",
    landName: "Aeloria",
    belief: BELIEFS.solaren,
    strandKey: "A",
    features: ["combat", "crafting", "trading", "guilds"],
    enemies: ["dunkelrat", "leerkirche_fraktion"],
    allies: [],
    cityPrefixes: ["Sonnen", "Gold", "Licht", "Heilig", "Groß"],
    citySuffixes: ["burg", "hafen", "tal", "hain", "fels"],
    questThemes: {
      main: "Reinigung der Lande von Dunkelheit",
      side: ["Tempelschutz", "Piratenjagd", "Adelsstreit"],
      war: "Feldzug gegen den Dunkelrat",
      pvp: "Tourniere des Kaisers",
    },
  },
  dunkelrat: {
    id: "dunkelrat",
    name: "Der Dunkelrat",
    kingdom: "Das Verlorene Reich",
    landName: "Umbrath",
    belief: BELIEFS.schatten,
    strandKey: "B",
    features: ["stealth", "assassination", "blackmarket", "espionage"],
    enemies: ["kaiserreich_aelion", "eisenwacht"],
    allies: ["leerkirche_fraktion"],
    cityPrefixes: ["Schatten", "Nacht", "Düster", "Verlorene", "Schwarz"],
    citySuffixes: ["graben", "loch", "turm", "nest", "klinge"],
    questThemes: {
      main: "Unterwanderung des Kaiserreichs von innen",
      side: ["Schmuggel", "Meuchelmord", "Verrat"],
      war: "Schattenkrieg — verdeckte Operationen",
      pvp: "Assassinen-Kontrakte",
    },
  },
  gruener_bund: {
    id: "gruener_bund",
    name: "Der Grüne Bund",
    kingdom: "Die Freien Wälder",
    landName: "Sylvaria",
    belief: BELIEFS.naturpakt,
    strandKey: "C",
    features: ["alchemy", "beastmastery", "herbalism", "druidcraft"],
    enemies: ["kaiserreich_aelion", "dunkelrat"],
    allies: [],
    cityPrefixes: ["Grün", "Moos", "Wald", "Farn", "Fluss"],
    citySuffixes: ["hain", "quelle", "grund", "aue", "forst"],
    questThemes: {
      main: "Rettung der alten Wälder vor Industrialisierung",
      side: ["Heilkräutersuche", "Tierrettung", "Baumhütung"],
      war: "Verteidigung der Ewigen Eiche",
      pvp: "Jagd-Duelle",
    },
  },
  leerkirche_fraktion: {
    id: "leerkirche_fraktion",
    name: "Die Stille Bruderschaft",
    kingdom: "Das Vergessene Fürstentum",
    landName: "Nullgrad",
    belief: BELIEFS.leerkirche,
    strandKey: "D",
    features: ["necromancy", "mindbending", "runemagic", "soulbinding"],
    enemies: ["kaiserreich_aelion", "gruener_bund"],
    allies: ["dunkelrat"],
    cityPrefixes: ["Still", "Leer", "Grau", "Vergessen", "Fahl"],
    citySuffixes: ["ode", "stille", "gruft", "mal", "leere"],
    questThemes: {
      main: "Öffnung des Tores zur Leere",
      side: ["Reliquiensuche", "Seelensammlung", "Gedächtnislöschung"],
      war: "Stiller Krieg — Zombies und Seelendiebe",
      pvp: "Seelenduell",
    },
  },
  gleichgewicht_allianz: {
    id: "gleichgewicht_allianz",
    name: "Die Allianz der Waage",
    kingdom: "Der Freie Staatenbund",
    landName: "Equilibria",
    belief: BELIEFS.gleichgewicht,
    strandKey: "E",
    features: ["diplomacy", "trading", "building", "politics"],
    enemies: [],
    allies: ["kaiserreich_aelion", "gruener_bund", "dunkelrat"],
    cityPrefixes: ["Frei", "Gemein", "Mittel", "Zwei", "Gleich"],
    citySuffixes: ["mark", "pakt", "bund", "rat", "halle"],
    questThemes: {
      main: "Frieden zwischen allen Fraktionen aushandeln",
      side: ["Handelsvertrag", "Botschaftermission", "Volksabstimmung"],
      war: "Peacekeeping-Einsatz",
      pvp: "Diplomatisches Schachspiel",
    },
  },
};

export const ALL_GAME_FEATURES = [
  "combat",
  "crafting",
  "trading",
  "guilds",
  "stealth",
  "assassination",
  "blackmarket",
  "espionage",
  "alchemy",
  "beastmastery",
  "herbalism",
  "druidcraft",
  "necromancy",
  "mindbending",
  "runemagic",
  "soulbinding",
  "diplomacy",
  "building",
  "politics",
  "exploration",
  "pvp",
  "pve",
  "housing",
  "fishing",
  "mining",
  "woodcutting",
  "cooking",
  "enchanting",
] as const;

export function getAllFactions(): Faction[] {
  return Object.values(FACTIONS);
}

export function getFactionById(id: string): Faction | null {
  return FACTIONS[id] ?? null;
}

export function getFactionByStrand(strandKey: string): Faction | null {
  return Object.values(FACTIONS).find((f) => f.strandKey === strandKey) ?? null;
}

export function getEnemies(factionId: string): Faction[] {
  const f = FACTIONS[factionId];
  if (!f) return [];
  return f.enemies.map((id) => FACTIONS[id]).filter(Boolean) as Faction[];
}
