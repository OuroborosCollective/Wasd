export class MarketLedger {
  private entries:any[] = [];
  record(entry:any){ this.entries.push({ timestamp:Date.now(), ...entry }); } // ARE-DETERMINISM-ALLOW
  all(){ return this.entries; }
}