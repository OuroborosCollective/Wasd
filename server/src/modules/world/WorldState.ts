export class WorldState {
  snapshot(data:any){
    return {
      capturedAt: Date.now(), /* @are-determinism-allow */
      data
    };
  }
}