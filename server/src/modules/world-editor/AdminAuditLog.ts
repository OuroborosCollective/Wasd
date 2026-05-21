// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class AdminAuditLog {
  private entries: any[] = [];

  log(actorId: string, action: string, payload: any) {
    this.entries.push({
      actorId,
      action,
      payload,
      timestamp: Date.now()
    });
  }

  all() {
    return this.entries;
  }
}
