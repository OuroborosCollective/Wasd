/**
 * Ouroboros CombatDirector — RuneScape-style server-authoritative combat XP.
 *
 * ARE rules:
 * - Client submits combat intent only; this director derives XP from server equipment state.
 * - XP source, skill, amount, item signature, and tick are deterministic outputs.
 * - No wall-clock time, Math.random, or client-calculated XP enters this truth path.
 */

import { parseItemSignature, type EquipmentState, type ParsedSignature } from "@wasd/shared";

export type XPGainSource = "attack" | "defend" | "kill" | "quest" | "gather" | "craft" | "system";

export interface XPGainEvent {
  playerId: string;
  skillId: string;
  amount: number;
  source: XPGainSource;
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
  isDefender: boolean;
}

const XP_MULTIPLIER = 0.5;
const CRIT_BONUS = 1.5;
const MISS_PENALTY = 0.1;

const SKILL_XP_MULTIPLIERS: Record<string, number> = Object.freeze({
  sword_mastery: 1.0,
  blunt_force: 1.1,
  archery: 0.9,
  heavy_armor: 1.0,
  evasion: 1.05,
  shield_wall: 1.2,
  combat: 0.8,
});

const WEAPON_BASE_TO_SKILL: Record<string, string> = Object.freeze({
  blade_1: "sword_mastery",
  blade_2: "sword_mastery",
  blade_3: "sword_mastery",
  blade_4: "sword_mastery",
  blade_5: "sword_mastery",
  blade_6: "sword_mastery",
  blade_7: "sword_mastery",
  blade_8: "sword_mastery",
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
});

const CHEST_BASE_TO_SKILL: Record<string, string> = Object.freeze({
  chest_1: "evasion",
  chest_2: "evasion",
  chest_3: "evasion",
  chest_4: "heavy_armor",
  chest_5: "heavy_armor",
  chest_6: "heavy_armor",
  chest_7: "heavy_armor",
  chest_8: "heavy_armor",
});

const MATERIAL_TIER_BY_ID: Record<string, number> = Object.freeze({
  material_iron: 1,
  material_steel: 2,
  material_silver: 3,
  material_mithril: 4,
  material_adamantine: 5,
  material_orichalcum: 6,
  material_dragon_scale: 7,
  material_star_metal: 8,
});

const MATERIAL_XP_BONUS_BY_ID: Record<string, number> = Object.freeze({
  material_iron: 1.0,
  material_steel: 1.1,
  material_silver: 1.15,
  material_mithril: 1.25,
  material_adamantine: 1.35,
  material_orichalcum: 1.5,
  material_dragon_scale: 1.6,
  material_star_metal: 1.75,
});

function safeDamage(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function safeTick(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function fallbackTierBonus(tier: number): number {
  return Math.max(1, Math.min(1.75, 0.9 + Math.max(1, Math.floor(tier)) * 0.1));
}

export class CombatDirector {
  private worldTick = 0;
  private pendingXPevents: XPGainEvent[] = [];

  public setTick(tick: number): void {
    this.worldTick = safeTick(tick);
  }

  public drainXPevents(): XPGainEvent[] {
    const events = this.pendingXPevents;
    this.pendingXPevents = [];
    return events;
  }

  public calculateAttackXP(
    playerId: string,
    equipment: EquipmentState,
    hit: boolean,
    damage: number,
    crit: boolean,
  ): XPGainEvent[] {
    const normalizedDamage = safeDamage(damage);
    const weapon = equipment.MAIN_HAND;

    if (!weapon) {
      return [
        this.createXPEvent(
          playerId,
          "combat",
          hit ? normalizedDamage * XP_MULTIPLIER : normalizedDamage * MISS_PENALTY,
          "attack",
        ),
      ];
    }

    const parsed = parseItemSignature(weapon.signature);
    const weaponSkill = this.deriveWeaponSkill(parsed);
    const skillMultiplier = SKILL_XP_MULTIPLIERS[weaponSkill] ?? 1.0;
    const tierBonus = this.deriveMaterialTierBonus(parsed);

    let xpAmount = normalizedDamage * XP_MULTIPLIER;
    if (crit) xpAmount *= CRIT_BONUS;
    else if (!hit) xpAmount *= MISS_PENALTY;

    return [
      this.createXPEvent(
        playerId,
        weaponSkill,
        xpAmount * skillMultiplier * tierBonus,
        "attack",
        weapon.signature,
      ),
    ];
  }

  public calculateDefendXP(
    playerId: string,
    equipment: EquipmentState,
    hit: boolean,
    damage: number,
  ): XPGainEvent[] {
    const normalizedDamage = safeDamage(damage);
    const armor = equipment.CHEST;

    if (!armor) {
      return [
        this.createXPEvent(
          playerId,
          "evasion",
          normalizedDamage * XP_MULTIPLIER * (hit ? 0.5 : 0.3),
          "defend",
        ),
      ];
    }

    const parsed = parseItemSignature(armor.signature);
    const defendSkill = this.deriveArmorSkill(parsed);
    const skillMultiplier = SKILL_XP_MULTIPLIERS[defendSkill] ?? 1.0;
    const tierBonus = this.deriveMaterialTierBonus(parsed);
    let xpAmount = normalizedDamage * XP_MULTIPLIER * 0.7;

    if (!hit) xpAmount *= 1.5;

    return [
      this.createXPEvent(
        playerId,
        defendSkill,
        xpAmount * skillMultiplier * tierBonus,
        "defend",
        armor.signature,
      ),
    ];
  }

  public processCombatTick(input: CombatTickInput): CombatXPResult {
    const attackXP = this.calculateAttackXP(
      input.attackerId,
      input.attackerEquipment,
      input.hit,
      input.damage,
      input.crit,
    );
    const defendXP = this.calculateDefendXP(
      input.defenderId,
      input.defenderEquipment,
      input.hit,
      input.damage,
    );
    const allEvents = [...attackXP, ...defendXP];
    this.pendingXPevents.push(...allEvents);

    return {
      attackXP: attackXP[0]?.amount ?? 0,
      defendXP: defendXP[0]?.amount ?? 0,
      attackSkill: attackXP[0]?.skillId ?? "combat",
      defendSkill: defendXP[0]?.skillId ?? "evasion",
      xpEvents: allEvents,
    };
  }

  public grantKillXP(playerId: string, baseXP: number, _source: "quest" | "achievement" = "quest"): XPGainEvent[] {
    return this.grantKillXPForEquipment(playerId, baseXP, {});
  }

  public grantKillXPForEquipment(playerId: string, baseXP: number, equipment: EquipmentState): XPGainEvent[] {
    const weapon = equipment.MAIN_HAND;
    const skillId = weapon ? this.deriveWeaponSkill(parseItemSignature(weapon.signature)) : "combat";
    const event = this.createXPEvent(playerId, skillId, baseXP, "kill", weapon?.signature);
    this.pendingXPevents.push(event);
    return [event];
  }

  private deriveWeaponSkill(parsed: ParsedSignature): string {
    const baseId = parsed.base.id;
    if (WEAPON_BASE_TO_SKILL[baseId]) return WEAPON_BASE_TO_SKILL[baseId];
    if (baseId.startsWith("blade_") || baseId.startsWith("spear_")) return "sword_mastery";
    if (baseId.startsWith("axe_") || baseId.startsWith("mace_")) return "blunt_force";
    if (baseId.startsWith("bow_")) return "archery";
    return "combat";
  }

  private deriveArmorSkill(parsed: ParsedSignature): string {
    const baseId = parsed.base.id;
    if (CHEST_BASE_TO_SKILL[baseId]) return CHEST_BASE_TO_SKILL[baseId];
    return this.deriveMaterialTier(parsed) >= 5 ? "heavy_armor" : "evasion";
  }

  private deriveMaterialTier(parsed: ParsedSignature): number {
    return MATERIAL_TIER_BY_ID[parsed.material] ?? 1;
  }

  private deriveMaterialTierBonus(parsed: ParsedSignature): number {
    return MATERIAL_XP_BONUS_BY_ID[parsed.material] ?? fallbackTierBonus(this.deriveMaterialTier(parsed));
  }

  private createXPEvent(
    playerId: string,
    skillId: string,
    amount: number,
    source: XPGainSource,
    itemSignature?: string,
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

export const combatDirector = new CombatDirector();
