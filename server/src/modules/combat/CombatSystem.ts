import { createARESeed, SeededARERng, type ARERng } from "../../core/determinism/AREDeterminism.js";
import { WeatherCombatBridge } from "./WeatherCombatBridge.js";

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
  attack(attacker: any, defender: any, weather = "clear"): CombatResult {
    return this.resolveAttack(attacker, defender, 0, weather);
  }

  /**
   * Melee attack with optional flat weapon bonus (ItemRegistry `damage` on equipped weapon).
   */
  attackWithWeapon(attacker: any, defender: any, weaponBonus = 0, weather = "clear"): CombatResult {
    return this.resolveAttack(attacker, defender, weaponBonus, weather);
  }

  /** Spell / skill hit — no stamina cost */
  spellStrike(attacker: any, defender: any, spellPower: number, weather = "clear"): CombatResult {
    const rng = this.createCombatRng("spellStrike", attacker, defender, spellPower);
    const weatherHitMult = WeatherCombatBridge.getHitMultiplier(weather);
    const hitChance = this.calculateHitChance(attacker, defender) * weatherHitMult;

    if (rng.nextFloat() > hitChance) {
      return { success: true, hit: false, damage: 0, crit: false, fx: { kind: "miss" } };
    }
    const crit = rng.nextFloat() < 0.08;
    const baseDamage = this.calculateDamage(attacker, defender, spellPower, rng.fork("damage"));
    const weatherDamageMult = WeatherCombatBridge.getDamageMultiplier(weather);
    const damage = Math.floor((crit ? Math.floor(baseDamage * 1.75) : baseDamage) * weatherDamageMult);
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

  private resolveAttack(attacker: any, defender: any, weaponBonus: number, weather = "clear"): CombatResult {
    const atkStamina = typeof attacker.stamina === "number" ? attacker.stamina : 100;
    if (atkStamina <= 0) return { success: false, hit: false, damage: 0, reason: "no_stamina" };
    attacker.stamina = atkStamina - 8;

    const rng = this.createCombatRng("attack", attacker, defender, weaponBonus);
    const weatherHitMult = WeatherCombatBridge.getHitMultiplier(weather);
    const hitChance = this.calculateHitChance(attacker, defender) * weatherHitMult;

    if (rng.nextFloat() > hitChance) {
      return { success: true, hit: false, damage: 0, crit: false, fx: { kind: "miss" } };
    }

    const crit = rng.nextFloat() < 0.08;
    const baseDamage = this.calculateDamage(attacker, defender, weaponBonus, rng.fork("damage"));
    const weatherDamageMult = WeatherCombatBridge.getDamageMultiplier(weather);
    const damage = Math.floor((crit ? Math.floor(baseDamage * 1.75) : baseDamage) * weatherDamageMult);
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

  calculateDamage(attacker: any, defender: any, weaponBonus = 0, rng?: ARERng) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk + Math.max(0, weaponBonus);
    const mitigation = Math.floor(def * 0.3);
    const damageRng = rng ?? this.createCombatRng("damage", attacker, defender, weaponBonus);
    return Math.max(1, base - mitigation + damageRng.nextInt(4));
  }

  private createCombatRng(kind: string, attacker: any, defender: any, salt: number): SeededARERng {
    const sequence = this.nextCombatSequence(attacker);
    return new SeededARERng(createARESeed([
      "combat",
      kind,
      this.stableEntityId(attacker),
      this.stableEntityId(defender),
      sequence,
      salt,
      attacker?.stamina ?? 0,
      defender?.health ?? 0,
    ]));
  }

  private nextCombatSequence(entity: any): number {
    if (!entity || typeof entity !== "object") return 0;
    const previous = Number.isFinite(entity.__areCombatSequence) ? Number(entity.__areCombatSequence) : 0;
    const next = previous + 1;
    entity.__areCombatSequence = next;
    return next;
  }

  private stableEntityId(entity: any): string {
    if (typeof entity === "string" || typeof entity === "number") return String(entity);
    return String(
      entity?.id ??
      entity?.playerId ??
      entity?.npcId ??
      entity?.identity?.npcId ??
      entity?.name ??
      "entity"
    );
  }
}
