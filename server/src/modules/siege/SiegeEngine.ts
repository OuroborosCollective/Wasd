export class SiegeEngine {
  start(attacker:any, target:any) {
    return {
      type: "siege_started",
      attacker: attacker.id,
      target: target.id,
      startedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}