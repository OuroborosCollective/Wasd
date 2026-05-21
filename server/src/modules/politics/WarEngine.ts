// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class WarEngine {
  declareWar(attacker: any, defender: any) {
    return {
      type: "war_declared",
      attacker: attacker.id,
      defender: defender.id,
      timestamp: Date.now()
    };
  }
}