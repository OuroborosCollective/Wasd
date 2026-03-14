import { ItemRegistry } from "../inventory/ItemRegistry.js";

export interface CombatResult {
  success: boolean;
  hit: boolean;
  critical: boolean;
  dodged: boolean;
  damage: number;
  defenderHealth: number;
  defenderMaxHealth: number;
  attackerStamina: number;
  xpGained: number;
  reason?: string;
}

export class CombatSystem {
  private readonly BASE_DAMAGE = 5;
  private readonly CRIT_MULTIPLIER = 2.0;
  private readonly STAMINA_COST = 8;
  private readonly STAMINA_REGEN_RATE = 2;

  attack(attacker: any, defender: any): CombatResult {
    if ((attacker.stamina || 0) < this.STAMINA_COST) {
      return {
        success: false, hit: false, critical: false, dodged: false,
        damage: 0, defenderHealth: defender.health, defenderMaxHealth: defender.maxHealth || 100,
        attackerStamina: attacker.stamina || 0, xpGained: 0, reason: "no_stamina"
      };
    }
    attacker.stamina = (attacker.stamina || 100) - this.STAMINA_COST;

    const attackLevel = attacker.skills?.combat?.level ?? 1;
    const defenseLevel = defender.skills?.combat?.level ?? 1;
    const hitChance = this.calculateHitChance(attackLevel, defenseLevel);

    // Dodge check
    const dodgeChance = Math.min(0.3, defenseLevel * 0.02);
    if (Math.random() < dodgeChance) {
      return {
        success: true, hit: false, critical: false, dodged: true,
        damage: 0, defenderHealth: defender.health, defenderMaxHealth: defender.maxHealth || 100,
        attackerStamina: attacker.stamina, xpGained: 1
      };
    }

    if (Math.random() > hitChance) {
      return {
        success: true, hit: false, critical: false, dodged: false,
        damage: 0, defenderHealth: defender.health, defenderMaxHealth: defender.maxHealth || 100,
        attackerStamina: attacker.stamina, xpGained: 1
      };
    }

    let damage = this.calculateDamage(attacker, defender);
    let critical = false;
    const critChance = Math.min(0.25, 0.05 + attackLevel * 0.01);
    if (Math.random() < critChance) {
      damage = Math.floor(damage * this.CRIT_MULTIPLIER);
      critical = true;
    }

    defender.health = Math.max(0, (defender.health || 0) - damage);
    const xpGained = Math.max(1, Math.floor(damage * 0.5) + (critical ? 5 : 0));

    return {
      success: true, hit: true, critical, dodged: false,
      damage, defenderHealth: defender.health, defenderMaxHealth: defender.maxHealth || 100,
      attackerStamina: attacker.stamina, xpGained
    };
  }

  calculateHitChance(attackLevel: number, defenseLevel: number): number {
    if (attackLevel >= 1000) return 0.95;
    if (defenseLevel >= 1000) return 0.3;
    const ratio = attackLevel / (attackLevel + defenseLevel);
    return Math.min(0.95, Math.max(0.3, 0.5 + ratio * 0.3));
  }

  calculateDamage(attacker: any, defender: any): number {
    const attackLevel = attacker.skills?.combat?.level ?? 1;
    const defenseLevel = defender.skills?.combat?.level ?? 1;
    let baseDamage = this.BASE_DAMAGE + Math.floor(attackLevel * 1.5);
    if (attacker.equipment?.weapon) {
      const weaponDef = ItemRegistry.getItem(attacker.equipment.weapon.id);
      if (weaponDef?.damage) baseDamage += weaponDef.damage;
    }
    const mitigation = Math.floor(defenseLevel * 0.5);
    const variance = 0.8 + Math.random() * 0.4;
    return Math.max(1, Math.floor((baseDamage - mitigation) * variance));
  }

  regenStamina(entity: any): void {
    if (entity.stamina === undefined) entity.stamina = 100;
    if (entity.maxStamina === undefined) entity.maxStamina = 100;
    entity.stamina = Math.min(entity.maxStamina, entity.stamina + this.STAMINA_REGEN_RATE);
  }

  regenHealth(entity: any, rate: number = 0.5): void {
    if (entity.health === undefined) entity.health = 100;
    if (entity.maxHealth === undefined) entity.maxHealth = 100;
    if (entity.health < entity.maxHealth && entity.health > 0) {
      entity.health = Math.min(entity.maxHealth, entity.health + rate);
    }
  }

  isAlive(entity: any): boolean {
    return (entity.health || 0) > 0;
  }
}