export class HistoricalMapEngine {
  buildSnapshotMap(snapshot:any){
    return {
      timestamp: snapshot?.timestamp ?? 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      regions: snapshot?.state?.regions ?? []
    };
  }
}