// @ARE-GUARD-EXEMPT: non-sim module
import type { GLBLink } from "../asset-registry/GLBRegistry.js";

export type SmartCategory =
  | "npcs"
  | "monsters"
  | "world_objects"
  | "players"
  | "loot"
  | "resources";

export interface SmartLinkChoices {
  npcIds: string[];
  npcRoles: string[];
  worldObjectIds: string[];
  objectTypes: string[];
  monsterGroups: string[];
}

export interface SmartLinkInput {
  category: SmartCategory;
  fileName: string;
  choices: SmartLinkChoices;
}

type SmartConfidence = "high" | "medium" | "low";

type SmartDecisionBase = {
  confidence: SmartConfidence;
  reason: string;
  suggestions: string[];
  normalizedName: string;
};

export type SmartLinkDecision =
  | (SmartDecisionBase & {
      kind: "link";
      targetType: GLBLink["targetType"];
      targetId: string;
    })
  | (SmartDecisionBase & {
      kind: "pool_default";
      category: SmartCategory;
    });

const KNOWN_PREFIXES = [
  "npc_",
  "monster_",
  "monsters_",
  "obj_",
  "object_",
  "world_",
  "loot_",
  "player_",
  "resource_",
];

function normalizeToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stripVersionSuffix(token: string): string {
  return token.replace(/(?:_v?\d+|_\d{2,})$/i, "");
}

function buildNameCandidates(fileName: string): string[] {
  const stem = fileName.replace(/\.(glb|gltf|bin)$/i, "");
  const normalized = normalizeToken(stem);
  const candidates = new Set<string>();
  const add = (value: string) => {
    if (value && value.length >= 2) {
      candidates.add(value);
    }
  };

  add(normalized);
  add(stripVersionSuffix(normalized));
  for (const prefix of KNOWN_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      const trimmed = normalized.slice(prefix.length);
      add(trimmed);
      add(stripVersionSuffix(trimmed));
    }
  }

  // If name has many separators, progressively trim trailing parts.
  const parts = normalized.split("_").filter(Boolean);
  if (parts.length >= 3) {
    add(parts.slice(0, parts.length - 1).join("_"));
  }

  return Array.from(candidates);
}

type MatchResult = {
  value: string;
  mode: "exact" | "fuzzy";
};

function scoreCandidate(candidate: string, option: string): number {
  if (candidate === option) return 100;
  const compactCandidate = candidate.replace(/_/g, "");
  const compactOption = option.replace(/_/g, "");
  if (compactCandidate === compactOption) return 95;
  if (candidate.startsWith(option) || option.startsWith(candidate)) return 78;
  if (candidate.includes(option) || option.includes(candidate)) return 68;
  return 0;
}

function pickBestMatch(candidates: string[], options: string[]): MatchResult | null {
  const normalizedOptions = options
    .map((value) => ({ value: value.trim(), normalized: normalizeToken(value) }))
    .filter((entry) => entry.value.length > 0 && entry.normalized.length > 0);

  let best: { value: string; score: number } | null = null;
  for (const candidate of candidates) {
    for (const option of normalizedOptions) {
      const score = scoreCandidate(candidate, option.normalized);
      if (score > 0 && (!best || score > best.score)) {
        best = { value: option.value, score };
      }
    }
  }

  if (!best) {
    return null;
  }
  return {
    value: best.value,
    mode: best.score >= 95 ? "exact" : "fuzzy",
  };
}

function firstSuggestions(values: string[], limit = 4): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, limit);
}

export function suggestFolderForSmartCategory(category: SmartCategory): string {
  switch (category) {
    case "npcs":
      return "npcs";
    case "monsters":
      return "monsters";
    case "world_objects":
      return "objects";
    case "players":
      return "characters";
    case "loot":
      return "items";
    case "resources":
      return "resources";
    default:
      return "";
  }
}

export function decideSmartGlbAction(input: SmartLinkInput): SmartLinkDecision {
  const candidates = buildNameCandidates(input.fileName);
  const normalizedName = candidates[0] ?? normalizeToken(input.fileName);

  if (input.category === "npcs") {
    const npcMatch = pickBestMatch(candidates, input.choices.npcIds);
    if (npcMatch) {
      return {
        kind: "link",
        targetType: "npc_single",
        targetId: npcMatch.value,
        confidence: npcMatch.mode === "exact" ? "high" : "medium",
        reason:
          npcMatch.mode === "exact"
            ? "Dateiname passt direkt auf eine NPC-ID."
            : "Dateiname ähnelt einer NPC-ID — automatisch verknüpft.",
        suggestions: firstSuggestions(input.choices.npcIds),
        normalizedName,
      };
    }

    const roleMatch = pickBestMatch(candidates, input.choices.npcRoles);
    if (roleMatch) {
      return {
        kind: "link",
        targetType: "npc_group",
        targetId: roleMatch.value,
        confidence: roleMatch.mode === "exact" ? "high" : "medium",
        reason:
          roleMatch.mode === "exact"
            ? "Dateiname passt auf eine NPC-Rolle."
            : "Dateiname ähnelt einer NPC-Rolle — Gruppen-Link gesetzt.",
        suggestions: firstSuggestions(input.choices.npcRoles),
        normalizedName,
      };
    }

    return {
      kind: "pool_default",
      category: "npcs",
      confidence: "low",
      reason: "Keine exakte NPC-ID/Rolle gefunden — als NPC-Standard gesetzt.",
      suggestions: firstSuggestions(input.choices.npcIds),
      normalizedName,
    };
  }

  if (input.category === "monsters") {
    const monsterMatch = pickBestMatch(candidates, input.choices.monsterGroups);
    if (monsterMatch) {
      return {
        kind: "link",
        targetType: "monster_group",
        targetId: monsterMatch.value,
        confidence: monsterMatch.mode === "exact" ? "high" : "medium",
        reason:
          monsterMatch.mode === "exact"
            ? "Dateiname passt auf eine Monster-Gruppe."
            : "Dateiname ähnelt einer Monster-Gruppe.",
        suggestions: firstSuggestions(input.choices.monsterGroups),
        normalizedName,
      };
    }

    return {
      kind: "pool_default",
      category: "monsters",
      confidence: "low",
      reason: "Keine Monster-Gruppe gefunden — als Monster-Standard gesetzt.",
      suggestions: firstSuggestions(input.choices.monsterGroups),
      normalizedName,
    };
  }

  if (input.category === "world_objects") {
    const objectSingle = pickBestMatch(candidates, input.choices.worldObjectIds);
    if (objectSingle) {
      return {
        kind: "link",
        targetType: "object_single",
        targetId: objectSingle.value,
        confidence: objectSingle.mode === "exact" ? "high" : "medium",
        reason:
          objectSingle.mode === "exact"
            ? "Dateiname passt auf eine Objekt-ID."
            : "Dateiname ähnelt einer Objekt-ID.",
        suggestions: firstSuggestions(input.choices.worldObjectIds),
        normalizedName,
      };
    }

    const objectType = pickBestMatch(candidates, input.choices.objectTypes);
    if (objectType) {
      return {
        kind: "link",
        targetType: "object_group",
        targetId: objectType.value,
        confidence: objectType.mode === "exact" ? "high" : "medium",
        reason:
          objectType.mode === "exact"
            ? "Dateiname passt auf einen Objekttyp."
            : "Dateiname ähnelt einem Objekttyp.",
        suggestions: firstSuggestions(input.choices.objectTypes),
        normalizedName,
      };
    }

    return {
      kind: "pool_default",
      category: "world_objects",
      confidence: "low",
      reason: "Keine Objekt-ID/Typ gefunden — als Weltobjekt-Standard gesetzt.",
      suggestions: firstSuggestions(input.choices.worldObjectIds),
      normalizedName,
    };
  }

  // For players/loot/resources we only manage robust defaults.
  return {
    kind: "pool_default",
    category: input.category,
    confidence: "medium",
    reason: "Kategorie nutzt Standard-Mapping (keine Einzel-ID erforderlich).",
    suggestions: [],
    normalizedName,
  };
}
