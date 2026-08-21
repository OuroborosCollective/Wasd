/**
 * SKILL TYPES
 *
 * Server-side skill progression types.
 * Deterministic, server-authoritative, and cap-free.
 *
 * Exact XP/level truth is persisted as canonical decimal strings. Number
 * fields remain compatibility/read-model projections only.
 */

import {
  advanceUnboundedProgression,
  normalizeProgressionState,
  progressionFromLegacyTotalXp,
  projectExactToSafeNumber,
  xpRequiredForNextLevelExact,
  type AREUnboundedProgressionState,
  type ExactIntegerInput,
} from "../core/determinism/AREUnboundedProgression.js";

export type SkillId =
  | "woodcutting"
  | "mining"
  | "fishing"
  | "combat"
  | "crafting";

export interface SkillSnapshot {
  id: SkillId;
  title: string;

  /** Compatibility projections. Exact authority lives in the *Exact fields. */
  level: number;
  xp: number;
  xpForNextLevel: number;
  progressRatio: number;

  /** Canonical, cap-free progression truth. */
  levelExact: string;
  xpExact: string;
  xpIntoLevelExact: string;
  xpForNextLevelExact: string;
  numberProjectionExact: boolean;
}

export interface PlayerSkillState {
  playerId: string;
  skills: SkillSnapshot[];
  schemaVersion: 2;
}

/** Input accepted at hydration boundaries, including legacy schema-1 saves. */
export interface PlayerSkillStateInput {
  playerId?: string;
  skills?: Array<Partial<SkillSnapshot> & { id: SkillId }>;
  schemaVersion?: number;
}

export const SKILL_TITLES: Record<SkillId, string> = {
  woodcutting: "Woodcutting",
  mining: "Mining",
  fishing: "Fishing",
  combat: "Combat",
  crafting: "Crafting",
};

export const DEFAULT_SKILLS: readonly SkillId[] = [
  "woodcutting",
  "mining",
  "fishing",
  "combat",
  "crafting",
] as const;

function binaryCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function progressionFromSkillInput(input: Partial<SkillSnapshot>): AREUnboundedProgressionState {
  if (
    typeof input.xpExact === "string" &&
    typeof input.levelExact === "string" &&
    typeof input.xpIntoLevelExact === "string"
  ) {
    return normalizeProgressionState({
      totalXp: input.xpExact,
      level: input.levelExact,
      xpIntoLevel: input.xpIntoLevelExact,
    });
  }

  const legacyXp = Number(input.xp ?? 0);
  if (!Number.isSafeInteger(legacyXp) || legacyXp < 0) {
    throw new Error("legacy skill XP must be a non-negative safe integer");
  }
  return progressionFromLegacyTotalXp(legacyXp);
}

function snapshotFromProgression(id: SkillId, progression: AREUnboundedProgressionState): SkillSnapshot {
  const totalXp = projectExactToSafeNumber(progression.totalXp);
  const level = projectExactToSafeNumber(progression.level);
  const required = xpRequiredForNextLevelExact(progression.level);
  const requiredProjection = projectExactToSafeNumber(required);

  const progressMillionths = required > 0n
    ? (progression.xpIntoLevel * 1_000_000n) / required
    : 0n;
  const progressRatio = Number(progressMillionths) / 1_000_000;

  return Object.freeze({
    id,
    title: SKILL_TITLES[id],
    level: level.value,
    xp: totalXp.value,
    xpForNextLevel: requiredProjection.value,
    progressRatio,
    levelExact: progression.level.toString(10),
    xpExact: progression.totalXp.toString(10),
    xpIntoLevelExact: progression.xpIntoLevel.toString(10),
    xpForNextLevelExact: required.toString(10),
    numberProjectionExact: totalXp.exact && level.exact && requiredProjection.exact,
  });
}

/** Exact canonical XP required to advance from level -> level + 1. */
export function xpForLevelExact(level: ExactIntegerInput): bigint {
  return xpRequiredForNextLevelExact(level);
}

/** Backwards-compatible Number projection; never progression authority. */
export function xpForLevel(level: number): number {
  return projectExactToSafeNumber(xpForLevelExact(level)).value;
}

/** Backwards-compatible migration helper for number-era total XP. */
export function levelFromXp(xp: number): number {
  if (!Number.isSafeInteger(xp) || xp < 0) return 1;
  return projectExactToSafeNumber(progressionFromLegacyTotalXp(xp).level).value;
}

/** Normalize a partial skill snapshot to a complete cap-free snapshot. */
export function normalizeSkillSnapshot(
  input: Partial<SkillSnapshot> & { id: SkillId }
): SkillSnapshot {
  return snapshotFromProgression(input.id, progressionFromSkillInput(input));
}

/** Apply exact XP to an existing skill without reconstructing level history. */
export function applySkillXp(
  skill: SkillSnapshot,
  amount: ExactIntegerInput,
): SkillSnapshot {
  const current = progressionFromSkillInput(skill);
  const advanced = advanceUnboundedProgression(current, amount);
  return snapshotFromProgression(skill.id, advanced.state);
}

/** Create default player skill state with all skills at level 1. */
export function createDefaultPlayerSkillState(playerId: string): PlayerSkillState {
  return {
    playerId,
    schemaVersion: 2,
    skills: DEFAULT_SKILLS.map((id) => normalizeSkillSnapshot({ id, xp: 0 })),
  };
}

/**
 * Normalize and migrate a player skill state. Schema-1 number-only saves are
 * accepted through the legacy XP migration path and are emitted as schema 2.
 */
export function normalizePlayerSkillState(
  input: PlayerSkillStateInput | PlayerSkillState | null | undefined,
  playerId: string
): PlayerSkillState {
  const byId = new Map<SkillId, SkillSnapshot>();

  for (const skill of input?.skills ?? []) {
    if (!skill || !DEFAULT_SKILLS.includes(skill.id as SkillId)) continue;
    byId.set(skill.id as SkillId, normalizeSkillSnapshot(skill as Partial<SkillSnapshot> & { id: SkillId }));
  }

  return {
    playerId,
    schemaVersion: 2,
    skills: DEFAULT_SKILLS.map((id) =>
      byId.get(id) ?? normalizeSkillSnapshot({ id, xp: 0 })
    ).sort((a, b) => binaryCompare(a.id, b.id)),
  };
}
