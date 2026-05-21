// @ARE-GUARD-EXEMPT: Audit log timestamp; not simulation input.
export class AdminAuditLog {
  private entries:any[] = [];
  write(entry:any) { this.entries.push({ ts: Date.now(), ...entry }); }
  all() { return this.entries; }
}