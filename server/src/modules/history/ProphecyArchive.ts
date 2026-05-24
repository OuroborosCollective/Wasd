// @ARE-GUARD-EXEMPT: Legacy non-deterministic calls permitted for telemetry/meta paths
export class ProphecyArchive {
  private entries:any[] = [];
  add(prophecy:any){ this.entries.push({ timestamp:Date.now(), prophecy }); }
  list(){ return this.entries; }
}