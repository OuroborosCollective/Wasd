/**
 * RESOURCE GAME DATA LOADER
 *
 * Loads deterministic gathering truth from the active content root.
 * No Math.random(), no Date.now(), no wall-clock state.
 */

import fs from "node:fs";
import { resolveContentFile } from "../modules/content/contentDataRoot.js";
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

  return Object.freeze(nodes.sort((a, b) => a.id.localeCompare(b.id)));
}

export function loadGatheringMomentumRuleFromGameData(): GatheringMomentumRule {
  const file = resolveContentFile("resources/gathering-momentum.json");
  return normalizeMomentumRule(readJsonFile(file), file);
}
