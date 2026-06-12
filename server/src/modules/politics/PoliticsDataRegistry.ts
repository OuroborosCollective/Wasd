import fs from "node:fs";
import { resolveContentFile, getContentDataSourceLabel } from "../content/contentDataRoot.js";

export type GovernmentTypeId = "monarchy" | "council" | "theocracy" | "trade_republic" | "warband" | string;
export type DiplomacyTypeId = "alliance" | "trade" | "non_aggression" | "tribute" | "sanction" | string;

export interface GovernmentTypeDefinition {
  id: GovernmentTypeId;
  label: string;
  succession: string;
  stabilityBase: number;
  electionCycleTicks: number;
  taxAuthority: string;
  warAuthority: string;
  tradeBias: number;
  warBias: number;
  civicRights: string[];
  description: string;
}

export interface DiplomacyTypeDefinition {
  id: DiplomacyTypeId;
  label: string;
  relationDelta: number;
  tradeModifier: number;
  warRiskModifier: number;
  tributeModifier: number;
  minimumTrust: number;
  defaultDurationTicks: number;
  breakPenalty: number;
  description: string;
}

export type GovernmentTypeRegistry = Readonly<Record<string, Readonly<GovernmentTypeDefinition>>>;
export type DiplomacyTypeRegistry = Readonly<Record<string, Readonly<DiplomacyTypeDefinition>>>;

export interface PoliticsDataSnapshot {
  governmentTypes: GovernmentTypeRegistry;
  diplomacyTypes: DiplomacyTypeRegistry;
  source: ReturnType<typeof getContentDataSourceLabel>;
}

const DEFAULT_GOVERNMENT_TYPES: Record<string, GovernmentTypeDefinition> = {
  monarchy: {
    id: "monarchy",
    label: "Monarchy",
    succession: "inheritance",
    stabilityBase: 0.7,
    electionCycleTicks: 0,
    taxAuthority: "crown",
    warAuthority: "ruler",
    tradeBias: 0.35,
    warBias: 0.45,
    civicRights: ["petition", "guild_charter"],
    description: "Hereditary ruler with high continuity, fast wartime decisions, and limited civic voting.",
  },
  council: {
    id: "council",
    label: "Council",
    succession: "vote",
    stabilityBase: 0.6,
    electionCycleTicks: 72000,
    taxAuthority: "council_vote",
    warAuthority: "council_vote",
    tradeBias: 0.55,
    warBias: 0.25,
    civicRights: ["petition", "vote", "guild_charter", "public_hearing"],
    description: "Shared civic rule with slower decisions, broader legitimacy, and stronger settlement diplomacy.",
  },
  theocracy: {
    id: "theocracy",
    label: "Theocracy",
    succession: "religious_selection",
    stabilityBase: 0.65,
    electionCycleTicks: 0,
    taxAuthority: "temple",
    warAuthority: "doctrine",
    tradeBias: 0.25,
    warBias: 0.35,
    civicRights: ["petition", "sanctuary"],
    description: "Doctrine-led rule with strong internal cohesion and faith-bound diplomatic pressure.",
  },
  trade_republic: {
    id: "trade_republic",
    label: "Trade Republic",
    succession: "merchant_vote",
    stabilityBase: 0.55,
    electionCycleTicks: 54000,
    taxAuthority: "merchant_senate",
    warAuthority: "senate_contract",
    tradeBias: 0.85,
    warBias: 0.15,
    civicRights: ["petition", "vote", "guild_charter", "market_contract"],
    description: "Merchant-led government optimized for trade routes, contracts, tariffs, and diplomacy.",
  },
  warband: {
    id: "warband",
    label: "Warband",
    succession: "strength",
    stabilityBase: 0.4,
    electionCycleTicks: 0,
    taxAuthority: "tribute",
    warAuthority: "chieftain",
    tradeBias: 0.1,
    warBias: 0.9,
    civicRights: ["challenge", "spoils_claim"],
    description: "Force-based rule with low stability, high aggression, and tribute-driven diplomacy.",
  },
};

const DEFAULT_DIPLOMACY_TYPES: Record<string, DiplomacyTypeDefinition> = {
  alliance: {
    id: "alliance",
    label: "Alliance",
    relationDelta: 35,
    tradeModifier: 0.15,
    warRiskModifier: -0.3,
    tributeModifier: 0,
    minimumTrust: 65,
    defaultDurationTicks: 108000,
    breakPenalty: 25,
    description: "Mutual-defense pact that reduces war pressure and improves trade confidence.",
  },
  trade: {
    id: "trade",
    label: "Trade Pact",
    relationDelta: 20,
    tradeModifier: 0.35,
    warRiskModifier: -0.1,
    tributeModifier: 0,
    minimumTrust: 45,
    defaultDurationTicks: 72000,
    breakPenalty: 12,
    description: "Economic treaty for safer trade routes, tariffs, and shared market access.",
  },
  non_aggression: {
    id: "non_aggression",
    label: "Non-Aggression Pact",
    relationDelta: 15,
    tradeModifier: 0.05,
    warRiskModifier: -0.45,
    tributeModifier: 0,
    minimumTrust: 35,
    defaultDurationTicks: 54000,
    breakPenalty: 18,
    description: "Limited peace treaty that strongly reduces conflict escalation without requiring alliance duties.",
  },
  tribute: {
    id: "tribute",
    label: "Tribute Treaty",
    relationDelta: -5,
    tradeModifier: -0.05,
    warRiskModifier: -0.2,
    tributeModifier: 0.25,
    minimumTrust: 10,
    defaultDurationTicks: 36000,
    breakPenalty: 8,
    description: "Asymmetric settlement where one side pays tribute to delay war or secure protection.",
  },
  sanction: {
    id: "sanction",
    label: "Sanction",
    relationDelta: -25,
    tradeModifier: -0.4,
    warRiskModifier: 0.2,
    tributeModifier: 0,
    minimumTrust: 0,
    defaultDurationTicks: 36000,
    breakPenalty: 0,
    description: "Hostile diplomatic pressure that damages trade and increases escalation risk.",
  },
};

let cachedGovernmentTypes: GovernmentTypeRegistry | null = null;
let cachedDiplomacyTypes: DiplomacyTypeRegistry | null = null;

export function getGovernmentTypes(): GovernmentTypeRegistry {
  cachedGovernmentTypes ??= freezeRegistry(
    loadRegistry("politics/government-types.json", DEFAULT_GOVERNMENT_TYPES, normalizeGovernmentType),
  );
  return cachedGovernmentTypes;
}

export function getDiplomacyTypes(): DiplomacyTypeRegistry {
  cachedDiplomacyTypes ??= freezeRegistry(
    loadRegistry("politics/diplomacy-types.json", DEFAULT_DIPLOMACY_TYPES, normalizeDiplomacyType),
  );
  return cachedDiplomacyTypes;
}

export function listGovernmentTypes(): readonly Readonly<GovernmentTypeDefinition>[] {
  return Object.values(getGovernmentTypes());
}

export function listDiplomacyTypes(): readonly Readonly<DiplomacyTypeDefinition>[] {
  return Object.values(getDiplomacyTypes());
}

export function getGovernmentType(id: GovernmentTypeId, fallback: GovernmentTypeId = "council"): Readonly<GovernmentTypeDefinition> {
  const registry = getGovernmentTypes();
  return registry[id] ?? registry[fallback] ?? registry.council;
}

export function getDiplomacyType(id: DiplomacyTypeId, fallback: DiplomacyTypeId = "non_aggression"): Readonly<DiplomacyTypeDefinition> {
  const registry = getDiplomacyTypes();
  return registry[id] ?? registry[fallback] ?? registry.non_aggression;
}

export function getPoliticsDataSnapshot(): PoliticsDataSnapshot {
  return Object.freeze({
    governmentTypes: getGovernmentTypes(),
    diplomacyTypes: getDiplomacyTypes(),
    source: getContentDataSourceLabel(),
  });
}

/**
 * Deterministic compatibility score for AI/NPC/settlement decisions.
 * This is module logic: it consumes game-data, but does not mutate it.
 */
export function scoreGovernmentDiplomacyFit(
  governmentId: GovernmentTypeId,
  diplomacyId: DiplomacyTypeId,
): number {
  const government = getGovernmentType(governmentId);
  const diplomacy = getDiplomacyType(diplomacyId);

  const tradeFit = government.tradeBias * Math.max(0, diplomacy.tradeModifier + 0.5);
  const warPressure = government.warBias * Math.max(0, diplomacy.warRiskModifier + 0.5);
  const stabilityFit = government.stabilityBase * (diplomacy.minimumTrust / 100);
  const tributeFit = diplomacy.tributeModifier > 0 ? government.warBias * diplomacy.tributeModifier : 0;

  return clamp01((tradeFit + stabilityFit + tributeFit + (1 - warPressure)) / 3);
}

export function resetPoliticsDataRegistryForTests(): void {
  cachedGovernmentTypes = null;
  cachedDiplomacyTypes = null;
}

function loadRegistry<T extends { id: string }>(
  relativePath: string,
  fallback: Record<string, T>,
  normalize: (key: string, value: unknown, fallbackValue: T) => T,
): Record<string, T> {
  const parsed = readJsonRecord(resolveContentFile(relativePath));
  const source = parsed ?? fallback;
  const output: Record<string, T> = {};

  for (const key of Object.keys(source).sort(compareText)) {
    const fallbackValue = fallback[key] ?? Object.values(fallback)[0];
    output[key] = normalize(key, source[key], fallbackValue);
  }

  return output;
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeGovernmentType(
  key: string,
  value: unknown,
  fallback: GovernmentTypeDefinition,
): GovernmentTypeDefinition {
  const record = isPlainRecord(value) ? value : {};
  return {
    id: sanitizeId(record.id, key),
    label: sanitizeText(record.label, fallback.label),
    succession: sanitizeText(record.succession, fallback.succession),
    stabilityBase: clamp01(readNumber(record.stabilityBase, fallback.stabilityBase)),
    electionCycleTicks: readNonNegativeInteger(record.electionCycleTicks, fallback.electionCycleTicks),
    taxAuthority: sanitizeText(record.taxAuthority, fallback.taxAuthority),
    warAuthority: sanitizeText(record.warAuthority, fallback.warAuthority),
    tradeBias: clamp01(readNumber(record.tradeBias, fallback.tradeBias)),
    warBias: clamp01(readNumber(record.warBias, fallback.warBias)),
    civicRights: sanitizeStringArray(record.civicRights, fallback.civicRights),
    description: sanitizeText(record.description, fallback.description),
  };
}

function normalizeDiplomacyType(
  key: string,
  value: unknown,
  fallback: DiplomacyTypeDefinition,
): DiplomacyTypeDefinition {
  const record = isPlainRecord(value) ? value : {};
  return {
    id: sanitizeId(record.id, key),
    label: sanitizeText(record.label, fallback.label),
    relationDelta: clamp(readNumber(record.relationDelta, fallback.relationDelta), -100, 100),
    tradeModifier: clamp(readNumber(record.tradeModifier, fallback.tradeModifier), -1, 1),
    warRiskModifier: clamp(readNumber(record.warRiskModifier, fallback.warRiskModifier), -1, 1),
    tributeModifier: clamp(readNumber(record.tributeModifier, fallback.tributeModifier), -1, 1),
    minimumTrust: clamp(readNumber(record.minimumTrust, fallback.minimumTrust), 0, 100),
    defaultDurationTicks: readNonNegativeInteger(record.defaultDurationTicks, fallback.defaultDurationTicks),
    breakPenalty: clamp(readNumber(record.breakPenalty, fallback.breakPenalty), 0, 100),
    description: sanitizeText(record.description, fallback.description),
  };
}

function freezeRegistry<T extends Record<string, object>>(registry: T): Readonly<T> {
  for (const key of Object.keys(registry)) Object.freeze(registry[key]);
  return Object.freeze(registry);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitizeId(value: unknown, fallback: string): string {
  const text = sanitizeText(value, fallback);
  return text.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sanitizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function sanitizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const output = value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
    .sort(compareText);
  return output.length > 0 ? output : [...fallback];
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readNonNegativeInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
