export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}