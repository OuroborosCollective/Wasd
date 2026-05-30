/**
 * Ouroboros CombatDirector — RuneScape-Style Combat XP System
 * 
 * ARCHITECTURE (Server Authority):
 * - All combat calculations are server-authoritative
 * - XP is granted per combat tick (Hit/Miss/Defend), NOT on kill
 * - XP type derived deterministically from equipped ItemSignature
 * - Async `xp_gained` events sent to client for visual feedback
 * 
 * RUNESCAPE XP LOGIC:
 * - Attack XP: Based on weapon base (sword_mastery, blunt_force, archery)
 * - Defense XP: Based on armor piece (heavy_armor, evasion)
 * - XP formula: hitDamage * skillMultiplier * tierBonus
 * 
 * SECURITY (Exploit Prevention):
 * - Equipment validated server-side — client cannot spoof weapon stats
 * - XP amounts are deterministic — verifiable by ARE invariant guard
 * - No client-side XP calculation or manipulation possible
 */

import { parseItemSignature, type ParsedSignature, buildModularItem, type EquipmentState } from "@wasd/shared";
import { MODULAR_COMPONENT_POOLS, type ItemSignature } from "@wasd/shared";
import { type FxKind } from "./CombatSystem.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XPGainEvent {
  playerId: string;
  skillId: string;
  amount: number;
  source: "attack" | "defend" | "kill" | "quest";
  itemSignature?: string;
  tick: number;
}

export interface CombatXPResult {
  attackXP: number;
  defendXP: number;
  attackSkill: string;
  defendSkill: string;
  xpEvents: XPGainEvent[];
}

export interface CombatTickInput {
  attackerId: string;
  defenderId: string;
  attackerEquipment: EquipmentState;
  defenderEquipment: EquipmentState;
  hit: boolean;
  damage: number;
  crit: boolean;
  isDefender: boolean;  // true if this player is being attacked
}

// ─── XP Constants ─────────────────────────────────────────────────────────────

const XP_MULTIPLIER = 0.5;      // Base XP per damage point
const CRIT_BONUS = 1.5;          // 50% bonus XP on crits
const MISS_PENALTY = 0.1;       // Small XP for attempting (encourages learning)

const SKILL_XP_MULTIPLIERS: Record<string, number> = {
  // Attack skills
  sword_mastery: 1.0,   // Standard swords
  blunt_force: 1.1,      // Axes and maces hit harder
  archery: 0.9,          // Ranged is slightly safer
  
  // Defense skills
  heavy_armor: 1.0,      // Standard armor
  evasion: 1.05,         // Dodge-based defense (slightly more XP for timing)
  shield_wall: 1.2,      // Shield blocking is very effective
  
  // Generic fallback
  combat: 0.8,
};

// ─── Weapon Base → Skill Mapping ──────────────────────────────────────────────

const BLADE_TO_SKILL: Record<string, string> = {
  blade_1: "sword_mastery",  // Dagger
  blade_2: "sword_mastery",  // Shortsword
  blade_3: "sword_mastery",  // Longsword
  blade_4: "sword_mastery",   // Broadsword
  blade_5: "sword_mastery",   // Greatsword
  blade_6: "sword_mastery",   // Claymore
  blade_7: "sword_mastery",   // Flamberge
  blade_8: "sword_mastery",   // Zweihander
  
  axe_1: "blunt_force",
  axe_2: "blunt_force",
  axe_3: "blunt_force",
  axe_4: "blunt_force",
  axe_5: "blunt_force",
  axe_6: "blunt_force",
  axe_7: "blunt_force",
  axe_8: "blunt_force",
  
  mace_1: "blunt_force",
  mace_2: "blunt_force",
  mace_3: "blunt_force",
  mace_4: "blunt_force",
  mace_5: "blunt_force",
  mace_6: "blunt_force",
  mace_7: "blunt_force",
  mace_8: "blunt_force",
  
  spear_1: "sword_mastery",
  spear_2: "sword_mastery",
  spear_3: "sword_mastery",
  spear_4: "sword_mastery",
  spear_5: "sword_mastery",
  spear_6: "sword_mastery",
  spear_7: "sword_mastery",
  spear_8: "sword_mastery",
  
  bow_1: "archery",
  bow_2: "archery",
  bow_3: "archery",
  bow_4: "archery",
  bow_5: "archery",
  bow_6: "archery",
  bow_7: "archery",
  bow_8: "archery",
};

// ─── Armor Base → Skill Mapping ───────────────────────────────────────────────

const CHEST_TO_SKILL: Record<string, string> = {
  chest_1: "evasion",        // Leather Vest — light armor
  chest_2: "evasion",         // Chain Mail — medium
  chest_3: "evasion",         // Scale Mail — medium
  chest_4: "heavy_armor",     // Plate Armor — heavy
  chest_5: "heavy_armor",     // Reinforced Plate — heavy
  chest_6: "heavy_armor",     // Dragon Scale — heavy
  chest_7: "heavy_armor",     // Mythril Plate — heavy
  chest_8: "heavy_armor",     // Adamantine Guard — heavy
};

// ─── Material Tier Bonus ───────────────────────────────────────────────────────

const MATERIAL_TIER_BONUS: Record<string, number> = {
  material_iron: 1.0,
  material_steel: 1.1,
  material_silver: 1.15,
  material_mithril: 1.25,
  material_adamantine: 1.35,
  material_orichalcum: 1.5,
  material_dragon_scale: 1.6,
  material_star_metal: 1.75,
};

// ─── CombatDirector ────────────────────────────────────────────────────────────

export class CombatDirector {
  private worldTick = 0;
  private pendingXPevents: XPGainEvent[] = [];
  
  constructor() {}
  
  /**
   * Sync world tick for deterministic XP calculation.
   */
  public setTick(tick: number): void {
    this.worldTick = tick;
  }
  
  /**
   * Drain all pending XP events (called by WorldTick to broadcast).
   */
  public drainXPevents(): XPGainEvent[] {
    const events = this.pendingXPevents;
    this.pendingXPevents = [];
    return events;
  }
  
  /**
   * Calculate XP gain for an attack action.
   * Called by CombatService when resolving combat.
   */
  public calculateAttackXP(
    playerId: string,
    equipment: EquipmentState,
    hit: boolean,
    damage: number,
    crit: boolean
  ): XPGainEvent[] {
    const events: XPGainEvent[] = [];
    
    // Get weapon from MAIN_HAND slot
    const weapon = equipment.MAIN_HAND;
    
    if (!weapon) {
      // Bare-handed — generic combat XP
      events.push(this.createXPEvent(
        playerId,
        "combat",
        hit ? damage * XP_MULTIPLIER : damage * MISS_PENALTY,
        "attack"
      ));
      return events;
    }
    
    // Parse weapon signature
    const parsed = parseItemSignature(weapon.signature);
    const weaponSkill = this.deriveWeaponSkill(parsed);
    const tierBonus = this.deriveMaterialTierBonus(parsed);
    
    // Calculate attack XP
    let xpAmount = damage * XP_MULTIPLIER;
    
    if (crit) {
      xpAmount *= CRIT_BONUS;
    } else if (!hit) {
      xpAmount *= MISS_PENALTY;
    }
    
    // Apply skill and tier bonuses
    const skillMultiplier = SKILL_XP_MULTIPLIERS[weaponSkill] ?? 1.0;
    xpAmount *= skillMultiplier * tierBonus;
    
    events.push(this.createXPEvent(
      playerId,
      weaponSkill,
      Math.floor(xpAmount),
      "attack",
      weapon.signature
    ));
    
    return events;
  }
  
  /**
   * Calculate XP gain for defending against an attack.
   * Called when a player takes damage (successfully blocked or got hit).
   */
  public calculateDefendXP(
    playerId: string,
    equipment: EquipmentState,
    hit: boolean,
    damage: number
  ): XPGainEvent[] {
    const events: XPGainEvent[] = [];
    
    // Get chest armor for defense skill
    const armor = equipment.CHEST;
    
    if (!armor) {
      // No armor — generic evasion
      events.push(this.createXPEvent(
        playerId,
        "evasion",
        hit ? damage * XP_MULTIPLIER * 0.5 : damage * XP_MULTIPLIER * 0.3,
        "defend"
      ));
      return events;
    }
    
    // Parse armor signature
    const parsed = parseItemSignature(armor.signature);
    const defendSkill = this.deriveArmorSkill(parsed);
    const tierBonus = this.deriveMaterialTierBonus(parsed);
    
    // Defense XP is lower than attack XP (surviving vs winning)
    // But successful blocks (miss = hit for player) get bonus
    let xpAmount = damage * XP_MULTIPLIER * 0.7;
    
    if (!hit) {
      // Successfully dodged/blocked — bonus XP
      xpAmount *= 1.5;
    }
    
    // Apply skill and tier bonuses
    const skillMultiplier = SKILL_XP_MULTIPLIERS[defendSkill] ?? 1.0;
    xpAmount *= skillMultiplier * tierBonus;
    
    events.push(this.createXPEvent(
      playerId,
      defendSkill,
      Math.floor(xpAmount),
      "defend",
      armor.signature
    ));
    
    return events;
  }
  
  /**
   * Process a combat tick and return XP results.
   * This is the main entry point called by CombatService.
   */
  public processCombatTick(input: CombatTickInput): CombatXPResult {
    const attackXP = this.calculateAttackXP(
      input.attackerId,
      input.attackerEquipment,
      input.hit,
      input.damage,
      input.crit
    );
    
    const defendXP = this.calculateDefendXP(
      input.defenderId,
      input.defenderEquipment,
      input.hit,
      input.damage
    );
    
    // Merge all events
    const allEvents: XPGainEvent[] = [...attackXP, ...defendXP];
    
    // Queue for broadcast
    this.pendingXPevents.push(...allEvents);
    
    // Return structured result for FX manager
    const attackEvent = attackXP[0];
    const defendEvent = defendXP[0];
    
    return {
      attackXP: attackEvent?.amount ?? 0,
      defendXP: defendEvent?.amount ?? 0,
      attackSkill: attackEvent?.skillId ?? "combat",
      defendSkill: defendEvent?.skillId ?? "evasion",
      xpEvents: allEvents,
    };
  }
  
  /**
   * Grant bonus XP for a kill (quest, achievement, etc.)
   */
  public grantKillXP(playerId: string, baseXP: number, source: "quest" | "achievement" = "quest"): XPGainEvent[] {
    const events: XPGainEvent[] = [];
    
    // Kill XP goes to primary combat skill
    events.push(this.createXPEvent(
      playerId,
      "sword_mastery",
      Math.floor(baseXP),
      "kill"
    ));
    
    this.pendingXPevents.push(...events);
    return events;
  }
  
  // ─── Private Helper Methods ──────────────────────────────────────────────────
  
  /**
   * Derive the attack skill from weapon base component.
   */
  private deriveWeaponSkill(parsed: ParsedSignature): string {
    const baseId = parsed.base.id;
    
    // Try exact match first
    if (BLADE_TO_SKILL[baseId]) {
      return BLADE_TO_SKILL[baseId];
    }
    
    // Fallback: check prefix for weapon type hints
    // e.g., "prefix_shadow" might imply dagger
    if (baseId.startsWith("blade_")) {
      return "sword_mastery";
    }
    if (baseId.startsWith("axe_")) {
      return "blunt_force";
    }
    if (baseId.startsWith("mace_")) {
      return "blunt_force";
    }
    if (baseId.startsWith("spear_")) {
      return "sword_mastery";
    }
    if (baseId.startsWith("bow_")) {
      return "archery";
    }
    
    // Default fallback
    return "combat";
  }
  
  /**
   * Derive the defense skill from armor base component.
   */
  private deriveArmorSkill(parsed: ParsedSignature): string {
    const baseId = parsed.base.id;
    
    // Try exact match first
    if (CHEST_TO_SKILL[baseId]) {
      return CHEST_TO_SKILL[baseId];
    }
    
    // Fallback based on material tier (higher tier = heavier armor)
    const tier = this.deriveMaterialTier(parsed);
    if (tier >= 5) {
      return "heavy_armor";
    }
    
    return "evasion";
  }
  
  /**
   * Derive material tier (1-8) from parsed signature.
   */
  private deriveMaterialTier(parsed: ParsedSignature): number {
    const matId = parsed.material;
    const tierMatch = matId.match(/material_(?:iron|steel|silver|mithril|adamantine|orichalcum|dragon_scale|star_metal)/);
    
    if (!tierMatch) return 1;
    
    const tierMap: Record<string, number> = {
      material_iron: 1,
      material_steel: 2,
      material_silver: 3,
      material_mithril: 4,
      material_adamantine: 5,
      material_orichalcum: 6,
      material_dragon_scale: 7,
      material_star_metal: 8,
    };
    
    return tierMap[tierMatch[0]] ?? 1;
  }
  
  /**
   * Calculate material tier bonus multiplier.
   */
  private deriveMaterialTierBonus(parsed: ParsedSignature): number {
    const tier = this.deriveMaterialTier(parsed);
    return MATERIAL_TIER_BONUS[`material_tier_${tier}`] ?? (tier * 0.1 + 0.9);
  }
  
  /**
   * Create an XP gain event.
   */
  private createXPEvent(
    playerId: string,
    skillId: string,
    amount: number,
    source: "attack" | "defend" | "kill" | "quest",
    itemSignature?: string
  ): XPGainEvent {
    return {
      playerId,
      skillId,
      amount: Math.max(0, Math.floor(amount)),
      source,
      itemSignature,
      tick: this.worldTick,
    };
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

export const combatDirector = new CombatDirector();