import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

/**
 * MarketLedger - Deterministic market activity logging.
 * Injected AREClock ensures timestamps align with simulation ticks.
 */
export class MarketLedger {
  private entries: any[] = [];

  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  record(entry: any) {
    this.entries.push({ timestamp: this.clock.now(), ...entry });
  }

  all() {
    return this.entries;
  }
}
