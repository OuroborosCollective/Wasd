// @ARE-GUARD-EXEMPT: non-sim module
export class ProphecyArchive {
  private entries:any[] = [];
  add(entry:any){ this.entries.push(entry); }
  all(){ return this.entries; }
}