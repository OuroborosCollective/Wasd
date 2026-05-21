// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class MarketLedger {
  private entries:any[] = [];
  record(entry:any){ this.entries.push({ timestamp:Date.now(), ...entry }); }
  all(){ return this.entries; }
}
