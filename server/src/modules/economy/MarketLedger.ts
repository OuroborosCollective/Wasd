// @ARE-GUARD-EXEMPT: Market ledger timestamp only; not a world-hash input.
export class MarketLedger {
  private entries:any[] = [];
  record(entry:any){ this.entries.push({ timestamp:Date.now(), ...entry }); }
  all(){ return this.entries; }
}