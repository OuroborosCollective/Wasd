export class CombatSystem {
  attack(attacker: any, defender: any) {
    // Stamina check
    const cost = 15;
    if ((attacker.stamina || 0) < cost) {
      return { success: false, reason: "exhausted" };
    }
    attacker.stamina -= cost;

    // Hit calculation
    const hitChance = this.calculateHitChance(attacker, defender);
    const isCritical = Math.random() < 0.05 + (attacker.skills?.dexterity?.level || 0) * 0.01;

    if (Math.random() > hitChance) {
      return { success: true, hit: false, damage: 0, reason: "miss" };
    }

    // Damage calculation
    let damage = this.calculateDamage(attacker, defender);
    if (isCritical) {
      damage = Math.floor(damage * 1.5);
    }

    defender.health = Math.max(0, (defender.health || 0) - damage);

    return {
      success: true,
      hit: true,
      damage,
      isCritical,
      defenderHealth: defender.health
    };
  }

  private calculateHitChance(attacker: any, defender: any) {
    const atk = (attacker.skills?.combat?.level || 1) + (attacker.skills?.dexterity?.level || 0);
    const def = (defender.skills?.combat?.level || 1) + (defender.skills?.agility?.level || 0);
    const base = 0.75;
    const ratio = atk / (atk + def);
    return Math.min(0.98, Math.max(0.2, base * ratio * 2));
  }

  private calculateDamage(attacker: any, defender: any) {
    const strength = attacker.skills?.strength?.level || 1;
    const combat = attacker.skills?.combat?.level || 1;
    const defense = defender.skills?.defense?.level || 1;

    // Weapon bonus
    const weaponDmg = attacker.equipment?.weapon?.damage || 5;

    const baseDamage = weaponDmg + (strength * 0.5) + (combat * 0.2);
    const mitigation = Math.min(baseDamage * 0.8, defense * 0.3);

    const finalDamage = Math.max(1, Math.floor(baseDamage - mitigation + (Math.random() * 5)));
    return finalDamage;
  }
}
