import { deterministicNow } from "../../core/determinism/AREDeterminism.js";

export class NPCMemoryEngine {
  private memory = new Map<string, any[]>();

  remember(npcId: string, event: any) {
    if (!this.memory.has(npcId)) this.memory.set(npcId, []);
    this.memory.get(npcId)!.push({
      timestamp: deterministicNow(event?.tick ?? event?.timestamp ?? npcId),
      event
    });
  }

  recall(npcId: string) {
    return this.memory.get(npcId) || [];
  }
}
