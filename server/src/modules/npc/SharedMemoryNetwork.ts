import { NPCMemoryEngine } from "./NPCMemoryEngine.js";

export class SharedMemoryNetwork {
  constructor(private memoryEngine: NPCMemoryEngine) {}

  share(fromNpcId: string, toNpcId: string) {
    const fromMemories = this.memoryEngine.recall(fromNpcId);
    if (fromMemories.length === 0) return false;

    // Pick a random memory to share
    const memoryToShare = fromMemories[Math.floor(Math.random() * fromMemories.length)];

    this.memoryEngine.remember(toNpcId, {
      ...memoryToShare.event,
      sharedFrom: fromNpcId,
      timestamp: Date.now()
    });

    return true;
  }

  propagate(npcs: any[]) {
    // Spatial sharing
    for (let i = 0; i < npcs.length; i++) {
      for (let j = i + 1; j < npcs.length; j++) {
        const npc1 = npcs[i];
        const npc2 = npcs[j];
        const dist = Math.hypot(npc1.position.x - npc2.position.x, npc1.position.y - npc2.position.y);

        if (dist < 10 && Math.random() < 0.1) {
          this.share(npc1.id, npc2.id);
          this.share(npc2.id, npc1.id);
        }
      }
    }
  }
}
