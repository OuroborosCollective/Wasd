// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
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