export class CombatSystem {
  attack(attacker: any, defender: any) {
    if (attacker.stamina <= 0) return { success: false, reason: "no_stamina" };
    attacker.stamina -= 8;

    const hitChance = this.calculateHitChance(attacker, defender);
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

  calculateDamage(attacker: any, defender: any) {
    const atk = attacker.skills?.combat?.level ?? 1;
    const def = defender.skills?.combat?.level ?? 1;
    const base = 5 + atk;
    const mitigation = Math.floor(def * 0.3);
    return Math.max(1, base - mitigation + Math.floor(Math.random() * 4));
  }
}