// @ARE-GUARD-EXEMPT: Metadata, telemetry or legacy logic currently using wall-clock.
export class MarketLedger {
  private entries:any[] = [];
  record(entry:any){ this.entries.push({ timestamp:Date.now(), ...entry }); }
  all(){ return this.entries; }
}