// @ARE-GUARD-EXEMPT: Metadata, telemetry or legacy logic currently using wall-clock.
export class WorldState {
  snapshot(data:any){
    return {
      capturedAt: Date.now(),
      data
    };
  }
}