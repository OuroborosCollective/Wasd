/**
 * PlayerStatsDirector — Server-Authoritative Skill/XP State
 * 
 * ARCHITECTURE (Server Authority + Stateless Determinism):
 * - All XP calculations are server-side only
 * - Player skill state is maintained per-player
 * - Broadcasts player_stats_snapshot to individual clients via WebSocket
 * - Client NEVER calculates XP or levels locally
 * 
 * RUNEscape XP System:
 * - XP formula: 50 * level^1.4 (server-side only)
 * - Levels 1-99
 * - Skills tracked: sword_mastery, blunt_force, archery, heavy_armor, evasion, etc.
 */

import { combatDirector, type XPGainEvent } from "../combat/CombatDirector.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkillSnapshot {
  xp: number;
  level: number;
  nextLevelXP: number;
  progressPercent: number; // 0-100 for UI progress bar
}

export interface PlayerStatsSnapshot {
  playerId: string;
  skills: Record<string, SkillSnapshot>;
  totalLevel: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  gold: number;
  level: number; // Overall player level
}

// ─── XP Constants ─────────────────────────────────────────────────────────────

const MAX_LEVEL = 99;

/**
 * RuneScape-style XP curve.
 * XP needed for level L+1 = floor(50 * (L+1)^1.4)
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level, 1.4));
}

/**
 * Total XP required to reach a specific level.
 */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += xpForLevel(l - 1);
  }
  return total;
}

/**
 * Calculate level from total XP.
 */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  let xpRemaining = totalXp;
  while (level < MAX_LEVEL && xpRemaining >= xpForLevel(level)) {
    xpRemaining -= xpForLevel(level);
    level++;
  }
  return level;
}

// ─── PlayerStatsDirector ──────────────────────────────────────────────────────

export class PlayerStatsDirector {
  // Per-player skill state: playerId → skills map
  private playerSkills: Map<string, Record<string, { xp: number; level: number }>> = new Map();
  
  // WebSocket broadcast function (set by integration)
  private broadcastToPlayer: ((playerId: string, event: string, payload: PlayerStatsSnapshot) => void) | null = null;
  
  // Pending XP events from CombatDirector
  private pendingXPevents: XPGainEvent[] = [];
  
  /**
   * Set the broadcast function for WebSocket integration.
   * Called during system wiring.
   */
  public setBroadcastFn(fn: (playerId: string, event: string, payload: PlayerStatsSnapshot) => void): void {
    this.broadcastToPlayer = fn;
  }
  
  /**
   * Drain XP events from CombatDirector.
   * Called by WorldTick to process accumulated XP.
   */
  public drainXPevents(): XPGainEvent[] {
    const events = this.pendingXPevents;
    this.pendingXPevents = [];
    return events;
  }
  
  /**
   * Queue XP events from CombatDirector.
   */
  public queueXPevents(events: XPGainEvent[]): void {
    this.pendingXPevents.push(...events);
  }
  
  /**
   * Process accumulated XP events and broadcast updates to clients.
   */
  public processXPevents(events: XPGainEvent[]): void {
    // Group events by player
    const playerXPGains = new Map<string, Map<string, number>>();
    
    for (const event of events) {
      if (!playerXPGains.has(event.playerId)) {
        playerXPGains.set(event.playerId, new Map());
      }
      const skillGains = playerXPGains.get(event.playerId)!;
      skillGains.set(event.skillId, (skillGains.get(event.skillId) ?? 0) + event.amount);
    }
    
    // Apply XP gains to each player
    for (const [playerId, skillGains] of playerXPGains) {
      for (const [skillId, amount] of skillGains) {
        this.applyXP(playerId, skillId, amount);
      }
      
      // Broadcast updated stats to this player
      this.broadcastSnapshot(playerId);
    }
  }
  
  /**
   * Apply XP to a specific skill for a player.
   */
  public applyXP(playerId: string, skillId: string, amount: number): { leveledUp: boolean; newLevel: number } {
    const skills = this.getOrCreateSkills(playerId);
    
    if (!skills[skillId]) {
      skills[skillId] = { xp: 0, level: 1 };
    }
    
    const skill = skills[skillId];
    const oldLevel = skill.level;
    
    skill.xp += amount;
    
    // Level up while possible
    while (skill.level < MAX_LEVEL && skill.xp >= xpForLevel(skill.level)) {
      skill.level++;
    }
    
    return {
      leveledUp: skill.level > oldLevel,
      newLevel: skill.level,
    };
  }
  
  /**
   * Get or create skills map for a player.
   */
  public getOrCreateSkills(playerId: string): Record<string, { xp: number; level: number }> {
    if (!this.playerSkills.has(playerId)) {
      // Initialize with default combat skills
      this.playerSkills.set(playerId, {
        sword_mastery: { xp: 0, level: 1 },
        blunt_force: { xp: 0, level: 1 },
        archery: { xp: 0, level: 1 },
        heavy_armor: { xp: 0, level: 1 },
        evasion: { xp: 0, level: 1 },
        shield_wall: { xp: 0, level: 1 },
        combat: { xp: 0, level: 1 },
      });
    }
    return this.playerSkills.get(playerId)!;
  }
  
  /**
   * Get skill snapshot for a player.
   */
  public getSkillSnapshot(playerId: string, skillId: string): SkillSnapshot | null {
    const skills = this.playerSkills.get(playerId);
    if (!skills || !skills[skillId]) return null;
    
    const skill = skills[skillId];
    const nextXP = xpForLevel(skill.level);
    const prevXP = skill.level > 1 ? totalXpForLevel(skill.level) : 0;
    const currentLevelXP = skill.xp - prevXP;
    const progressPercent = Math.min(100, (currentLevelXP / nextXP) * 100);
    
    return {
      xp: skill.xp,
      level: skill.level,
      nextLevelXP: nextXP,
      progressPercent,
    };
  }
  
  /**
   * Get full stats snapshot for a player.
   * Used for initial sync and periodic broadcasts.
   */
  public getFullSnapshot(playerId: string, playerState: any): PlayerStatsSnapshot {
    const skills = this.getOrCreateSkills(playerId);
    const skillSnapshots: Record<string, SkillSnapshot> = {};
    
    let totalLevel = 0;
    for (const [skillId, skill] of Object.entries(skills)) {
      totalLevel += skill.level;
      const nextXP = xpForLevel(skill.level);
      const prevXP = skill.level > 1 ? totalXpForLevel(skill.level) : 0;
      const currentLevelXP = skill.xp - prevXP;
      const progressPercent = Math.min(100, (currentLevelXP / nextXP) * 100);
      
      skillSnapshots[skillId] = {
        xp: skill.xp,
        level: skill.level,
        nextLevelXP: nextXP,
        progressPercent,
      };
    }
    
    return {
      playerId,
      skills: skillSnapshots,
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
  
  /**
   * Broadcast stats snapshot to a specific player.
   */
  private broadcastSnapshot(playerId: string): void {
    if (!this.broadcastToPlayer) return;
    
    // Get player state from PlayerSystem
    const { playerSystem } = this;
    const playerState = playerSystem?.getPlayer(playerId);
    
    const snapshot = this.getFullSnapshot(playerId, playerState);
    this.broadcastToPlayer(playerId, "player_stats_snapshot", snapshot);
  }
  
  /**
   * Remove player data (on disconnect/cleanup).
   */
  public removePlayer(playerId: string): void {
    this.playerSkills.delete(playerId);
  }
  
  /**
   * Load player skills from persisted state.
   */
  public loadSkills(playerId: string, skills: Record<string, { xp: number; level: number }>): void {
    this.playerSkills.set(playerId, skills);
  }
  
  /**
   * Get skills for persistence.
   */
  public getSkillsForSave(playerId: string): Record<string, { xp: number; level: number }> | undefined {
    return this.playerSkills.get(playerId);
  }
  
  // Lazy reference to PlayerSystem (set during wiring)
  private get playerSystem() {
    // Dynamic import to avoid circular dependency
    try {
      const { playerSystem } = require("./PlayerSystem.js");
      return playerSystem;
    } catch {
      return null;
    }
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

export const playerStatsDirector = new PlayerStatsDirector();
