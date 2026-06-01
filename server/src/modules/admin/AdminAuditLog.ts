export class AdminAuditLog {
  private entries:any[] = [];
  write(entry:any) { this.entries.push({ ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */, ...entry }); }
  all() { return this.entries; }
}