import { NPCPersonalityEngine } from "./NPCPersonalityEngine.js";
import { NPCMemoryEngine } from "./NPCMemoryEngine.js";
import { NPCGenealogyEngine } from "./NPCGenealogyEngine.js";

export class NPCSystem {
  private npcs: Map<string, any> = new Map();
  public personalityEngine: NPCPersonalityEngine;
  public memoryEngine: NPCMemoryEngine;
  public genealogyEngine: NPCGenealogyEngine;

  constructor() {
    this.personalityEngine = new NPCPersonalityEngine();
    this.memoryEngine = new NPCMemoryEngine();
    this.genealogyEngine = new NPCGenealogyEngine();
  }

  createNPC(id: string, name: string, x: number, y: number) {
    const npc = {
      id,
      name,
      position: { x, y, z: 0 },
      health: 100,
      maxHealth: 100,
      stamina: 100,
      inventory: [],
      personality: this.personalityEngine.generateTraits(),
      memory: [],
      dna: this.genealogyEngine.createLineage(id, "Unknown")
    };
    this.npcs.set(id, npc);
    return npc;
  }

  getNPC(id: string) {
    return this.npcs.get(id);
  }

  handleInteraction(npcId: string, playerId: string) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    // Basic dialogue for now
    let text = `Hello, I am ${npc.name}. Welcome to Areloria!`;
    let questId = null;

    if (npcId === "npc_1") {
      text = "Greetings, traveler! I have a task for you if you're interested. Could you check on my friend at the distant outpost?";
      questId = "first_steps";
    } else if (npcId === "npc_2") {
      text = "Oh, you're here! My friend sent you? Thank you for checking in. I'm doing fine, just keeping watch.";
    }

    return {
      source: npc.name,
      text,
      questId
    };
  }

  getAllNPCs() {
    return Array.from(this.npcs.values());
  }

  tick() {
    // Process NPC AI, schedules, needs
  }
}
