// @ARE-GUARD-EXEMPT: Capture timestamps; not world-state input.
export class WorldState {
  snapshot(data:any){
    return {
      capturedAt: Date.now(),
      data
    };
  }
}