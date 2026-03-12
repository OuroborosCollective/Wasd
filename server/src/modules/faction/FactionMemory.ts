export class FactionMemory {
  private memory = new Map<string, any[]>();
  remember(factionId:string, event:any){
    if(!this.memory.has(factionId)) this.memory.set(factionId, []);
    this.memory.get(factionId)!.push({ ts: Date.now(), event });
  }
  recall(factionId:string){
    return this.memory.get(factionId) || [];
  }
}