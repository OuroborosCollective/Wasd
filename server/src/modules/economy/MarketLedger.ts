// @ARE-GUARD-EXEMPT: Ledger/Update timestamps; not world-state input.
export class MarketLedger {
  private entries:any[] = [];
  record(entry:any){ this.entries.push({ timestamp:Date.now(), ...entry }); }
  all(){ return this.entries; }
}