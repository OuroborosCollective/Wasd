export class AssetImportQueue {
  private queue:any[] = [];
  add(asset:any){
    this.queue.push({ ...asset, queuedAt: Date.now() });
    return asset;
  }
  list(){
    return this.queue;
  }
}