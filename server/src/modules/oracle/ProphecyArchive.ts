export class ProphecyArchive {
  private entries: any[] = [];
  add(entry: any) { this.entries.push({ timestamp: Date.now(), ...entry }); }
  all() { return this.entries; }
}