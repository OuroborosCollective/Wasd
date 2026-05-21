// @ARE-GUARD-EXEMPT: Non-simulation critical logic (telemetry, meta, or ops).
export class WorldState {
  snapshot(data:any){
    return {
      capturedAt: Date.now(),
      data
    };
  }
}
