// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class ProphecyArchive {
  private entries:any[] = [];
  add(prophecy:any){ this.entries.push({ timestamp:Date.now(), prophecy }); }
  list(){ return this.entries; }
}
