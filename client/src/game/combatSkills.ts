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

const STORAGE_KEY = "areloria_quick_cast_skill_id";

/** Default when nothing stored or invalid */
export const DEFAULT_QUICK_CAST_SKILL_ID = "ember_bolt";

const validIds = new Set(ACTIVE_COMBAT_SKILLS.map((s) => s.id));

export function getQuickCastSkillId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.trim();
    if (raw && validIds.has(raw)) return raw;
  } catch {
    /* private mode */
  }
  return DEFAULT_QUICK_CAST_SKILL_ID;
}

export function setQuickCastSkillId(skillId: string): void {
  const id = skillId.trim();
  if (!validIds.has(id)) return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("areloria-quick-cast-changed", { detail: { skillId: id } }));
}

/** @deprecated use getQuickCastSkillId */
export const PRIMARY_QUICK_CAST_SKILL_ID = DEFAULT_QUICK_CAST_SKILL_ID;
