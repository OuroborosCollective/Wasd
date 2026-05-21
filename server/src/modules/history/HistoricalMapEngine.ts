// @ARE-GUARD-EXEMPT: Snapshot/Archive timestamps; not world-state input.
export class HistoricalMapEngine {
  buildSnapshotMap(snapshot:any){
    return {
      timestamp: snapshot?.timestamp ?? Date.now(),
      regions: snapshot?.state?.regions ?? []
    };
  }
}