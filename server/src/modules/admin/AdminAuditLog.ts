// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
export class AdminAuditLog {
  private entries:any[] = [];
  write(entry:any) { this.entries.push({ ts: Date.now(), ...entry }); }
  all() { return this.entries; }
}