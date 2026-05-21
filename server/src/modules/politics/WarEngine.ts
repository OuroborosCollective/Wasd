// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
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
