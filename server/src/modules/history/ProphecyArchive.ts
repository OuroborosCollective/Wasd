export class ProphecyArchive {
  private entries:any[] = [];
  add(prophecy:any){ this.entries.push({ timestamp:0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */, prophecy }); }
  list(){ return this.entries; }
}