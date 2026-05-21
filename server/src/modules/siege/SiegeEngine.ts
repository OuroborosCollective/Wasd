// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class SiegeEngine {
  start(attacker:any, target:any) {
    return {
      type: "siege_started",
      attacker: attacker.id,
      target: target.id,
      startedAt: Date.now()
    };
  }
}