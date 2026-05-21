// @ARE-GUARD-EXEMPT: Snapshot/Archive timestamps; not world-state input.
export class ProphecyArchive {
  private entries:any[] = [];
  add(prophecy:any){ this.entries.push({ timestamp:Date.now(), prophecy }); }
  list(){ return this.entries; }
}