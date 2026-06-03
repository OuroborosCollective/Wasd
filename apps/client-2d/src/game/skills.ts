export type SkillId = "primary" | "impact_buster" | "interact" | "pickup";

export interface SkillDefinition {
  id: SkillId;
  label: string;
  cooldownTicks: number;
}

export interface SkillState {
  id: SkillId;
  cooldownRemainingTicks: number;
}

export const SKILL_DEFINITIONS: Record<SkillId, SkillDefinition> = {
  primary: {
    id: "primary",
    label: "Hit",
    cooldownTicks: 4
  },
  impact_buster: {
    id: "impact_buster",
    label: "Impact",
    cooldownTicks: 80
  },
  interact: {
    id: "interact",
    label: "Talk",
    cooldownTicks: 5
  },
  pickup: {
    id: "pickup",
    label: "Loot",
    cooldownTicks: 5
  }
};

export function createSkillStates(): Record<SkillId, SkillState> {
  return {
    primary: {
      id: "primary",
      cooldownRemainingTicks: 0
    },
    impact_buster: {
      id: "impact_buster",
      cooldownRemainingTicks: 0
    },
    interact: {
      id: "interact",
      cooldownRemainingTicks: 0
    },
    pickup: {
      id: "pickup",
      cooldownRemainingTicks: 0
    }
  };
}

export function tickSkillCooldowns(
  skills: Record<SkillId, SkillState>
): Record<SkillId, SkillState> {
  return Object.fromEntries(
    Object.entries(skills).map(([id, state]) => [
      id,
      {
        ...state,
        cooldownRemainingTicks: Math.max(0, state.cooldownRemainingTicks - 1)
      }
    ])
  ) as Record<SkillId, SkillState>;
}

export function canUseSkill(
  skills: Record<SkillId, SkillState>,
  skillId: SkillId
): boolean {
  return skills[skillId].cooldownRemainingTicks <= 0;
}

export function triggerSkillCooldown(
  skills: Record<SkillId, SkillState>,
  skillId: SkillId
): Record<SkillId, SkillState> {
  const def = SKILL_DEFINITIONS[skillId];

  return {
    ...skills,
    [skillId]: {
      id: skillId,
      cooldownRemainingTicks: def.cooldownTicks
    }
  };
}