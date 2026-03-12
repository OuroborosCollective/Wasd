export class SnapshotArchive {
  private archive:any[] = [];
  push(snapshot:any){
    this.archive.push(snapshot);
    return snapshot;
  }
  latest(){
    return this.archive[this.archive.length - 1] || null;
  }
}