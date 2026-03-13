import { SkillSystem } from '../skill/SkillSystem';
import { LootGenerator } from '../loot/LootGenerator';
import { LootDropSystem } from '../loot/LootDropSystem'; // Importiere das LootDropSystem

export class CombatSystem {
  private skillSystem: SkillSystem;
  private lootGenerator: LootGenerator;
  private lootDropSystem: LootDropSystem; // Instanz des LootDropSystem

  constructor() {
    this.skillSystem = new SkillSystem();
    this.lootGenerator = new LootGenerator();
    this.lootDropSystem = new LootDropSystem(); // Initialisiere das LootDropSystem
  }

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

    // XP-Vergabe für den Angreifer
    if (attacker.isPlayer) { // Annahme: Nur Spieler erhalten XP
      const xpAmount = Math.floor(damage / 2); // XP basierend auf verursachtem Schaden
      this.skillSystem.addXP(attacker, 'attack', xpAmount);
      this.skillSystem.addXP(attacker, 'strength', xpAmount * 0.8);
      this.skillSystem.addXP(attacker, 'defence', xpAmount * 0.5); // Verteidigung-XP für den Angreifer, da er im Kampf ist
      // TODO: Weitere Skill-XP basierend auf Waffentyp, Magie etc.
    }

    // Loot-Generierung, wenn der Verteidiger besiegt ist
    if (defender.health <= 0) {
      if (defender.isMonster) { // Annahme: Nur Monster droppen Loot
        const loot = this.lootGenerator.generateLoot(
          defender.type, // Monster-Typ für Loot-Tabelle
          defender.level, // Monster-Level
          attacker.level // Spieler-Level
        );
        
        // Loot in der Welt ablegen
        // Annahme: defender.position ist verfügbar und hat x, y, z
        if (loot.length > 0 && defender.position) {
          this.lootDropSystem.dropLoot(loot, defender.position, attacker.id); // Loot an Monsterposition droppen
        }

        return { success: true, hit: true, damage, isCritical, defenderHealth: defender.health, lootDropped: loot };
      }
    }

    return {
      success: true,
      hit: true,
      damage,
      isCritical,
      defenderHealth: defender.health
    };
  }

  private calculateHitChance(attacker: any, defender: any) {
    const atk = (attacker.skills?.attack?.level || 1) + (attacker.skills?.dexterity?.level || 0);
    const def = (defender.skills?.defence?.level || 1) + (defender.skills?.agility?.level || 0);
    const base = 0.75;
    const ratio = atk / (atk + def);
    return Math.min(0.98, Math.max(0.2, base * ratio * 2));
  }

  private calculateDamage(attacker: any, defender: any) {
    const strength = attacker.skills?.strength?.level || 1;
    const attackSkill = attacker.skills?.attack?.level || 1;
    const defenceSkill = defender.skills?.defence?.level || 1;

    // Weapon bonus
    const weaponDmg = attacker.equipment?.weapon?.stats?.damage || 5; // Nutze die neuen Item-Stats

    const baseDamage = weaponDmg + (strength * 0.5) + (attackSkill * 0.2);
    const mitigation = Math.min(baseDamage * 0.8, defenceSkill * 0.3);

    const finalDamage = Math.max(1, Math.floor(baseDamage - mitigation + (Math.random() * 5)));
    return finalDamage;
  }
}
