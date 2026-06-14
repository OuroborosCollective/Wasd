/**
 * EQUIPMENT REQUIREMENT VALIDATOR
 *
 * Server-side, deterministic validation for authored equipment requirements.
 * No Date.now(), no Math.random(), no client truth.
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

function parseLevelRequirementKey(key: string): SkillId | null {
  if (!key.endsWith(LEVEL_REQUIREMENT_SUFFIX)) return null;
  const skillId = key.slice(0, -LEVEL_REQUIREMENT_SUFFIX.length);
  return VALID_SKILL_IDS.has(skillId) ? skillId as SkillId : null;
}

function getSkillLevel(state: PlayerSkillState, skillId: SkillId): number {
  const snapshot = state.skills.find((skill) => skill.id === skillId);
  return Math.max(0, Math.trunc(Number(snapshot?.level ?? 0)));
}

export function validateEquipmentRequirements(
  definition: EquipmentItemDefinition,
  skillState: PlayerSkillState,
): EquipmentRequirementValidationResult {
  const unmet: UnmetEquipmentRequirement[] = [];

  for (const requirement of definition.requirements ?? []) {
    const required = Math.max(0, Math.trunc(Number(requirement.value ?? 0)));
    const skillId = parseLevelRequirementKey(requirement.key);

    if (!skillId) {
      unmet.push({ key: requirement.key, required, actual: 0 });
      continue;
    }

    const actual = getSkillLevel(skillState, skillId);
    if (actual < required) {
      unmet.push({ key: requirement.key, skillId, required, actual });
    }
  }

  return Object.freeze({
    ok: unmet.length === 0,
    unmet: Object.freeze(unmet),
  });
}
