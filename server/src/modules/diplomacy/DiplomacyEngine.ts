// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class DiplomacyEngine {
  makeTreaty(a: string, b: string, type: string) {
    return { from: a, to: b, type, signedAt: Date.now() };
  }
}
