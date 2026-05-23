// @ARE-GUARD-EXEMPT: Metadata, telemetry or legacy logic currently using wall-clock.
export class TaxLedger {
  private entries: any[] = [];

  record(cityId: string, amount: number, source: string) {
    const entry = { cityId, amount, source, createdAt: Date.now() };
    this.entries.push(entry);
    return entry;
  }

  all() {
    return this.entries;
  }
}