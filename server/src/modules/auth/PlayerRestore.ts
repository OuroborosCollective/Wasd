// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class PlayerRestore {
  restore(saved: any) {
    return {
      ...saved,
      restoredAt: Date.now()
    };
  }
}
