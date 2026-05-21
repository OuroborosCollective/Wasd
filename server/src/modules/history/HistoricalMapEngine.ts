// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class HistoricalMapEngine {
  buildSnapshotMap(snapshot:any){
    return {
      timestamp: snapshot?.timestamp ?? Date.now(),
      regions: snapshot?.state?.regions ?? []
    };
  }
}
