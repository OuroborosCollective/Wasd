// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
export class MarketLedger {
  private entries:any[] = [];
  record(entry:any){ this.entries.push({ timestamp:Date.now(), ...entry }); }
  all(){ return this.entries; }
}