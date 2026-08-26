import type { LiveGameplaySkillState } from "../LiveGameplaySnapshotTypes.js";

export interface LegacySkillSnapshotLike {
  readonly id?: string;
  readonly skillId?: string;
  readonly xp?: number;
  readonly level?: number;
  readonly xpExact?: string;
  readonly levelExact?: string;
  readonly xpIntoLevelExact?: string;
  readonly xpForNextLevelExact?: string;
  readonly numberProjectionExact?: boolean;
}

function canonicalNonNegativeExact(value: unknown, allowZero = true): string | undefined {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) return undefined;
  if (!allowZero && value === "0") return undefined;
  return value;
}

/**
 * Read-only projection from legacy/compatibility skill snapshots into the live
 * gameplay contract. Exact decimal strings are preserved only when canonical;
 * malformed values are omitted rather than promoted to exact truth.
 */
export function toLiveSkillStateFromLegacy(skill: LegacySkillSnapshotLike): LiveGameplaySkillState {
  const xpExact = canonicalNonNegativeExact(skill.xpExact);
  const levelExact = canonicalNonNegativeExact(skill.levelExact, false);
  const xpIntoLevelExact = canonicalNonNegativeExact(skill.xpIntoLevelExact);
  const xpForNextLevelExact = canonicalNonNegativeExact(skill.xpForNextLevelExact, false);

  return Object.freeze({
    skillId: String(skill.skillId ?? skill.id ?? "unknown_skill"),
    xp: Math.max(0, Math.floor(Number(skill.xp ?? 0))),
    level: Math.max(1, Math.floor(Number(skill.level ?? 1))),
    ...(xpExact ? { xpExact } : {}),
    ...(levelExact ? { levelExact } : {}),
    ...(xpIntoLevelExact ? { xpIntoLevelExact } : {}),
    ...(xpForNextLevelExact ? { xpForNextLevelExact } : {}),
    ...(typeof skill.numberProjectionExact === "boolean"
      ? { numberProjectionExact: skill.numberProjectionExact }
      : {}),
  });
}
