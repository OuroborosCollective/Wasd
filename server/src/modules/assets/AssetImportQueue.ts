// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
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