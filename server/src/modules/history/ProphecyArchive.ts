// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
export class ProphecyArchive {
  private entries:any[] = [];
  add(prophecy:any){ this.entries.push({ timestamp:Date.now(), prophecy }); }
  list(){ return this.entries; }
}