import { NPCPersonalityEngine } from "./NPCPersonalityEngine.js";
import { NPCMemoryEngine } from "./NPCMemoryEngine.js";
import { NPCGenealogyEngine } from "./NPCGenealogyEngine.js";
import { SharedMemoryNetwork } from "./SharedMemoryNetwork.js";
import { MonsterSpawner } from "../monster/MonsterSpawner.js";
import fs from "fs";
import path from "path";

export class NPCSystem {
  private npcs: Map<string, any> = new Map();
  private npcDefinitions: Map<string, any> = new Map();
  private dialogues: Map<string, any> = new Map();

  public personalityEngine: NPCPersonalityEngine;
  public memoryEngine: NPCMemoryEngine;
  public sharedMemory: SharedMemoryNetwork;
  public monsterSpawner: MonsterSpawner;
  public genealogyEngine: NPCGenealogyEngine;

  constructor() {
    this.personalityEngine = new NPCPersonalityEngine();
    this.memoryEngine = new NPCMemoryEngine();
    this.monsterSpawner = new MonsterSpawner();
    this.sharedMemory = new SharedMemoryNetwork(this.memoryEngine);
    this.genealogyEngine = new NPCGenealogyEngine();
    this.loadData();
  }

  private loadData() {
    try {
      const npcsPath = path.resolve(process.cwd(), "game-data/npc/npcs.json");
      const dialoguesPath = path.resolve(process.cwd(), "game-data/dialogue/dialogues.json");

      if (fs.existsSync(npcsPath)) {
        const npcData = JSON.parse(fs.readFileSync(npcsPath, "utf-8"));
        npcData.forEach((npc: any) => this.npcDefinitions.set(npc.id, npc));
      }

      if (fs.existsSync(dialoguesPath)) {
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
      position: { x, y, z: 0 },
      health: def?.stats?.health || 100,
      maxHealth: def?.stats?.maxHealth || 100,
      dropTable: def?.dropTable || [],
      stamina: 100,
      inventory: [],
      personality: this.personalityEngine.generateTraits(),
      memory: [],
      dna: this.genealogyEngine.createLineage(id, "Unknown"),
      dialogueId: def ? def.dialogueId : null,
      questHooks: def ? def.questHooks : [],
      homePosition: { x, y },
      targetPosition: null as { x: number, y: number } | null,
      state: "idle",
      stateTimer: 0,
      lastShout: null as string | null
    };
    this.npcs.set(id, npc);
    return npc;
  }

  getNPC(id: string) { return this.npcs.get(id); }
  getAllNPCs() { return Array.from(this.npcs.values()); }

  handleInteraction(npcId: string, player: any) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;
    this.memoryEngine.remember(npcId, { type: "interaction", playerId: player.id });
    if (npc.faction) {
      if (!player.reputation) player.reputation = {};
      player.reputation[npc.faction] = (player.reputation[npc.faction] || 0) + 1;
    }
    
    const dialogue = this.dialogues.get(npc.dialogueId);
    if (!dialogue) return { source: npc.name, text: `Hello, I am ${npc.name}.` };

    let activeNodeId = "root";
    if (dialogue.entryNodes) {
      for (const entry of dialogue.entryNodes) {
        let match = true;
        if (entry.conditionFlag && !player.flags[entry.conditionFlag]) match = false;
        if (match) { activeNodeId = entry.nodeId; break; }
      }
    }

    const node = dialogue.nodes[activeNodeId];
    return {
      source: npc.name,
      text: node ? node.text : dialogue.greeting,
      choices: node ? node.choices : [],
      npcId
    };
  }

  tick(players: any[]) {
    const now = Date.now();
    this.sharedMemory.propagate(Array.from(this.npcs.values()));

    for (const npc of this.npcs.values()) {
      let interacting = false;
      for (const player of players) {
        if (Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y) < 15) {
          npc.state = "interacting";
          npc.stateTimer = now + 5000;
          interacting = true;
          break;
        }
      }
      if (interacting) continue;

      if (npc.state === "interacting" && now > npc.stateTimer) {
        npc.state = "idle";
        npc.stateTimer = now + 2000;
      }

      if (npc.state === "idle" && now > npc.stateTimer) {
        // PERSONALITY-BASED DECISION MAKING
        const p = npc.personality;
        const r = Math.random();

        if (r < p.curiosity * 0.5) {
          npc.state = "wandering";
          const angle = Math.random() * Math.PI * 2;
          const dist = 20 + Math.random() * 50;
          npc.targetPosition = { x: npc.homePosition.x + Math.cos(angle) * dist, y: npc.homePosition.y + Math.sin(angle) * dist };
          npc.stateTimer = now + 10000;
        } else if (r < 0.7) {
          npc.state = "working";
          npc.targetPosition = { x: npc.homePosition.x, y: npc.homePosition.y };
          npc.stateTimer = now + 15000;
        } else {
          npc.stateTimer = now + 3000;
        }
      }

      if ((npc.state === "wandering" || npc.state === "working") && npc.targetPosition) {
        const dx = npc.targetPosition.x - npc.position.x;
        const dy = npc.targetPosition.y - npc.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 1) {
          npc.targetPosition = null;
          npc.state = "idle";
          npc.stateTimer = now + 2000;
        } else {
          const speed = 0.5;
          npc.position.x += (dx / dist) * speed;
          npc.position.y += (dy / dist) * speed;
          
          if (Math.random() < 0.005) {
            npc.lastShout = ["Exploring...", "Back to work.", "What was that?", "I remember you."][Math.floor(Math.random() * 4)];
            this.memoryEngine.remember(npc.id, { type: "idle_observation", state: npc.state });
          }
        }
      }
    }
  }

  handleChoice(npcId: string, nodeId: string, choiceId: string, player: any) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;
    const dialogue = this.dialogues.get(npc.dialogueId);
    if (!dialogue || !dialogue.nodes) return null;
    const node = dialogue.nodes[nodeId];
    if (!node) return null;
    const choice = (node.choices || []).find((c: any) => c.id === choiceId);
    if (!choice) return null;

    if (choice.setFlag) player.flags[choice.setFlag] = true;
    const nextNode = dialogue.nodes[choice.nextNodeId];
    return {
      source: npc.name,
      text: nextNode ? nextNode.text : "...",
      choices: nextNode ? nextNode.choices : [],
      npcId
    };
  }
}
