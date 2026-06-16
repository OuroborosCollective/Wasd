import fs from "node:fs";
import { resolveContentFile } from "../modules/content/contentDataRoot.js";
import type { ConflictState, GovernanceContent, LawDefinition, TerritoryDefinition, TerritoryKind } from "./GovernanceTypes.js";

const TERRITORY_KINDS = new Set<TerritoryKind>(["kingdom", "province", "settlement", "guild_overlay"]);
const CONFLICT_STATES = new Set<ConflictState>(["peace", "tension", "open_conflict"]);

function fail(file: string, message: string): never {
  throw new Error(`[GovernanceContent] ${file}: ${message}`);
}

function readJson(file: string): unknown {
  if (!fs.existsSync(file)) fail(file, "missing required game-data file");
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    const suffix = error instanceof Error ? ` (${error.message})` : "";
    fail(file, `invalid JSON${suffix}`);
  }
}

function asRecord(value: unknown, file: string, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(file, `${label} must be an object`);
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, file: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) fail(file, `${key} must be a non-empty string`);
  return value.trim();
}

function readOptionalString(record: Record<string, unknown>, key: string, file: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) fail(file, `${key} must be a non-empty string when set`);
  return value.trim();
}

function readInteger(record: Record<string, unknown>, key: string, file: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const value = Number(record[key]);
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(file, `${key} must be an integer between ${min} and ${max}`);
  return value;
}

function readBoolean(record: Record<string, unknown>, key: string, file: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") fail(file, `${key} must be boolean`);
  return value;
}

function readStringArray(record: Record<string, unknown>, key: string, file: string): readonly string[] {
  const value = record[key];
  if (!Array.isArray(value)) fail(file, `${key} must be an array`);
  return Object.freeze(value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) fail(file, `${key}[${index}] must be a non-empty string`);
    return entry.trim();
  }).sort((a, b) => a.localeCompare(b)));
}

function readTerritory(raw: unknown, file: string, index: number): TerritoryDefinition {
  const record = asRecord(raw, file, `territories[${index}]`);
  const kind = readString(record, "kind", file) as TerritoryKind;
  if (!TERRITORY_KINDS.has(kind)) fail(file, `invalid territory kind ${kind}`);
  const conflictState = readString(record, "defaultConflictState", file) as ConflictState;
  if (!CONFLICT_STATES.has(conflictState)) fail(file, `invalid conflict state ${conflictState}`);
  const budgets = asRecord(record.defaultBudgets, file, `territories[${index}].defaultBudgets`);

  return Object.freeze({
    territoryId: readString(record, "territoryId", file),
    kind,
    title: readString(record, "title", file),
    parentId: readOptionalString(record, "parentId", file),
    regionId: readString(record, "regionId", file),
    chunkKey: readString(record, "chunkKey", file),
    guildId: readOptionalString(record, "guildId", file),
    defaultTaxRatePerMille: readInteger(record, "defaultTaxRatePerMille", file, 0, 1000),
    defaultLawFlags: readStringArray(record, "defaultLawFlags", file),
    defaultBudgets: Object.freeze({
      resourceBudget: readInteger(budgets, "resourceBudget", file, 0),
      guardBudget: readInteger(budgets, "guardBudget", file, 0),
      militiaPool: readInteger(budgets, "militiaPool", file, 0),
    }),
    defaultConflictState: conflictState,
  });
}

function readLaw(raw: unknown, file: string, index: number): LawDefinition {
  const record = asRecord(raw, file, `laws[${index}]`);
  return Object.freeze({
    lawFlag: readString(record, "lawFlag", file),
    title: readString(record, "title", file),
    defaultEnabled: readBoolean(record, "defaultEnabled", file),
  });
}

export class TerritoryRegistry {
  private readonly territoryById: ReadonlyMap<string, TerritoryDefinition>;
  private readonly lawByFlag: ReadonlyMap<string, LawDefinition>;

  constructor(private readonly content: GovernanceContent = loadGovernanceContentFromGameData()) {
    this.territoryById = new Map(content.territories.map((territory) => [territory.territoryId, territory]));
    this.lawByFlag = new Map(content.laws.map((law) => [law.lawFlag, law]));
  }

  getTerritories(): readonly TerritoryDefinition[] {
    return this.content.territories;
  }

  getLaws(): readonly LawDefinition[] {
    return this.content.laws;
  }

  getTerritory(territoryId: string): TerritoryDefinition | undefined {
    return this.territoryById.get(territoryId);
  }

  hasLaw(lawFlag: string): boolean {
    return this.lawByFlag.has(lawFlag);
  }
}

export function loadGovernanceContentFromGameData(): GovernanceContent {
  const territoriesFile = resolveContentFile("governance/territories.json");
  const lawsFile = resolveContentFile("governance/laws.json");
  const territoriesRoot = asRecord(readJson(territoriesFile), territoriesFile, "territories root");
  const lawsRoot = asRecord(readJson(lawsFile), lawsFile, "laws root");
  if (readInteger(territoriesRoot, "schemaVersion", territoriesFile, 1, 1) !== 1) fail(territoriesFile, "schemaVersion must be 1");
  if (readInteger(lawsRoot, "schemaVersion", lawsFile, 1, 1) !== 1) fail(lawsFile, "schemaVersion must be 1");

  const rawTerritories = territoriesRoot.territories;
  const rawLaws = lawsRoot.laws;
  if (!Array.isArray(rawTerritories) || rawTerritories.length === 0) fail(territoriesFile, "territories must be a non-empty array");
  if (!Array.isArray(rawLaws) || rawLaws.length === 0) fail(lawsFile, "laws must be a non-empty array");

  const territories = rawTerritories.map((raw, index) => readTerritory(raw, territoriesFile, index)).sort((a, b) => a.territoryId.localeCompare(b.territoryId));
  const laws = rawLaws.map((raw, index) => readLaw(raw, lawsFile, index)).sort((a, b) => a.lawFlag.localeCompare(b.lawFlag));

  const territoryIds = new Set<string>();
  for (const territory of territories) {
    if (territoryIds.has(territory.territoryId)) fail(territoriesFile, `duplicate territoryId ${territory.territoryId}`);
    territoryIds.add(territory.territoryId);
  }

  const lawFlags = new Set(laws.map((law) => law.lawFlag));
  for (const territory of territories) {
    if (territory.parentId && !territoryIds.has(territory.parentId)) fail(territoriesFile, `${territory.territoryId} references missing parent ${territory.parentId}`);
    for (const lawFlag of territory.defaultLawFlags) {
      if (!lawFlags.has(lawFlag)) fail(territoriesFile, `${territory.territoryId} references missing law ${lawFlag}`);
    }
  }

  return Object.freeze({
    territories: Object.freeze(territories),
    laws: Object.freeze(laws),
  });
}
