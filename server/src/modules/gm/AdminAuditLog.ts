// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class AdminAuditLog {
  private entries: any[] = [];
  log(entry: any) { this.entries.push({ timestamp: Date.now(), ...entry }); }
  all() { return this.entries; }
}
