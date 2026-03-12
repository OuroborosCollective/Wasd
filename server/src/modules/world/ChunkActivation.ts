export class ChunkActivation {
  activate(chunkId:string){
    return { chunkId, active: true };
  }
}