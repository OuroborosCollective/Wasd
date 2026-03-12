export class ContentManifest {
  private entries:any[] = [];
  add(entry:any){
    this.entries.push(entry);
    return entry;
  }
  all(){
    return this.entries;
  }
}