// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class KingdomLedger {
  private entries: any[] = [];
  record(entry: any) {
    this.entries.push({ ...entry, ts: Date.now() });
    return entry;
  }
  all() {
    return this.entries;
  }
}
