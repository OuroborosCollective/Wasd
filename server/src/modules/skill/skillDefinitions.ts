/** Server-side active skills (mana + cooldown). Extend as gameplay grows. */

export type SkillKind = "offensive" | "self";

export type SkillDefinition = {
  id: string;
  name: string;
  manaCost: number;
  cooldownMs: number;
  kind: SkillKind;
  /** Max distance to target NPC (2D x,y server space); ignored for self skills */
  range: number;
  /** Flat damage added on hit (before mitigation); offensive only */
  spellPower: number;
  /** Instant heal on self (capped by maxHealth); self skills only */
  healAmount?: number;
};

export const SKILL_DEFINITIONS: Record<string, SkillDefinition> = {
  ember_bolt: {
    id: "ember_bolt",
    name: "Ember Bolt",
    manaCost: 8,
    cooldownMs: 2200,
    kind: "offensive",
    range: 48,
    spellPower: 14,
  },
  frost_shard: {
    id: "frost_shard",
    name: "Frost Shard",
    manaCost: 12,
    cooldownMs: 3000,
    kind: "offensive",
    range: 45,
    spellPower: 22,
  },
  arc_spark: {
    id: "arc_spark",
    name: "Arc Spark",
    manaCost: 5,
    cooldownMs: 1400,
    kind: "offensive",
    range: 40,
    spellPower: 9,
  },
  vitality_tap: {
    id: "vitality_tap",
    name: "Vitality Tap",
    manaCost: 10,
    cooldownMs: 8000,
    kind: "self",
    range: 0,
    spellPower: 0,
    healAmount: 28,
  },
  shadow_tag: {
    id: "shadow_tag",
    name: "Shadow Tag",
    manaCost: 15,
    cooldownMs: 4500,
    kind: "offensive",
    range: 38,
    spellPower: 26,
  },
  aether_pulse: {
    id: "aether_pulse",
    name: "Aether Pulse",
    manaCost: 18,
    cooldownMs: 5500,
    kind: "offensive",
    range: 32,
    spellPower: 30,
  },
};

export function getSkillDefinition(skillId: string): SkillDefinition | undefined {
  return SKILL_DEFINITIONS[skillId];
}

export function allSkillIds(): string[] {
  return Object.keys(SKILL_DEFINITIONS);
}

/** Cooldown end timestamps (ms) still in the future — for client bars */
export function buildSkillCooldownUntilPayload(player: any, now: number): Record<string, number> {
  const out: Record<string, number> = {};
  const raw = player?.skillCooldowns;
  if (!raw || typeof raw !== "object") return out;
  for (const id of allSkillIds()) {
    const until = Number(raw[id]);
    if (Number.isFinite(until) && until > now) {
      out[id] = Math.floor(until);
    }
  }
  return out;
}
