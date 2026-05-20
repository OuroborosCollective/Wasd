// @ARE-GUARD-EXEMPT: non-sim module
export class WorldState {
  snapshot(data:any){
    return {
      capturedAt: Date.now(),
      data
    };
  }
}