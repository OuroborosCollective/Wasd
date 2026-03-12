export class AdminAuditLog {
  private entries: any[] = [];
  log(entry: any) { this.entries.push({ timestamp: Date.now(), ...entry }); }
  all() { return this.entries; }
}