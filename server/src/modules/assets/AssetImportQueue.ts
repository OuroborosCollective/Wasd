export class AssetImportQueue {
  private queue:any[] = [];
  add(asset:any){
    this.queue.push({ ...asset, queuedAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */ });
    return asset;
  }
  list(){
    return this.queue;
  }
}