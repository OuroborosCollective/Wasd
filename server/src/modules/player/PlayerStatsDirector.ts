/**
 * PlayerStatsDirector — Server-Authoritative Skill/XP State
 *
 * ARCHITECTURE (Server Authority + Stateless Determinism):
 * - All XP calculations are server-side only
 * - Player skill state is maintained per-player
 * - Broadcasts player_stats_snapshot to individual clients via WebSocket
 * - Client NEVER calculates XP or levels locally
 *
 * UNLIMITED SCALING SYSTEM:
 * - Practically uncapped skill progression with a hard safety ceiling
 * - Every gained skill level grants +5 unspent stat points
 * - Overcap crafting can consume skill level bonuses elsewhere:
 *   totalChance > 100% => guaranteed yield + bonus multi-yield chance
 *
 * CORE STATS:
 * - STR (Strength): Physical damage, carry weight
 * - AGI (Agility): Attack speed, dodge chance
 * - INT (Intelligence): Mana pool, craft quality bonus
 *
 * Stat Allocation Intent Flow:
 * 1. Client sends stat_alloc intent with target stat
 * 2. Server validates playerId/stat/tick and unspentStatPoints > 0
 * 3. Server deterministically applies stat increase
 * 4. Broadcast updated snapshot to client
 */

import { type XPGainEvent } from "../combat/CombatDirector.js";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  xp: number;
  level: number;
}

export interface SkillSnapshot {
  xp: number;
  level: number;
  nextLevelXP: number;
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
  reason?: "INVALID_PLAYER" | "INVALID_SKILL" | "INVALID_XP";
}

// ─── XP Constants ─────────────────────────────────────────────────────────────

const SAFETY_MAX_LEVEL = 999_999;
const STAT_POINTS_PER_LEVEL = 5;

const DEFAULT_CORE_STATS: CoreStats = {
  strength: 10,
  agility: 10,
  intelligence: 10,
};

const DEFAULT_SKILLS: Record<string, SkillState> = {
  sword_mastery: { xp: 0, level: 1 },
  blunt_force: { xp: 0, level: 1 },
  archery: { xp: 0, level: 1 },
  heavy_armor: { xp: 0, level: 1 },
  evasion: { xp: 0, level: 1 },
  shield_wall: { xp: 0, level: 1 },
  combat: { xp: 0, level: 1 },

  // Crafting/world skills can safely exist even before first use.
  carpentry: { xp: 0, level: 1 },
  smithing: { xp: 0, level: 1 },
  alchemy: { xp: 0, level: 1 },
  mining: { xp: 0, level: 1 },
  woodcutting: { xp: 0, level: 1 },
  fishing: { xp: 0, level: 1 },
  cooking: { xp: 0, level: 1 },
};

/**
 * XP needed to advance from currentLevel to currentLevel + 1.
 *
 * Example:
 * - currentLevel 1 => XP required for level 2
 * - currentLevel 2 => XP required for level 3
 */
export function xpForLevel(currentLevel: number): number {
  const safeLevel = Math.max(1, Math.floor(currentLevel));

  if (safeLevel >= SAFETY_MAX_LEVEL) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.max(1, Math.floor(50 * Math.pow(safeLevel + 1, 1.4)));
}

/**
 * Total XP required to stand at a specific level.
 *
 * Level 1 starts at 0 XP.
 * Level 2 requires xpForLevel(1).
 * Level 3 requires xpForLevel(1) + xpForLevel(2).
 */
const totalXpCache: number[] = [0, 0];

export function totalXpForLevel(level: number): number {
  const targetLevel = Math.max(1, Math.min(SAFETY_MAX_LEVEL, Math.floor(level)));

  if (typeof totalXpCache[targetLevel] === "number") {
    return totalXpCache[targetLevel];
  }

  let lastKnownLevel = totalXpCache.length - 1;
  let total = totalXpCache[lastKnownLevel] ?? 0;

  while (lastKnownLevel < targetLevel) {
    total += xpForLevel(lastKnownLevel);
    lastKnownLevel++;
    totalXpCache[lastKnownLevel] = total;
  }

  return totalXpCache[targetLevel] ?? total;
}

/**
 * Calculate level from total XP.
 * Uses binary search to avoid slow level-by-level loops.
 */
export function levelFromXp(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp <= 0) return 1;

  const xp = Math.max(0, Math.floor(totalXp));

  let low = 1;
  let high = 2;

  while (high < SAFETY_MAX_LEVEL && totalXpForLevel(high) <= xp) {
    high = Math.min(SAFETY_MAX_LEVEL, high * 2);
  }

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);

    if (totalXpForLevel(mid) <= xp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
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
    cloned[skillId] = {
      xp: Math.max(0, Math.floor(skill.xp)),
      level: Math.max(1, Math.floor(skill.level)),
    };
  }

  return cloned;
}

function isValidPlayerId(playerId: string): boolean {
  return typeof playerId === "string" && playerId.trim().length > 0;
}

function isValidSkillId(skillId: string): boolean {
  return typeof skillId === "string" && /^[a-zA-Z0-9_:-]+$/.test(skillId);
}

function isCoreStatKey(value: unknown): value is CoreStatKey {
  return value === "strength" || value === "agility" || value === "intelligence";
}

// ─── PlayerStatsDirector ──────────────────────────────────────────────────────

export class PlayerStatsDirector {
  private playerSkills: Map<string, Record<string, SkillState>> = new Map();

  private playerCoreStats: Map<
    string,
    {
      stats: CoreStats;
      unspentPoints: number;
    }
  > = new Map();

  private broadcastToPlayer:
    | ((playerId: string, event: string, payload: PlayerStatsSnapshot) => void)
    | null = null;

  private pendingXPEvents: XPGainEvent[] = [];

  /**
   * Backwards-compatible alias for old property naming.
   * Do not use directly outside this class.
   */
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
      if (!event) continue;
      this.pendingXPevents.push(event);
    }
  }

  public processXPevents(events: XPGainEvent[]): void {
    const playerXPGains = new Map<string, Map<string, number>>();

    for (const event of events) {
      if (!event) continue;
      if (!isValidPlayerId(event.playerId)) continue;
      if (!isValidSkillId(event.skillId)) continue;
      if (!Number.isFinite(event.amount) || event.amount <= 0) continue;

      let skillGains = playerXPGains.get(event.playerId);

      if (!skillGains) {
        skillGains = new Map<string, number>();
        playerXPGains.set(event.playerId, skillGains);
      }

      skillGains.set(
        event.skillId,
        (skillGains.get(event.skillId) ?? 0) + Math.floor(event.amount),
      );
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
      return {
        accepted: false,
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        levelsGained: 0,
        xpApplied: 0,
        reason: "INVALID_PLAYER",
      };
    }

    if (!isValidSkillId(skillId)) {
      return {
        accepted: false,
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        levelsGained: 0,
        xpApplied: 0,
        reason: "INVALID_SKILL",
      };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      const existingSkill = this.getOrCreateSkills(playerId)[skillId] ?? { xp: 0, level: 1 };

      return {
        accepted: false,
        leveledUp: false,
        oldLevel: existingSkill.level,
        newLevel: existingSkill.level,
        levelsGained: 0,
        xpApplied: 0,
        reason: "INVALID_XP",
      };
    }

    const skills = this.getOrCreateSkills(playerId);

    if (!skills[skillId]) {
      skills[skillId] = { xp: 0, level: 1 };
    }

    const skill = skills[skillId];
    const oldLevel = Math.max(1, Math.floor(skill.level));
    const xpApplied = Math.max(1, Math.floor(amount));

    skill.xp = Math.max(0, Math.floor(skill.xp)) + xpApplied;
    skill.level = levelFromXp(skill.xp);

    const newLevel = skill.level;
    const levelsGained = Math.max(0, newLevel - oldLevel);

    if (levelsGained > 0) {
      this.awardStatPoints(playerId, levelsGained * STAT_POINTS_PER_LEVEL);
    }

    return {
      accepted: true,
      leveledUp: levelsGained > 0,
      oldLevel,
      newLevel,
      levelsGained,
      xpApplied,
    };
  }

  public getOrCreateCoreStats(playerId: string): {
    stats: CoreStats;
    unspentPoints: number;
  } {
    if (!this.playerCoreStats.has(playerId)) {
      this.playerCoreStats.set(playerId, {
        stats: cloneCoreStats(DEFAULT_CORE_STATS),
        unspentPoints: 0,
      });
    }

    return this.playerCoreStats.get(playerId)!;
  }

  public handleStatAllocation(intent: StatAllocationIntent): StatAllocationResult {
    if (!intent || intent.intent !== "stat_alloc") {
      return { success: false, reason: "INVALID_INTENT" };
    }

    const { playerId, stat, tick } = intent;

    if (!isValidPlayerId(playerId)) {
      return { success: false, reason: "INVALID_PLAYER" };
    }

    if (!Number.isFinite(tick) || tick < 0) {
      return { success: false, reason: "INVALID_TICK" };
    }

    if (!isCoreStatKey(stat)) {
      return { success: false, reason: "INVALID_STAT" };
    }

    const playerStats = this.getOrCreateCoreStats(playerId);

    if (playerStats.unspentPoints <= 0) {
      return { success: false, reason: "NO_UNSPENT_POINTS" };
    }

    playerStats.stats[stat] += 1;
    playerStats.unspentPoints -= 1;

    this.broadcastSnapshot(playerId);

    return { success: true };
  }

  public awardStatPoints(playerId: string, amount: number = STAT_POINTS_PER_LEVEL): void {
    if (!isValidPlayerId(playerId)) return;
    if (!Number.isFinite(amount) || amount <= 0) return;

    const playerStats = this.getOrCreateCoreStats(playerId);
    playerStats.unspentPoints += Math.floor(amount);
  }

  public getCoreStats(playerId: string): CoreStats {
    return cloneCoreStats(this.getOrCreateCoreStats(playerId).stats);
  }

  public getUnspentPoints(playerId: string): number {
    return this.getOrCreateCoreStats(playerId).unspentPoints;
  }

  public getOrCreateSkills(playerId: string): Record<string, SkillState> {
    if (!this.playerSkills.has(playerId)) {
      this.playerSkills.set(playerId, cloneSkillStateMap(DEFAULT_SKILLS));
    }

    return this.playerSkills.get(playerId)!;
  }

  public getSkillSnapshot(playerId: string, skillId: string): SkillSnapshot | null {
    const skills = this.playerSkills.get(playerId);
    if (!skills || !skills[skillId]) return null;

    return this.createSkillSnapshot(skills[skillId]);
  }

  public getFullSnapshot(
    playerId: string,
    playerState?: PlayerRuntimeState,
  ): PlayerStatsSnapshot {
    const skills = this.getOrCreateSkills(playerId);
    const coreStatsData = this.getOrCreateCoreStats(playerId);
    const skillSnapshots: Record<string, SkillSnapshot> = {};

    let totalLevel = 0;

    for (const [skillId, skill] of Object.entries(skills)) {
      const fixedLevel = levelFromXp(skill.xp);

      if (fixedLevel !== skill.level) {
        skill.level = fixedLevel;
      }

      totalLevel += skill.level;
      skillSnapshots[skillId] = this.createSkillSnapshot(skill);
    }

    return {
      playerId,
      skills: skillSnapshots,
      coreStats: cloneCoreStats(coreStatsData.stats),
      unspentStatPoints: coreStatsData.unspentPoints,
      totalLevel,
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
    if (!this.broadcastToPlayer) return;
    if (!isValidPlayerId(playerId)) return;

    const snapshot = this.getFullSnapshot(playerId, playerState);
    this.broadcastToPlayer(playerId, "player_stats_snapshot", snapshot);
  }

  public removePlayer(playerId: string): void {
    this.playerSkills.delete(playerId);
    this.playerCoreStats.delete(playerId);
  }

  public loadSkills(playerId: string, skills: Record<string, SkillState>): void {
    if (!isValidPlayerId(playerId)) return;

    const sanitized: Record<string, SkillState> = {};

    for (const [skillId, skill] of Object.entries(skills ?? {})) {
      if (!isValidSkillId(skillId)) continue;

      const xp = Number.isFinite(skill?.xp) ? Math.max(0, Math.floor(skill.xp)) : 0;
      const level = levelFromXp(xp);

      sanitized[skillId] = {
        xp,
        level,
      };
    }

    this.playerSkills.set(playerId, {
      ...cloneSkillStateMap(DEFAULT_SKILLS),
      ...sanitized,
    });
  }

  public loadCoreStats(
    playerId: string,
    coreStats: Partial<CoreStats>,
    unspentPoints: number = 0,
  ): void {
    if (!isValidPlayerId(playerId)) return;

    this.playerCoreStats.set(playerId, {
      stats: {
        strength: this.safeStat(coreStats.strength, DEFAULT_CORE_STATS.strength),
        agility: this.safeStat(coreStats.agility, DEFAULT_CORE_STATS.agility),
        intelligence: this.safeStat(coreStats.intelligence, DEFAULT_CORE_STATS.intelligence),
      },
      unspentPoints: Number.isFinite(unspentPoints)
        ? Math.max(0, Math.floor(unspentPoints))
        : 0,
    });
  }

  public getSkillsForSave(playerId: string): Record<string, SkillState> | undefined {
    const skills = this.playerSkills.get(playerId);
    if (!skills) return undefined;

    return cloneSkillStateMap(skills);
  }

  public getCoreStatsForSave(
    playerId: string,
  ): { stats: CoreStats; unspentPoints: number } | undefined {
    const coreStats = this.playerCoreStats.get(playerId);
    if (!coreStats) return undefined;

    return {
      stats: cloneCoreStats(coreStats.stats),
      unspentPoints: coreStats.unspentPoints,
    };
  }

  private createSkillSnapshot(skill: SkillState): SkillSnapshot {
    const xp = Math.max(0, Math.floor(skill.xp));
    const level = Math.max(1, Math.floor(skill.level));

    const currentLevelStartXP = totalXpForLevel(level);
    const nextLevelStartXP = totalXpForLevel(level + 1);
    const neededForNextLevel = Math.max(1, nextLevelStartXP - currentLevelStartXP);
    const currentLevelXP = Math.max(0, xp - currentLevelStartXP);

    const progressPercent = Math.max(
      0,
      Math.min(100, (currentLevelXP / neededForNextLevel) * 100),
    );

    return {
      xp,
      level,
      nextLevelXP: neededForNextLevel,
      progressPercent,
    };
  }

  private safeStat(value: unknown, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(1, Math.floor(value as number));
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

export const playerStatsDirector = new PlayerStatsDirector();
