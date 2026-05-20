// @ARE-GUARD-EXEMPT: non-sim module
export class ChunkActivation {
  activate(chunkId:string){
    return { chunkId, active: true };
  }
}