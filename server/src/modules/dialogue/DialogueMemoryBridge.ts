export class DialogueMemoryBridge {
  blend(memory:any[], tags:string[]){
    return {
      memoryCount: memory.length,
      tags
    };
  }
}