/**
 * SKILL TYPES
 *
 * Server-side skill progression types.
 * Deterministic, server-authoritative.
 *
 * Rules:
 * - No Date.now() for gameplay state
 * - No Math.random()
 * - Stable sort by id for determinism
 * - Pure normalizer functions
 */

export type SkillId =
  | "woodcutting"
  | "mining"
  | "fishing"
  | "combat"
  | "crafting";

export interface SkillSnapshot {
  id: SkillId;
  title: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  progressRatio: number;
}

export interface PlayerSkillState {
  playerId: string;
  skills: SkillSnapshot[];
  schemaVersion: 1;
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

/**
 * Calculate XP required for a given level.
 * Pure function - deterministic.
 */
export function xpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return safeLevel * safeLevel * 100;
}

/**
 * Calculate level from total XP.
 * Pure function - deterministic.
 */
export function levelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;

  while (xpForLevel(level + 1) <= safeXp) {
    level += 1;
  }

  return level;
}

/**
 * Normalize a partial skill snapshot to a complete one.
 * Pure function - no mutation of input.
 */
export function normalizeSkillSnapshot(
  input: Partial<SkillSnapshot> & { id: SkillId }
): SkillSnapshot {
  const xp = Math.max(0, Math.floor(Number(input.xp ?? 0)));
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const progressRatio = Math.max(0, Math.min(1, (xp - currentLevelXp) / span));

  return {
    id: input.id,
    title: SKILL_TITLES[input.id],
    level,
    xp,
    xpForNextLevel: nextLevelXp,
    progressRatio,
  };
}

/**
 * Create default player skill state with all skills at level 1.
 * Pure function - deterministic.
 */
export function createDefaultPlayerSkillState(playerId: string): PlayerSkillState {
  return {
    playerId,
    schemaVersion: 1,
    skills: DEFAULT_SKILLS.map((id) => normalizeSkillSnapshot({ id, xp: 0 })),
  };
}

/**
 * Normalize and validate a player skill state.
 * Fills in missing skills with defaults.
 * Pure function - no mutation of input.
 */
export function normalizePlayerSkillState(
  input: Partial<PlayerSkillState> | null | undefined,
  playerId: string
): PlayerSkillState {
  const byId = new Map<SkillId, SkillSnapshot>();

  for (const skill of input?.skills ?? []) {
    if (!skill || !DEFAULT_SKILLS.includes(skill.id)) continue;
    byId.set(skill.id, normalizeSkillSnapshot(skill));
  }

  return {
    playerId,
    schemaVersion: 1,
    skills: DEFAULT_SKILLS.map((id) =>
      byId.get(id) ?? normalizeSkillSnapshot({ id, xp: 0 })
    ).sort((a, b) => a.id.localeCompare(b.id)),
  };
}