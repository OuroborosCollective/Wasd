export const QUEST_OBJECTIVE_TYPES = ["talk_to", "combat", "collect"] as const;

export type QuestObjectiveType = (typeof QUEST_OBJECTIVE_TYPES)[number];

export interface QuestReputationRequirement {
  readonly min?: number;
  readonly max?: number;
}

export interface QuestRewardDefinition {
  readonly gold: number;
  readonly xp: number;
  readonly itemId?: string;
}

/**
 * Canonical authored quest shape stored in game-data/quests/quests.json.
 *
 * This is authored content, not live quest progress. It must never contain
 * tick/order/actor/world authority fields.
 */
export interface QuestContentDefinition {
  readonly id: string;
  readonly title: string;
  readonly giverNpcId: string;
  readonly objectiveType: QuestObjectiveType;
  readonly targetNpcId?: string;
  readonly targetId?: string;
  readonly requiredItemId?: string;
  readonly requiredCount?: number;
  readonly prerequisiteQuestIds?: readonly string[];
  readonly requiredFlags?: readonly string[];
  readonly requiredReputation?: Readonly<Record<string, QuestReputationRequirement>>;
  readonly reward: QuestRewardDefinition;
}

export interface QuestContentReferenceContext {
  readonly npcIds: ReadonlySet<string>;
  readonly itemIds: ReadonlySet<string>;
  readonly questIds: ReadonlySet<string>;
}

export interface QuestContentValidationOptions {
  /** Existing ids are valid when validating the content file itself. */
  readonly allowExistingId?: boolean;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,119}$/;
const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "actorid",
  "canonicalintent",
  "chunkkey",
  "intenthash",
  "kappa",
  "logicalindex",
  "manifesthash",
  "receivedorder",
  "snapshothash",
  "tick",
  "tickid",
  "worldhash",
]);

function normalizedKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function rejectAuthorityFields(value: unknown, path: string, errors: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectAuthorityFields(entry, `${path}[${index}]`, errors));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_AUTHORITY_KEYS.has(normalizedKey(key))) {
      errors.push(`${path} contains forbidden authoritative field ${key}`);
    }
    rejectAuthorityFields(child, `${path}.${key}`, errors);
  }
}

export function validateQuestContentShape(value: unknown, path = "quest"): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return [`${path} must be an object`];

  rejectAuthorityFields(value, path, errors);

  if (!isNonEmptyString(value.id) || !ID_PATTERN.test(value.id)) {
    errors.push(`${path}.id must match ${ID_PATTERN}`);
  }
  if (!isNonEmptyString(value.title)) errors.push(`${path}.title must be a non-empty string`);
  if (!isNonEmptyString(value.giverNpcId)) errors.push(`${path}.giverNpcId must be a non-empty string`);
  if (!QUEST_OBJECTIVE_TYPES.includes(value.objectiveType as QuestObjectiveType)) {
    errors.push(`${path}.objectiveType must be one of ${QUEST_OBJECTIVE_TYPES.join(", ")}`);
  }

  if (!isRecord(value.reward)) {
    errors.push(`${path}.reward must be an object`);
  } else {
    if (!isNonNegativeInteger(value.reward.gold)) errors.push(`${path}.reward.gold must be an integer >= 0`);
    if (!isNonNegativeInteger(value.reward.xp)) errors.push(`${path}.reward.xp must be an integer >= 0`);
    if (value.reward.itemId !== undefined && !isNonEmptyString(value.reward.itemId)) {
      errors.push(`${path}.reward.itemId must be a non-empty string when present`);
    }
  }

  if (value.objectiveType === "talk_to" && !isNonEmptyString(value.targetNpcId)) {
    errors.push(`${path}.targetNpcId is required for talk_to objectives`);
  }
  if (value.objectiveType === "combat" && !isNonEmptyString(value.targetId)) {
    errors.push(`${path}.targetId is required for combat objectives`);
  }
  if (value.objectiveType === "collect") {
    if (!isNonEmptyString(value.requiredItemId)) errors.push(`${path}.requiredItemId is required for collect objectives`);
    if (!Number.isInteger(value.requiredCount) || Number(value.requiredCount) < 1) {
      errors.push(`${path}.requiredCount must be an integer >= 1 for collect objectives`);
    }
  }

  for (const key of ["prerequisiteQuestIds", "requiredFlags"] as const) {
    const entry = value[key];
    if (entry === undefined) continue;
    if (!Array.isArray(entry) || entry.some((item) => !isNonEmptyString(item))) {
      errors.push(`${path}.${key} must be an array of non-empty strings`);
      continue;
    }
    if (new Set(entry).size !== entry.length) errors.push(`${path}.${key} must not contain duplicates`);
  }

  if (Array.isArray(value.prerequisiteQuestIds) && isNonEmptyString(value.id) && value.prerequisiteQuestIds.includes(value.id)) {
    errors.push(`${path}.prerequisiteQuestIds must not reference the quest itself`);
  }

  if (value.requiredReputation !== undefined) {
    if (!isRecord(value.requiredReputation)) {
      errors.push(`${path}.requiredReputation must be an object`);
    } else {
      for (const [factionId, range] of Object.entries(value.requiredReputation)) {
        if (!isNonEmptyString(factionId) || !isRecord(range)) {
          errors.push(`${path}.requiredReputation.${factionId} must be an object`);
          continue;
        }
        const min = range.min;
        const max = range.max;
        if (min !== undefined && !Number.isFinite(min)) errors.push(`${path}.requiredReputation.${factionId}.min must be finite`);
        if (max !== undefined && !Number.isFinite(max)) errors.push(`${path}.requiredReputation.${factionId}.max must be finite`);
        if (Number.isFinite(min) && Number.isFinite(max) && Number(min) > Number(max)) {
          errors.push(`${path}.requiredReputation.${factionId}.min must be <= max`);
        }
      }
    }
  }

  return errors;
}

export function validateQuestContentDefinitionAgainstContext(
  value: unknown,
  context: QuestContentReferenceContext,
  options: QuestContentValidationOptions = {},
  path = "quest",
): string[] {
  const errors = validateQuestContentShape(value, path);
  if (!isRecord(value) || errors.length > 0) return errors;

  const id = String(value.id);
  if (!options.allowExistingId && context.questIds.has(id)) errors.push(`${path}.id already exists: ${id}`);

  const giverNpcId = String(value.giverNpcId);
  if (!context.npcIds.has(giverNpcId)) errors.push(`${path}.giverNpcId references missing NPC ${giverNpcId}`);

  if (isNonEmptyString(value.targetNpcId) && !context.npcIds.has(value.targetNpcId)) {
    errors.push(`${path}.targetNpcId references missing NPC ${value.targetNpcId}`);
  }
  if (value.objectiveType === "combat" && isNonEmptyString(value.targetId) && !context.npcIds.has(value.targetId)) {
    errors.push(`${path}.targetId references missing combat NPC ${value.targetId}`);
  }
  if (isNonEmptyString(value.requiredItemId) && !context.itemIds.has(value.requiredItemId)) {
    errors.push(`${path}.requiredItemId references missing item ${value.requiredItemId}`);
  }
  const reward = value.reward;
  if (isRecord(reward) && isNonEmptyString(reward.itemId) && !context.itemIds.has(reward.itemId)) {
    errors.push(`${path}.reward.itemId references missing item ${reward.itemId}`);
  }
  if (Array.isArray(value.prerequisiteQuestIds)) {
    for (const preId of value.prerequisiteQuestIds) {
      if (isNonEmptyString(preId) && !context.questIds.has(preId)) {
        errors.push(`${path}.prerequisiteQuestIds references missing quest ${preId}`);
      }
    }
  }

  return errors;
}
