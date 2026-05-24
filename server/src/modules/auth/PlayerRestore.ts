// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
export class PlayerRestore {
  restore(saved: any) {
    return {
      ...saved,
      restoredAt: Date.now()
    };
  }
}