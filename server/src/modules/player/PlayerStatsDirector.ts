/**
 * PlayerStatsDirector — Server-Authoritative Skill/XP State
 *
 * Arelorian progression is endless: no level cap or safety ceiling is allowed
 * in canonical skill truth. Exact XP/levels are stored as decimal bigint
 * strings; Number fields are compatibility/read-model projections only.
 */

import { type XPGainEvent } from "../combat/CombatDirector.js";
import {
  advanceUnboundedProgression,
  normalizeProgressionState,
  progressionFromLegacyTotalXp,
  projectExactToSafeNumber,
  xpRequiredForNextLevelExact,
  type AREUnboundedProgressionState,
} from "../../core/determinism/AREUnboundedProgression.js";

export type CoreStatKey = "strength" | "agility" | "intelligence";

export interface CoreStats {
  strength: number;
  agility: number;
  intelligence: number;
}

export interface StatAllocationIntent {
  intent: "stat_alloc";
  playerId: string;
  stat: CoreStatKey;
  tick: number;
}

export interface SkillState {
  /** Compatibility projections; use exact fields for authority. */
  xp: number;
  level: number;
  xpExact?: string;
  levelExact?: string;
  xpIntoLevelExact?: string;
  numberProjectionExact?: boolean;
}

export interface SkillSnapshot extends SkillState {
  nextLevelXP: number;
  nextLevelXPExact: string;
  progressPercent: number;
}

export interface PlayerRuntimeState {
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
  stamina?: number;
  maxStamina?: number;
  gold?: number;
  level?: number;
}

export interface PlayerStatsSnapshot {
  playerId: string;
  skills: Record<string, SkillSnapshot>;
  coreStats: CoreStats;
  unspentStatPoints: number;
  totalLevel: number;
  totalLevelExact: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  gold: number;
  level: number;
}

export interface StatAllocationResult {
  success: boolean;
  reason?:
    | "INVALID_INTENT"
    | "INVALID_PLAYER"
    | "INVALID_STAT"
    | "INVALID_TICK"
    | "NO_UNSPENT_POINTS";
}

export interface ApplyXPResult {
  accepted: boolean;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  xpApplied: number;
  oldLevelExact?: string;
  newLevelExact?: string;
  levelsGainedExact?: string;
  xpAppliedExact?: string;
  reason?: "INVALID_PLAYER" | "INVALID_SKILL" | "INVALID_XP";
}

const STAT_POINTS_PER_LEVEL = 5;

const DEFAULT_CORE_STATS: CoreStats = {
  strength: 10,
  agility: 10,
  intelligence: 10,
};

const DEFAULT_SKILL_IDS = [
  "sword_mastery",
  "blunt_force",
  "archery",
  "heavy_armor",
  "evasion",
  "shield_wall",
  "combat",
  "carpentry",
  "smithing",
  "alchemy",
  "mining",
  "woodcutting",
  "fishing",
  "cooking",
] as const;

function isValidPlayerId(playerId: string): boolean {
  return typeof playerId === "string" && playerId.trim().length > 0;
}

function isValidSkillId(skillId: string): boolean {
  return typeof skillId === "string" && /^[a-zA-Z0-9_:-]+$/.test(skillId);
}

function isCoreStatKey(value: unknown): value is CoreStatKey {
  return value === "strength" || value === "agility" || value === "intelligence";
}

function progressionFromSkill(skill: Partial<SkillState> | undefined): AREUnboundedProgressionState {
  if (
    typeof skill?.xpExact === "string" &&
    typeof skill?.levelExact === "string" &&
    typeof skill?.xpIntoLevelExact === "string"
  ) {
    return normalizeProgressionState({
      totalXp: skill.xpExact,
      level: skill.levelExact,
      xpIntoLevel: skill.xpIntoLevelExact,
    });
  }

  const xp = Number(skill?.xp ?? 0);
  if (!Number.isSafeInteger(xp) || xp < 0) {
    return progressionFromLegacyTotalXp(0);
  }
  return progressionFromLegacyTotalXp(xp);
}

function skillStateFromProgression(progression: AREUnboundedProgressionState): SkillState {
  const xpProjection = projectExactToSafeNumber(progression.totalXp);
  const levelProjection = projectExactToSafeNumber(progression.level);
  return {
    xp: xpProjection.value,
    level: levelProjection.value,
    xpExact: progression.totalXp.toString(10),
    levelExact: progression.level.toString(10),
    xpIntoLevelExact: progression.xpIntoLevel.toString(10),
    numberProjectionExact: xpProjection.exact && levelProjection.exact,
  };
}

function defaultSkillMap(): Record<string, SkillState> {
  const result: Record<string, SkillState> = {};
  for (const skillId of DEFAULT_SKILL_IDS) {
    result[skillId] = skillStateFromProgression(progressionFromLegacyTotalXp(0));
  }
  return result;
}

function cloneCoreStats(stats: CoreStats): CoreStats {
  return {
    strength: stats.strength,
    agility: stats.agility,
    intelligence: stats.intelligence,
  };
}

function cloneSkillStateMap(skills: Record<string, SkillState>): Record<string, SkillState> {
  const cloned: Record<string, SkillState> = {};
  for (const [skillId, skill] of Object.entries(skills)) {
    cloned[skillId] = skillStateFromProgression(progressionFromSkill(skill));
  }
  return cloned;
}

/** Exact canonical XP required to advance currentLevel -> currentLevel + 1. */
export function xpForLevelExact(currentLevel: number | string | bigint): bigint {
  return xpRequiredForNextLevelExact(currentLevel);
}

/** Compatibility Number projection; not progression authority. */
export function xpForLevel(currentLevel: number): number {
  if (!Number.isSafeInteger(currentLevel) || currentLevel < 1) return 50;
  return projectExactToSafeNumber(xpForLevelExact(currentLevel)).value;
}

/** Legacy helper retained for callers/tests; not used on the hot XP path. */
export function totalXpForLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level <= 1) return 0;
  let total = 0n;
  for (let current = 1n; current < BigInt(level); current += 1n) {
    total += xpRequiredForNextLevelExact(current);
  }
  return projectExactToSafeNumber(total).value;
}

/** Legacy Number migration helper. Exact runtime advancement never uses this. */
export function levelFromXp(totalXp: number): number {
  if (!Number.isSafeInteger(totalXp) || totalXp <= 0) return 1;
  return projectExactToSafeNumber(progressionFromLegacyTotalXp(totalXp).level).value;
}

export class PlayerStatsDirector {
  private playerSkills: Map<string, Record<string, SkillState>> = new Map();
  private playerCoreStats: Map<string, { stats: CoreStats; unspentPoints: number }> = new Map();
  private broadcastToPlayer:
    | ((playerId: string, event: string, payload: PlayerStatsSnapshot) => void)
    | null = null;
  private pendingXPEvents: XPGainEvent[] = [];

  private get pendingXPevents(): XPGainEvent[] {
    return this.pendingXPEvents;
  }

  private set pendingXPevents(events: XPGainEvent[]) {
    this.pendingXPEvents = events;
  }

  public setBroadcastFn(
    fn: (playerId: string, event: string, payload: PlayerStatsSnapshot) => void,
  ): void {
    this.broadcastToPlayer = fn;
  }

  public drainXPevents(): XPGainEvent[] {
    const events = this.pendingXPevents;
    this.pendingXPevents = [];
    return events;
  }

  public queueXPevents(events: XPGainEvent[]): void {
    for (const event of events) {
      if (event) this.pendingXPevents.push(event);
    }
  }

  public processXPevents(events: XPGainEvent[]): void {
    const playerXPGains = new Map<string, Map<string, number>>();

    for (const event of events) {
      if (!event || !isValidPlayerId(event.playerId) || !isValidSkillId(event.skillId)) continue;
      if (!Number.isSafeInteger(event.amount) || event.amount <= 0) continue;

      let skillGains = playerXPGains.get(event.playerId);
      if (!skillGains) {
        skillGains = new Map<string, number>();
        playerXPGains.set(event.playerId, skillGains);
      }
      skillGains.set(event.skillId, (skillGains.get(event.skillId) ?? 0) + event.amount);
    }

    for (const [playerId, skillGains] of playerXPGains) {
      for (const [skillId, amount] of skillGains) {
        this.applyXP(playerId, skillId, amount);
      }
      this.broadcastSnapshot(playerId);
    }
  }

  public applyXP(playerId: string, skillId: string, amount: number): ApplyXPResult {
    if (!isValidPlayerId(playerId)) {
      return { accepted: false, leveledUp: false, oldLevel: 1, newLevel: 1, levelsGained: 0, xpApplied: 0, reason: "INVALID_PLAYER" };
    }
    if (!isValidSkillId(skillId)) {
      return { accepted: false, leveledUp: false, oldLevel: 1, newLevel: 1, levelsGained: 0, xpApplied: 0, reason: "INVALID_SKILL" };
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      const existing = progressionFromSkill(this.getOrCreateSkills(playerId)[skillId]);
      const level = projectExactToSafeNumber(existing.level).value;
      return {
        accepted: false,
        leveledUp: false,
        oldLevel: level,
        newLevel: level,
        levelsGained: 0,
        xpApplied: 0,
        oldLevelExact: existing.level.toString(10),
        newLevelExact: existing.level.toString(10),
        levelsGainedExact: "0",
        xpAppliedExact: "0",
        reason: "INVALID_XP",
      };
    }

    const skills = this.getOrCreateSkills(playerId);
    const current = progressionFromSkill(skills[skillId]);
    const advanced = advanceUnboundedProgression(current, amount);
    skills[skillId] = skillStateFromProgression(advanced.state);

    const oldLevel = projectExactToSafeNumber(current.level);
    const newLevel = projectExactToSafeNumber(advanced.state.level);
    const levelsGained = projectExactToSafeNumber(advanced.levelsGained);

    if (advanced.levelsGained > 0n) {
      const awarded = advanced.levelsGained * BigInt(STAT_POINTS_PER_LEVEL);
      const awardedProjection = projectExactToSafeNumber(awarded);
      if (!awardedProjection.exact) {
        throw new Error("stat point projection exceeded safe integer range; exact stat bank migration required");
      }
      this.awardStatPoints(playerId, awardedProjection.value);
    }

    return {
      accepted: true,
      leveledUp: advanced.levelsGained > 0n,
      oldLevel: oldLevel.value,
      newLevel: newLevel.value,
      levelsGained: levelsGained.value,
      xpApplied: amount,
      oldLevelExact: current.level.toString(10),
      newLevelExact: advanced.state.level.toString(10),
      levelsGainedExact: advanced.levelsGained.toString(10),
      xpAppliedExact: advanced.xpApplied.toString(10),
    };
  }

  public getOrCreateCoreStats(playerId: string): { stats: CoreStats; unspentPoints: number } {
    if (!this.playerCoreStats.has(playerId)) {
      this.playerCoreStats.set(playerId, { stats: cloneCoreStats(DEFAULT_CORE_STATS), unspentPoints: 0 });
    }
    return this.playerCoreStats.get(playerId)!;
  }

  public handleStatAllocation(intent: StatAllocationIntent): StatAllocationResult {
    if (!intent || intent.intent !== "stat_alloc") return { success: false, reason: "INVALID_INTENT" };
    const { playerId, stat, tick } = intent;
    if (!isValidPlayerId(playerId)) return { success: false, reason: "INVALID_PLAYER" };
    if (!Number.isFinite(tick) || tick < 0) return { success: false, reason: "INVALID_TICK" };
    if (!isCoreStatKey(stat)) return { success: false, reason: "INVALID_STAT" };

    const playerStats = this.getOrCreateCoreStats(playerId);
    if (playerStats.unspentPoints <= 0) return { success: false, reason: "NO_UNSPENT_POINTS" };
    playerStats.stats[stat] += 1;
    playerStats.unspentPoints -= 1;
    this.broadcastSnapshot(playerId);
    return { success: true };
  }

  public awardStatPoints(playerId: string, amount: number = STAT_POINTS_PER_LEVEL): void {
    if (!isValidPlayerId(playerId) || !Number.isSafeInteger(amount) || amount <= 0) return;
    const playerStats = this.getOrCreateCoreStats(playerId);
    if (!Number.isSafeInteger(playerStats.unspentPoints + amount)) {
      throw new Error("unspent stat points exceeded safe integer range");
    }
    playerStats.unspentPoints += amount;
  }

  public getCoreStats(playerId: string): CoreStats {
    return cloneCoreStats(this.getOrCreateCoreStats(playerId).stats);
  }

  public getUnspentPoints(playerId: string): number {
    return this.getOrCreateCoreStats(playerId).unspentPoints;
  }

  public getOrCreateSkills(playerId: string): Record<string, SkillState> {
    if (!this.playerSkills.has(playerId)) {
      this.playerSkills.set(playerId, defaultSkillMap());
    }
    return this.playerSkills.get(playerId)!;
  }

  public getSkillSnapshot(playerId: string, skillId: string): SkillSnapshot | null {
    const skill = this.playerSkills.get(playerId)?.[skillId];
    return skill ? this.createSkillSnapshot(skill) : null;
  }

  public getFullSnapshot(playerId: string, playerState?: PlayerRuntimeState): PlayerStatsSnapshot {
    const skills = this.getOrCreateSkills(playerId);
    const coreStatsData = this.getOrCreateCoreStats(playerId);
    const skillSnapshots: Record<string, SkillSnapshot> = {};
    let totalLevelExact = 0n;

    for (const [skillId, skill] of Object.entries(skills)) {
      const progression = progressionFromSkill(skill);
      skills[skillId] = skillStateFromProgression(progression);
      totalLevelExact += progression.level;
      skillSnapshots[skillId] = this.createSkillSnapshot(skills[skillId]);
    }

    const totalLevelProjection = projectExactToSafeNumber(totalLevelExact);
    return {
      playerId,
      skills: skillSnapshots,
      coreStats: cloneCoreStats(coreStatsData.stats),
      unspentStatPoints: coreStatsData.unspentPoints,
      totalLevel: totalLevelProjection.value,
      totalLevelExact: totalLevelExact.toString(10),
      hp: playerState?.health ?? 0,
      maxHp: playerState?.maxHealth ?? 100,
      mana: playerState?.mana ?? 0,
      maxMana: playerState?.maxMana ?? 25,
      stamina: playerState?.stamina ?? 0,
      maxStamina: playerState?.maxStamina ?? 100,
      gold: playerState?.gold ?? 0,
      level: playerState?.level ?? 1,
    };
  }

  public broadcastSnapshot(playerId: string, playerState?: PlayerRuntimeState): void {
    if (!this.broadcastToPlayer || !isValidPlayerId(playerId)) return;
    this.broadcastToPlayer(playerId, "player_stats_snapshot", this.getFullSnapshot(playerId, playerState));
  }

  public removePlayer(playerId: string): void {
    this.playerSkills.delete(playerId);
    this.playerCoreStats.delete(playerId);
  }

  public loadSkills(playerId: string, skills: Record<string, SkillState>): void {
    if (!isValidPlayerId(playerId)) return;
    const sanitized = defaultSkillMap();
    for (const [skillId, skill] of Object.entries(skills ?? {})) {
      if (!isValidSkillId(skillId)) continue;
      sanitized[skillId] = skillStateFromProgression(progressionFromSkill(skill));
    }
    this.playerSkills.set(playerId, sanitized);
  }

  public loadCoreStats(playerId: string, coreStats: Partial<CoreStats>, unspentPoints: number = 0): void {
    if (!isValidPlayerId(playerId)) return;
    this.playerCoreStats.set(playerId, {
      stats: {
        strength: this.safeStat(coreStats.strength, DEFAULT_CORE_STATS.strength),
        agility: this.safeStat(coreStats.agility, DEFAULT_CORE_STATS.agility),
        intelligence: this.safeStat(coreStats.intelligence, DEFAULT_CORE_STATS.intelligence),
      },
      unspentPoints: Number.isSafeInteger(unspentPoints) ? Math.max(0, unspentPoints) : 0,
    });
  }

  public getSkillsForSave(playerId: string): Record<string, SkillState> | undefined {
    const skills = this.playerSkills.get(playerId);
    return skills ? cloneSkillStateMap(skills) : undefined;
  }

  public getCoreStatsForSave(playerId: string): { stats: CoreStats; unspentPoints: number } | undefined {
    const coreStats = this.playerCoreStats.get(playerId);
    if (!coreStats) return undefined;
    return { stats: cloneCoreStats(coreStats.stats), unspentPoints: coreStats.unspentPoints };
  }

  private createSkillSnapshot(skill: SkillState): SkillSnapshot {
    const progression = progressionFromSkill(skill);
    const required = xpRequiredForNextLevelExact(progression.level);
    const requiredProjection = projectExactToSafeNumber(required);
    const stateProjection = skillStateFromProgression(progression);
    const progressBasisPoints = required > 0n
      ? (progression.xpIntoLevel * 1_000_000n) / required
      : 0n;

    return {
      ...stateProjection,
      nextLevelXP: requiredProjection.value,
      nextLevelXPExact: required.toString(10),
      progressPercent: Number(progressBasisPoints) / 10_000,
    };
  }

  private safeStat(value: unknown, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(1, Math.floor(value as number));
  }
}

export const playerStatsDirector = new PlayerStatsDirector();
