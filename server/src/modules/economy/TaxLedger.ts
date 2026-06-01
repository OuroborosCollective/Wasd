import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

/**
 * TaxLedger - Deterministic tax record keeping.
 * Injected AREClock ensures record timestamps are derived from simulation time,
 * maintaining absolute causality across replays.
 */
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
