/**
 * EQUIPMENT REQUIREMENT VALIDATOR
 *
 * Server-side, deterministic validation for authored equipment requirements.
 * Uses explicit server skill state only; no ambient clock, entropy, or client truth.
 */

import type { PlayerSkillState, SkillId } from "../skills/SkillTypes.js";
import { DEFAULT_SKILLS } from "../skills/SkillTypes.js";
import type { EquipmentItemDefinition } from "./EquipmentTypes.js";

const LEVEL_REQUIREMENT_SUFFIX = "_level";
const VALID_SKILL_IDS = new Set<string>(DEFAULT_SKILLS);

export interface UnmetEquipmentRequirement {
  readonly key: string;
  readonly required: number;
  readonly actual: number;
  readonly skillId?: SkillId;
}

export interface EquipmentRequirementValidationResult {
  readonly ok: boolean;
  readonly unmet: readonly UnmetEquipmentRequirement[];
}

type SkillLevelIndex = Readonly<Partial<Record<SkillId, number>>>;

function parseLevelRequirementKey(key: string): SkillId | null {
  if (!key.endsWith(LEVEL_REQUIREMENT_SUFFIX)) return null;
  const skillId = key.slice(0, -LEVEL_REQUIREMENT_SUFFIX.length);
  return VALID_SKILL_IDS.has(skillId) ? skillId as SkillId : null;
}

function buildSkillLevelIndex(state: PlayerSkillState): SkillLevelIndex {
  const index: Partial<Record<SkillId, number>> = {};

  for (const skill of state.skills) {
    index[skill.id] = Math.max(0, Math.trunc(Number(skill.level ?? 0)));
  }

  return Object.freeze(index);
}

function getSkillLevel(index: SkillLevelIndex, skillId: SkillId): number {
  return index[skillId] ?? 0;
}

export function validateEquipmentRequirements(
  definition: EquipmentItemDefinition,
  skillState: PlayerSkillState,
): EquipmentRequirementValidationResult {
  const unmet: UnmetEquipmentRequirement[] = [];
  const skillLevels = buildSkillLevelIndex(skillState);

  for (const requirement of definition.requirements ?? []) {
    const required = Math.max(0, Math.trunc(Number(requirement.value ?? 0)));
    const skillId = parseLevelRequirementKey(requirement.key);

    if (!skillId) {
      unmet.push({ key: requirement.key, required, actual: 0 });
      continue;
    }

    const actual = getSkillLevel(skillLevels, skillId);
    if (actual < required) {
      unmet.push({ key: requirement.key, skillId, required, actual });
    }
  }

  return Object.freeze({
    ok: unmet.length === 0,
    unmet: Object.freeze(unmet),
  });
}
