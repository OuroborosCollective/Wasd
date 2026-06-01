export class AdminAuditLog {
  private entries: any[] = [];
  log(entry: any) { this.entries.push({ timestamp: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */, ...entry }); }
  all() { return this.entries; }
}