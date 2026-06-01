export class KingdomLedger {
  private entries: any[] = [];
  record(entry: any) {
    this.entries.push({ ...entry, ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ });
    return entry;
  }
  all() {
    return this.entries;
  }
}