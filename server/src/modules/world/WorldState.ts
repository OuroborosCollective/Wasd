export class WorldState {
  snapshot(data:any){
    return {
      capturedAt: Date.now(),
      data
    };
  }
}