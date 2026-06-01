import { type AREClock, SystemAREClock } from "../../core/determinism/AREDeterminism.js";

export class MarketLedger {
  private entries:any[] = [];

  constructor(private readonly clock: AREClock = new SystemAREClock()) {}

  record(entry:any){ this.entries.push({ timestamp:this.clock.now(), ...entry }); }
  all(){ return this.entries; }
}