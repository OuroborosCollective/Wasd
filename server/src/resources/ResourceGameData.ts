import fs from "node:fs";
import { resolveContentFile } from "../modules/content/contentDataRoot.js";
import type {
  ResourceEcologyConfig,
  ResourceEcologyKindRule,
  ResourceEcologyNodeOverride,
} from "./ResourceEcologyTypes.js";
import { RESOURCE_ECOLOGY_SCHEMA_VERSION } from "./ResourceEcologyTypes.js";
import type {
  GatheringMomentumRule,
  ResourceKind,
  ResourceNodeDefinition,
  RequiredToolSlot,
} from "./ResourceTypes.js";

type GatheringSkillId = ResourceNodeDefinition["skillId"];

const RESOURCE_KINDS = new Set<ResourceKind>(["tree", "ore", "fish_spot"]);
const GATHERING_SKILLS = new Set<GatheringSkillId>(["woodcutting", "mining", "fishing"]);
const REQUIRED_TOOLS = new Set<RequiredToolSlot>([
  "woodcutting_tool",
  "mining_tool",
  "fishing_tool",
]);

function fail(file: string, message: string): never {
  throw new Error(`[ResourceGameData] ${file}: ${message}`);
}

function readJsonFile(file: string): unknown {
  if (!fs.existsSync(file)) {
    fail(file, "missing required game-data file");
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    const suffix = error instanceof Error ? ` (${error.message})` : "";
    fail(file, `invalid JSON${suffix}`);
  }
}

function asRecord(value: unknown, file: string, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(file, `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, file: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(file, `${key} must be a non-empty string`);
  }
  return value.trim();
}

function readInteger(record: Record<string, unknown>, key: string, file: string, min: number): number {
  const value = Number(record[key]);
  if (!Number.isInteger(value) || value < min) {
    fail(file, `${key} must be an integer >= ${min}`);
  }
  return value;
}

function readOptionalInteger(record: Record<string, unknown>, key: string, file: string, min: number): number | undefined {
  if (record[key] === undefined || record[key] === null) return undefined;
  return readInteger(record, key, file, min);
}

function readPermille(record: Record<string, unknown>, key: string, file: string): number {
  const value = readInteger(record, key, file, 0);
  if (value > 1000) fail(file, `${key} must be <= 1000`);
  return value;
}

function readOptionalPermille(record: Record<string, unknown>, key: string, file: string): number | undefined {
  if (record[key] === undefined || record[key] === null) return undefined;
  const value = readInteger(record, key, file, 0);
  if (value > 1000) fail(file, `${key} must be <= 1000`);
  return value;
}

function readBoolean(record: Record<string, unknown>, key: string, file: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    fail(file, `${key} must be boolean`);
  }
  return value;
}

function normalizeRequiredTool(
  record: Record<string, unknown>,
  file: string,
): RequiredToolSlot | undefined {
  const raw = record.requiredTool;
  if (raw === undefined || raw === null || raw === "") return undefined;

  const value = String(raw) as RequiredToolSlot;
  if (!REQUIRED_TOOLS.has(value)) {
    fail(file, `requiredTool must be one of ${[...REQUIRED_TOOLS].join(", ")} or null`);
  }

  return value;
}

function normalizeResourceNode(raw: unknown, index: number, file: string): ResourceNodeDefinition {
  const record = asRecord(raw, file, `resource node at index ${index}`);

  const id = readString(record, "id", file);
  const kind = readString(record, "kind", file) as ResourceKind;
  if (!RESOURCE_KINDS.has(kind)) {
    fail(file, `node ${id} has invalid kind ${kind}`);
  }

  const skillId = readString(record, "skillId", file) as GatheringSkillId;
  if (!GATHERING_SKILLS.has(skillId)) {
    fail(file, `node ${id} has invalid skillId ${skillId}`);
  }

  const position = asRecord(record.position, file, `node ${id}.position`);
  const x = readInteger(position, "x", file, -9_000_000_000);
  const y = readInteger(position, "y", file, -9_000_000_000);

  return {
    id,
    kind,
    title: readString(record, "title", file),
    skillId,
    requiredLevel: readInteger(record, "requiredLevel", file, 1),
    xpReward: readInteger(record, "xpReward", file, 1),
    itemRewardId: readString(record, "itemRewardId", file),
    itemRewardName: readString(record, "itemRewardName", file),
    respawnTicks: readInteger(record, "respawnTicks", file, 1),
    position: { x, y },
    radius: readInteger(record, "radius", file, 1),
    requiredTool: normalizeRequiredTool(record, file),
  };
}

function normalizeMomentumRule(raw: unknown, file: string): GatheringMomentumRule {
  const record = asRecord(raw, file, "gathering momentum rule");
  const schemaVersion = readInteger(record, "schemaVersion", file, 1);
  if (schemaVersion !== 1) {
    fail(file, "schemaVersion must be 1");
  }

  const appliesRaw = record.appliesToSkillIds;
  if (!Array.isArray(appliesRaw) || appliesRaw.length === 0) {
    fail(file, "appliesToSkillIds must be a non-empty array");
  }

  const appliesToSkillIds = appliesRaw.map((rawSkill, index) => {
    const skillId = String(rawSkill) as GatheringSkillId;
    if (!GATHERING_SKILLS.has(skillId)) {
      fail(file, `appliesToSkillIds[${index}] has invalid skillId ${String(rawSkill)}`);
    }
    return skillId;
  });

  const truthStatus = readString(record, "truthStatus", file) as GatheringMomentumRule["truthStatus"];
  if (!["runtime_truth", "runtime_truth_candidate", "disabled_fallback"].includes(truthStatus)) {
    fail(file, "truthStatus must be runtime_truth, runtime_truth_candidate, or disabled_fallback");
  }

  const rule: GatheringMomentumRule = {
    schemaVersion: 1,
    id: readString(record, "id", file),
    enabled: readBoolean(record, "enabled", file),
    truthStatus,
    canBecomeTruth: readBoolean(record, "canBecomeTruth", file),
    truthPath: readString(record, "truthPath", file),
    truthPromotion: readString(record, "truthPromotion", file),
    appliesToSkillIds: [...new Set(appliesToSkillIds)].sort(),
    windowTicks: readInteger(record, "windowTicks", file, 1),
    streakBonusPermille: readInteger(record, "streakBonusPermille", file, 0),
    maxStreak: readInteger(record, "maxStreak", file, 1),
    resetOnSkillChange: readBoolean(record, "resetOnSkillChange", file),
  };

  if (rule.enabled && !rule.canBecomeTruth) {
    fail(file, "enabled momentum rule must declare canBecomeTruth=true");
  }

  if (rule.enabled && rule.truthStatus !== "runtime_truth") {
    fail(file, "enabled momentum rule must declare truthStatus=runtime_truth");
  }

  return Object.freeze(rule);
}

function normalizeEcologyRule(raw: unknown, index: number, file: string): ResourceEcologyKindRule {
  const record = asRecord(raw, file, `resource ecology rule at index ${index}`);
  const kind = readString(record, "kind", file) as ResourceKind;
  if (!RESOURCE_KINDS.has(kind)) fail(file, `invalid ecology kind ${kind}`);

  const capacity = readInteger(record, "capacity", file, 1);
  const initialStock = readOptionalInteger(record, "initialStock", file, 0);
  const collapseThreshold = readInteger(record, "collapseThreshold", file, 0);
  if (initialStock !== undefined && initialStock > capacity) fail(file, `${kind}.initialStock must be <= capacity`);
  if (collapseThreshold > capacity) fail(file, `${kind}.collapseThreshold must be <= capacity`);

  return Object.freeze({
    kind,
    capacity,
    initialStock,
    regenPerTick: readInteger(record, "regenPerTick", file, 0),
    extractionUnits: readInteger(record, "extractionUnits", file, 1),
    extractionPressurePermille: readPermille(record, "extractionPressurePermille", file),
    pressureDecayPermillePerTick: readPermille(record, "pressureDecayPermillePerTick", file),
    collapseThreshold,
    collapseRegenPermille: readPermille(record, "collapseRegenPermille", file),
  });
}

function normalizeEcologyOverride(raw: unknown, index: number, file: string): ResourceEcologyNodeOverride {
  const record = asRecord(raw, file, `resource ecology override at index ${index}`);
  return Object.freeze({
    nodeId: readString(record, "nodeId", file),
    capacity: readOptionalInteger(record, "capacity", file, 1),
    initialStock: readOptionalInteger(record, "initialStock", file, 0),
    regenPerTick: readOptionalInteger(record, "regenPerTick", file, 0),
    extractionUnits: readOptionalInteger(record, "extractionUnits", file, 1),
    extractionPressurePermille: readOptionalPermille(record, "extractionPressurePermille", file),
    pressureDecayPermillePerTick: readOptionalPermille(record, "pressureDecayPermillePerTick", file),
    collapseThreshold: readOptionalInteger(record, "collapseThreshold", file, 0),
    collapseRegenPermille: readOptionalPermille(record, "collapseRegenPermille", file),
  });
}

function normalizeEcologyConfig(raw: unknown, file: string): ResourceEcologyConfig {
  const record = asRecord(raw, file, "resource ecology config");
  const schemaVersion = readInteger(record, "schemaVersion", file, 1);
  if (schemaVersion !== RESOURCE_ECOLOGY_SCHEMA_VERSION) fail(file, "schemaVersion must be 1");

  const rulesRaw = record.kindRules;
  if (!Array.isArray(rulesRaw) || rulesRaw.length === 0) fail(file, "kindRules must be a non-empty array");
  const seenKinds = new Set<ResourceKind>();
  const kindRules = rulesRaw.map((entry, index) => {
    const rule = normalizeEcologyRule(entry, index, file);
    if (seenKinds.has(rule.kind)) fail(file, `duplicate ecology kind ${rule.kind}`);
    seenKinds.add(rule.kind);
    return rule;
  });

  for (const kind of RESOURCE_KINDS) {
    if (!seenKinds.has(kind)) fail(file, `missing ecology rule for kind ${kind}`);
  }

  const overridesRaw = record.nodeOverrides ?? [];
  if (!Array.isArray(overridesRaw)) fail(file, "nodeOverrides must be an array");
  const seenOverrides = new Set<string>();
  const nodeOverrides = overridesRaw.map((entry, index) => {
    const override = normalizeEcologyOverride(entry, index, file);
    if (seenOverrides.has(override.nodeId)) fail(file, `duplicate ecology override for node ${override.nodeId}`);
    seenOverrides.add(override.nodeId);
    return override;
  });

  return Object.freeze({
    schemaVersion: RESOURCE_ECOLOGY_SCHEMA_VERSION,
    tickCadence: readInteger(record, "tickCadence", file, 1),
    // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
    kindRules: Object.freeze(kindRules.sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0))),
    nodeOverrides: Object.freeze(nodeOverrides.sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0))),
  });
}

export function loadResourceNodeDefinitionsFromGameData(): readonly ResourceNodeDefinition[] {
  const file = resolveContentFile("resources/resource-nodes.json");
  const raw = readJsonFile(file);

  if (!Array.isArray(raw)) {
    fail(file, "root must be an array of resource node definitions");
  }

  const seen = new Set<string>();
  const nodes = raw.map((entry, index) => {
    const node = normalizeResourceNode(entry, index, file);
    if (seen.has(node.id)) {
      fail(file, `duplicate resource node id ${node.id}`);
    }
    seen.add(node.id);
    return node;
  });

  // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
  return Object.freeze(nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
}

export function loadGatheringMomentumRuleFromGameData(): GatheringMomentumRule {
  const file = resolveContentFile("resources/gathering-momentum.json");
  return normalizeMomentumRule(readJsonFile(file), file);
}

export function loadResourceEcologyConfigFromGameData(): ResourceEcologyConfig {
  const file = resolveContentFile("resources/resource-ecology.json");
  return normalizeEcologyConfig(readJsonFile(file), file);
}
