export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };

    attacker.stamina -= 10;

    const hitChance = this.hitChance(attacker, defender);
    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0 };
    }

    const damage = this.calculateDamage(attacker, defender);
    defender.health = Math.max(0, defender.health - damage);

    return {
      success: true,
      hit: true,
      damage,
      defenderHealth: defender.health
    };
  }

  hitChance(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    return Math.min(0.95, Math.max(0.1, atk / (atk + def)));
  }

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}