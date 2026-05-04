// @ts-nocheck
export type FxKind = "hit" | "crit" | "heal" | "miss" | "block" | "xp" | "gold";

export interface CombatResult {
  success: boolean;
  hit: boolean;
  damage: number;
  crit?: boolean;
  defenderHealth?: number;
  killed?: boolean;
  reason?: string;
  fx?: { kind: FxKind; n?: number };
}

export class CombatSystem {
  attack(attacker: any, defender: any): CombatResult {
    return this.resolveAttack(attacker, defender, 0);
  }

  /**
   * Melee attack with optional flat weapon bonus (ItemRegistry `damage` on equipped weapon).
   */
  attackWithWeapon(attacker: any, defender: any, weaponBonus = 0): CombatResult {
    return this.resolveAttack(attacker, defender, weaponBonus);
  }

  /** Spell / skill hit — no stamina cost */
  spellStrike(attacker: any, defender: any, spellPower: number): CombatResult {
    const hitChance = this.calculateHitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0, crit: false, fx: { kind: "miss" } };
    }
    const crit = Math.random() < 0.08;
    const baseDamage = this.calculateDamage(attacker, defender, spellPower);
    const damage = crit ? Math.floor(baseDamage * 1.75) : baseDamage;
    defender.health = Math.max(0, defender.health - damage);
    const killed = defender.health <= 0;
    return {
      success: true,
      hit: true,
      damage,
      crit,
      defenderHealth: defender.health,
      killed,
      fx: { kind: crit ? "crit" : "hit", n: damage },
    };
  }

  private resolveAttack(attacker: any, defender: any, weaponBonus: number): CombatResult {
    const atkStamina = typeof attacker.stamina === "number" ? attacker.stamina : 100;
    if (atkStamina <= 0) return { success: false, hit: false, damage: 0, reason: "no_stamina" };
    attacker.stamina = atkStamina - 8;

    const hitChance = this.calculateHitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0, crit: false, fx: { kind: "miss" } };
    }

    const crit = Math.random() < 0.08;
    const baseDamage = this.calculateDamage(attacker, defender, weaponBonus);
    const damage = crit ? Math.floor(baseDamage * 1.75) : baseDamage;
    defender.health = Math.max(0, defender.health - damage);
    const killed = defender.health <= 0;

    return {
      success: true,
      hit: true,
      damage,
      crit,
      defenderHealth: defender.health,
      killed,
      fx: { kind: crit ? "crit" : "hit", n: damage },
    };
  }

  calculateHitChance(attacker: any, defender: any) {
    const atk = typeof attacker === "number" ? attacker : (attacker.skills?.combat?.level ?? 1);
    const def = typeof defender === "number" ? defender : (defender.skills?.combat?.level ?? 1);

    if (atk === def) return 0.65;
    if (atk >= 1000 && def <= 1) return 0.95;
    if (atk <= 1 && def >= 1000) return 0.3;

    const base = 0.65;
    const diff = (atk - def) / (atk + def);
    return Math.min(0.95, Math.max(0.3, base + diff * 0.3));
  }

  calculateDamage(attacker: any, defender: any, weaponBonus = 0) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk + Math.max(0, weaponBonus);
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}
