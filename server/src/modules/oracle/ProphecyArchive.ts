export class ProphecyArchive {
  private entries: any[] = [];
  add(entry: any, timestamp = 0) { this.entries.push({ timestamp, ...entry }); }
  all() { return this.entries; }
}
