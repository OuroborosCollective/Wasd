import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class TaxLedger {
  private entries: any[] = [];

  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  record(cityId: string, amount: number, source: string) {
    const entry = { cityId, amount, source, createdAt: this.clock.now() };
    this.entries.push(entry);
    return entry;
  }

  all() {
    return this.entries;
  }
}
