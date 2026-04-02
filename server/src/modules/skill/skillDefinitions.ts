/** Server-side active skills (mana + cooldown). Extend as gameplay grows. */

export type SkillDefinition = {
  id: string;
  name: string;
  manaCost: number;
  cooldownMs: number;
  /** Max distance to target NPC (2D x,y server space) */
  range: number;
  /** Flat damage added on hit (before mitigation) */
  spellPower: number;
};

export const SKILL_DEFINITIONS: Record<string, SkillDefinition> = {
  ember_bolt: {
    id: "ember_bolt",
    name: "Ember Bolt",
    manaCost: 8,
    cooldownMs: 2200,
    range: 48,
    spellPower: 14,
  },
};

export function getSkillDefinition(skillId: string): SkillDefinition | undefined {
  return SKILL_DEFINITIONS[skillId];
}
