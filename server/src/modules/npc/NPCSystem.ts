import { NPCPersonalityEngine } from "./NPCPersonalityEngine.js";
import { NPCMemoryEngine } from "./NPCMemoryEngine.js";
import { NPCGenealogyEngine } from "./NPCGenealogyEngine.js";
import { TraitResonanceEngine } from "./TraitResonanceEngine.js";
import { NPCScheduleRegistry } from "./NPCScheduleRegistry.js";
import fs from "fs";
import path from "path";
import { resolveContentFile } from "../content/contentDataRoot.js";

export class NPCSystem {
  private npcs: Map<string, any> = new Map();
  private npcDefinitions: Map<string, any> = new Map();
  private dialogues: Map<string, any> = new Map();

  public personalityEngine: NPCPersonalityEngine;
  public memoryEngine: NPCMemoryEngine;
  public genealogyEngine: NPCGenealogyEngine;
  public resonanceEngine: TraitResonanceEngine;

  constructor() {
    this.personalityEngine = new NPCPersonalityEngine();
    this.memoryEngine = new NPCMemoryEngine();
    this.genealogyEngine = new NPCGenealogyEngine();
    this.resonanceEngine = new TraitResonanceEngine();
    this.loadData();
  }

  private resolveGameDataPath(file: string): string | null {
    const p = resolveContentFile(file);
    if (fs.existsSync(p)) return p;
    return null;
  }

  private loadData() {
    try {
      const npcsPath = this.resolveGameDataPath("npc/npcs.json");
      const dialoguesPath = this.resolveGameDataPath("dialogue/dialogues.json");

      if (npcsPath) {
        const npcData = JSON.parse(fs.readFileSync(npcsPath, "utf-8"));
        npcData.forEach((npc: any) => this.npcDefinitions.set(npc.id, npc));
      }

      if (dialoguesPath) {
        const dialogueData = JSON.parse(fs.readFileSync(dialoguesPath, "utf-8"));
        dialogueData.forEach((dialogue: any) => this.dialogues.set(dialogue.id, dialogue));
      }
    } catch (error) {
      console.error("Error loading NPC or Dialogue data:", error);
    }
  }

  createNPC(id: string, name: string, x: number, y: number) {
    const def = this.npcDefinitions.get(id);
    const npc = {
      id,
      name: name || (def ? def.name : "Unknown NPC"),
      role: def ? def.role : "Citizen",
      faction: def?.faction ?? "Neutral",
      position: { x, y, z: 0 },
      homePosition: { x, y, z: 0 },
      health: def?.stats?.health || 100,
      maxHealth: def?.stats?.maxHealth || 100,
      traits: this.personalityEngine.generateTraits(),
      needs: { hunger: 100, energy: 100 },
      state: "idle",
      stateTimer: 0,
      dialogueId: def?.dialogueId || "default",
    };
    this.npcs.set(id, npc);
    return npc;
  }

  removeNPC(npcId: string): boolean {
    return this.npcs.delete(npcId);
  }

  getNPC(npcId: string) {
    return this.npcs.get(npcId);
  }


  setRuntimeDialogue(npcId: string, text: string, choices: any[] = []): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc) return false;

    const runtimeId = `runtime-${npcId}`;
    this.dialogues.set(runtimeId, { id: runtimeId, text, choices });
    npc.dialogueId = runtimeId;
    return true;
  }

  getDialogue(npcId: string, player: any) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    const dialogue = this.dialogues.get(npc.dialogueId);
    if (!dialogue) return null;

    let text = dialogue.text || "Hello.";
    let choices = dialogue.choices || [];
    let questId = null;

    const playerQuests = player.quests || [];
    const playerFlags = player.flags || {};
    const playerReputation = player.reputation || {};

    // Simplified restoration of dialogue logic
    if (dialogue.questHooks) {
      for (const qId of dialogue.questHooks) {
        const playerQuest = playerQuests.find((pq: any) => pq.id === qId);
        if (!playerQuest) {
          text = dialogue.questStartLines?.[qId] || text;
          questId = qId;
          break;
        }
      }
    }

    let activeNodeId = "root";
    if (!questId && dialogue.nodes) {
       const node = dialogue.nodes[activeNodeId];
       if (node) {
         text = node.text;
         choices = node.choices || [];
       }
    } else if (questId) {
      choices = [
        { id: "sys_quest_accept", text: "Accept quest", nextNodeId: "__accept__" },
        { id: "sys_quest_decline", text: "Not now", nextNodeId: "__decline__" },
      ];
    }

    return {
      source: npc.name,
      text,
      questId,
      choices,
      npcId,
      nodeId: activeNodeId,
    };
  }

  handleChoice(npcId: string, nodeId: string, choiceId: string, player: any, pendingQuestId: string | null) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    if (choiceId === "sys_quest_accept" && pendingQuestId) {
      return {
        source: npc.name,
        text: "Good luck.",
        npcId,
        nodeId: "root",
        startQuestId: pendingQuestId,
      };
    }

    return { source: npc.name, text: "I see.", npcId, nodeId: "root" };
  }

  getAllNPCs() {
    return Array.from(this.npcs.values());
  }

  getNPCsMap(): Map<string, any> {
    return this.npcs;
  }

  tick(players: any[], worldTime: number) {
    const now = Date.now();
    const chunksToUpdate = new Set<string>();

    for (const npc of this.npcs.values()) {
      const oldKey = this.resonanceEngine.getChunkKey(npc.position.x, npc.position.y);

      if (!npc.needs) npc.needs = { hunger: 100, energy: 100 };

      // Needs decay
      let decayMultiplier = 1.0;
      if (npc.state === "wandering") decayMultiplier = 1.5;
      if (npc.state === "combat") decayMultiplier = 3.0;
      npc.needs.hunger = Math.max(0, npc.needs.hunger - (0.01 * decayMultiplier));
      npc.needs.energy = Math.max(0, npc.needs.energy - (0.005 * decayMultiplier));

      // 1. Proximity Check (Restored for tests)
      let interacting = false;
      for (const player of players) {
        const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
        if (dist < 15) {
          npc.state = "interacting";
          npc.stateTimer = now + 5000;
          npc.targetPosition = null;
          interacting = true;
          break;
        }
      }

      if (interacting) continue;

      if (npc.state === "interacting" && now > npc.stateTimer) {
        npc.state = "idle";
      }

      // Movement logic
      if (npc.targetPosition) {
        const dx = npc.targetPosition.x - npc.position.x;
        const dy = npc.targetPosition.y - npc.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) {
          npc.targetPosition = null;
        } else {
          const speed = 0.5;
          npc.position.x += (dx / dist) * speed;
          npc.position.y += (dy / dist) * speed;
          chunksToUpdate.add(oldKey);
          chunksToUpdate.add(this.resonanceEngine.getChunkKey(npc.position.x, npc.position.y));
        }
      } else if (npc.state === "idle" || npc.state === "wandering") {
        if (now > npc.stateTimer) {
          if (Math.random() < 0.3) {
            npc.state = "wandering";
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 20;
            npc.targetPosition = {
              x: npc.homePosition.x + Math.cos(angle) * dist,
              y: npc.homePosition.y + Math.sin(angle) * dist
            };
            npc.stateTimer = now + 10000;
          } else {
            npc.state = "idle";
            npc.stateTimer = now + 2000;
          }
        }
      }
    }

    // Update resonance
    if (chunksToUpdate.size > 0 || worldTime % 100 === 0) {
      const npcByChunk = new Map<string, any[]>();
      for (const npc of this.npcs.values()) {
        const key = this.resonanceEngine.getChunkKey(npc.position.x, npc.position.y);
        if (!npcByChunk.has(key)) npcByChunk.set(key, []);
        npcByChunk.get(key)!.push(npc);
      }
      for (const [key, npcs] of npcByChunk.entries()) {
        this.resonanceEngine.updateResonance(key, npcs);
      }
    }
  }
}
