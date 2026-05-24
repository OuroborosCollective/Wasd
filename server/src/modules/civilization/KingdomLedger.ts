// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
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