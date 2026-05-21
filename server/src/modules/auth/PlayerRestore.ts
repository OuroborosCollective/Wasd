// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class PlayerRestore {
  restore(saved: any) {
    return {
      ...saved,
      restoredAt: Date.now()
    };
  }
}