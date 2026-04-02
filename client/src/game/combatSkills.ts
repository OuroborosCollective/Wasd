/** Client list of server-backed skills (`use_skill`); keep in sync with `server/src/modules/skill/skillDefinitions.ts`. */

export type ClientSkillInfo = {
  id: string;
  name: string;
  detail: string;
};

export const ACTIVE_COMBAT_SKILLS: ClientSkillInfo[] = [
  {
    id: "ember_bolt",
    name: "Ember Bolt",
    detail: "8 mana · 2.2s cooldown · ranged magic hit",
  },
  {
    id: "frost_shard",
    name: "Frost Shard",
    detail: "12 mana · 3s cooldown · heavier magic hit",
  },
];

/** Default for keyboard shortcut + mobile quick-cast */
export const PRIMARY_QUICK_CAST_SKILL_ID = "ember_bolt";
