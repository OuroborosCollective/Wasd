/** Client list of server-backed skills (`use_skill`); keep in sync with `server/src/modules/skill/skillDefinitions.ts`. */

export type ClientSkillInfo = {
  id: string;
  name: string;
  detail: string;
  kind: "offensive" | "self";
  /** Matches server `skillDefinitions` cooldownMs (for UI progress) */
  cooldownMs: number;
};

export const ACTIVE_COMBAT_SKILLS: ClientSkillInfo[] = [
  {
    id: "ember_bolt",
    name: "Ember Bolt",
    detail: "8 mana · 2.2s · ranged hit",
    kind: "offensive",
    cooldownMs: 2200,
  },
  {
    id: "frost_shard",
    name: "Frost Shard",
    detail: "12 mana · 3s · heavy hit",
    kind: "offensive",
    cooldownMs: 3000,
  },
  {
    id: "arc_spark",
    name: "Arc Spark",
    detail: "5 mana · 1.4s · quick zap",
    kind: "offensive",
    cooldownMs: 1400,
  },
  {
    id: "vitality_tap",
    name: "Vitality Tap",
    detail: "10 mana · 8s · heal self",
    kind: "self",
    cooldownMs: 8000,
  },
  {
    id: "shadow_tag",
    name: "Shadow Tag",
    detail: "15 mana · 4.5s · burst",
    kind: "offensive",
    cooldownMs: 4500,
  },
  {
    id: "aether_pulse",
    name: "Aether Pulse",
    detail: "18 mana · 5.5s · wave",
    kind: "offensive",
    cooldownMs: 5500,
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
