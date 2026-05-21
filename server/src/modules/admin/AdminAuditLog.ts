// @ARE-GUARD-EXEMPT: Infrastructure/Meta/Telemetry logic; not world-state critical.
export class AdminAuditLog {
  private entries:any[] = [];
  write(entry:any) { this.entries.push({ ts: Date.now(), ...entry }); }
  all() { return this.entries; }
}