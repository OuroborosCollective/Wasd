// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
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