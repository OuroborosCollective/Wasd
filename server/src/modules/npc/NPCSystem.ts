import { NPCBrain } from "../ai/NPCBrain.js";
import { NPCPersonalityEngine } from "./NPCPersonalityEngine.js";
import { NPCMemoryEngine } from "./NPCMemoryEngine.js";
import { NPCGenealogyEngine } from "./NPCGenealogyEngine.js";
import fs from "fs";
import path from "path";

export class NPCSystem {
  private npcs: Map<string, any> = new Map();
  private npcDefinitions: Map<string, any> = new Map();
  private dialogues: Map<string, any> = new Map();
  // ⚡ Bolt Optimization: Cache the NPC list to avoid repeated Array.from() allocations in the tick loop
  private cachedNPCs: any[] = [];

  public personalityEngine: NPCPersonalityEngine;
  public memoryEngine: NPCMemoryEngine;
  public genealogyEngine: NPCGenealogyEngine;

  constructor() {
    this.personalityEngine = new NPCPersonalityEngine();
    this.memoryEngine = new NPCMemoryEngine();
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
      brain: new NPCBrain(),
      needs: { hunger: 100, energy: 100 },
      glbPath: undefined // Will be resolved by WorldTick
    };
    this.npcs.set(id, npc);
    this.updateCache();
    return npc;
  }

  getNPC(id: string) {
    return this.npcs.get(id);
  }

  handleInteraction(npcId: string, player: any, questDefinitions: Map<string, any> = new Map()) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;
    
    const playerQuests = player.quests || [];
    const playerFlags = player.flags || {};
    const playerReputation = player.reputation || {};

    const dialogue = this.dialogues.get(npc.dialogueId);
    if (!dialogue) {
      return {
        source: npc.name,
        text: `Hello, I am ${npc.name}. Welcome to Areloria!`,
        questId: null
      };
    }

    // Check if there's a specific node to start with based on quest state
    let startNodeId = "root";
    let text = dialogue.greeting;
    let questId = null;
    let choices = [];

    // Check for quest-specific dialogue (Old Logic)
    if (npc.questHooks && npc.questHooks.length > 0) {
      for (const qId of npc.questHooks) {
        const playerQuest = playerQuests.find((q: any) => q.id === qId);
        if (!playerQuest) {
          const questDef = questDefinitions.get(qId);
          let prereqsMet = true;
          if (questDef && questDef.prerequisiteQuestIds) {
            for (const preId of questDef.prerequisiteQuestIds) {
              const preQuest = playerQuests.find((q: any) => q.id === preId);
              if (!preQuest || !preQuest.completed) {
                prereqsMet = false;
                break;
              }
            }
          }

          if (!prereqsMet) {
            if (dialogue.questPrerequisiteLines && dialogue.questPrerequisiteLines[qId]) {
              text = dialogue.questPrerequisiteLines[qId];
              break;
            }
            continue;
          }

          if (dialogue.questStartLines && dialogue.questStartLines[qId]) {
            text = dialogue.questStartLines[qId];
            questId = qId;
            break;
          }
        } else if (!playerQuest.completed) {
          if (dialogue.questProgressLines && dialogue.questProgressLines[qId]) {
            text = dialogue.questProgressLines[qId];
            break;
          }
        } else {
          if (dialogue.questCompleteLines && dialogue.questCompleteLines[qId]) {
            text = dialogue.questCompleteLines[qId];
            break;
          }
        }
      }
    }

    // New Logic: Branching Nodes
    if (dialogue.nodes) {
      // Determine which node to show
      let activeNodeId = "root";
      
      // If we have quest-specific nodes, we could prioritize them here
      // For now, let's just use "root" as default or check for state-based entry nodes
      if (dialogue.entryNodes) {
        for (const entry of dialogue.entryNodes) {
          let match = true;
          if (entry.conditionFlag && !playerFlags[entry.conditionFlag]) match = false;
          if (entry.conditionQuestId) {
            const q = playerQuests.find((pq: any) => pq.id === entry.conditionQuestId);
            if (entry.conditionQuestState === "completed" && (!q || !q.completed)) match = false;
            if (entry.conditionQuestState === "active" && (!q || q.completed)) match = false;
            if (entry.conditionQuestState === "not_started" && q) match = false;
          }
          if (entry.conditionReputation) {
            const rep = playerReputation[entry.conditionReputation.factionId] || 0;
            if (entry.conditionReputation.min !== undefined && rep < entry.conditionReputation.min) match = false;
            if (entry.conditionReputation.max !== undefined && rep > entry.conditionReputation.max) match = false;
          }
          if (match) {
            activeNodeId = entry.nodeId;
            break;
          }
        }
      }

      const node = dialogue.nodes[activeNodeId];
      if (node) {
        text = node.text;
        choices = (node.choices || []).filter((c: any) => {
          if (c.conditionFlag && !playerFlags[c.conditionFlag]) return false;
          if (c.conditionReputation) {
            const rep = playerReputation[c.conditionReputation.factionId] || 0;
            if (c.conditionReputation.min !== undefined && rep < c.conditionReputation.min) return false;
            if (c.conditionReputation.max !== undefined && rep > c.conditionReputation.max) return false;
          }
          return true;
        });
      }
    }

    return {
      source: npc.name,
      text,
      questId,
      choices,
      npcId
    };
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

    // Check if choice is already used (if it changes reputation)
    if (choice.changeReputation) {
      if (!player.usedChoices) player.usedChoices = [];
      if (player.usedChoices.includes(choiceId)) return null; // Already used
      player.usedChoices.push(choiceId);
    }

    // Apply effects of the choice
    if (choice.setFlag) {
      player.flags[choice.setFlag] = true;
    }
    if (choice.changeReputation) {
      if (!player.reputation) player.reputation = {};
      const { factionId, amount } = choice.changeReputation;
      player.reputation[factionId] = (player.reputation[factionId] || 0) + amount;
    }

    const nextNode = dialogue.nodes[choice.nextNodeId];
    if (!nextNode) return null;

    let questId = nextNode.triggerQuestId || null;
    let text = nextNode.text;
    let choices = (nextNode.choices || []).filter((c: any) => {
      if (c.conditionFlag && !player.flags[c.conditionFlag]) return false;
      if (c.conditionReputation) {
        const rep = (player.reputation && player.reputation[c.conditionReputation.factionId]) || 0;
        if (c.conditionReputation.min !== undefined && rep < c.conditionReputation.min) return false;
        if (c.conditionReputation.max !== undefined && rep > c.conditionReputation.max) return false;
      }
      return true;
    });

    return {
      source: npc.name,
      text,
      questId,
      choices,
      npcId
    };
  }

  getAllNPCs() {
    // ⚡ Bolt Optimization: Return cached array instead of creating a new one every call
    return this.cachedNPCs;
  }

  removeNPC(id: string) {
    this.npcs.delete(id);
    this.updateCache();
  }

  private updateCache() {
    this.cachedNPCs = Array.from(this.npcs.values());
  }

  tick(players: any[], chatSystem?: any) {
    // Process NPC AI, schedules, needs
    const now = Date.now();
    for (const npc of this.npcs.values()) {
      // 0. Process dynamic needs
      if (!npc.needs) npc.needs = { hunger: 100, energy: 100 }; // Fallback for existing NPCs

      // Decrease hunger slowly (approx 1 unit per 5 seconds assuming 10 ticks/sec, wait we'll make it 1 unit per 100 ticks for testing or simple rate)
      // Actually let's use a probabilistic approach or a simple small float decrement per tick.
      // 1 tick = 100ms. So 10 ticks = 1 sec.
      // 1 hunger per 100 ticks = 1 hunger per 10 sec.
      npc.needs.hunger = Math.max(0, npc.needs.hunger - 0.01);
      npc.needs.energy = Math.max(0, npc.needs.energy - 0.005);

      // 1. Check for nearby players to interact with
      let interacting = false;
      // Performance: Skip proximity check if already interacting
      if (npc.state === "interacting" && now < npc.stateTimer) {
        interacting = true;
      } else {
        for (const player of players) {
          const dx = player.position.x - npc.position.x;
          const dy = player.position.y - npc.position.y;
          // Optimization: Use squared distance to avoid Math.hypot() square root
          if (dx * dx + dy * dy < 225) { // 15^2
            npc.state = "interacting";
            npc.stateTimer = now + 5000;
            npc.targetPosition = null;
            interacting = true;
            break;
          }
        }
      }

      if (interacting) continue;

      // 2. State machine
      if (npc.state === "interacting" && now > npc.stateTimer) {
        npc.state = "idle";
        npc.stateTimer = now + Math.random() * 2000 + 1000;
      }

      if (npc.state === "idle") {
        if (now > npc.stateTimer) {
          if (!npc.brain) npc.brain = new NPCBrain();
          const decision = npc.brain.update(npc);

          if (chatSystem && npc.state !== decision.action) {
            chatSystem.systemMessage(`[Thought] ${npc.name}: ${decision.thought}`);
          }

          if (decision.action === "wander" || decision.action === "wandering") {
            npc.state = "wandering";
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 30;
            npc.targetPosition = {
              x: npc.homePosition.x + Math.cos(angle) * dist,
              y: npc.homePosition.y + Math.sin(angle) * dist
            };
            npc.stateTimer = now + 10000;
          } else if (decision.action === "work" || decision.action === "working") {
            npc.state = "working";
            npc.targetPosition = { x: npc.homePosition.x, y: npc.homePosition.y };
            npc.stateTimer = now + 15000;
          } else {
            npc.state = decision.action;
            npc.stateTimer = now + Math.random() * 3000 + 2000;
          }
        }
      } else if (npc.state === "sleep") {
        npc.needs.energy = Math.min(100, npc.needs.energy + 2); // Fast regen while sleeping
        if (npc.needs.energy >= 100) {
          npc.state = "idle";
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        }
      } else if (npc.state === "eat") {
        npc.needs.hunger = Math.min(100, npc.needs.hunger + 5); // Faster regen while eating
        if (npc.needs.hunger >= 100) {
          npc.state = "idle";
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        }
      } else if (npc.state === "wandering" || npc.state === "working") {
        if (now > npc.stateTimer) {
          npc.state = "idle";
          npc.targetPosition = null;
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        } else if (npc.targetPosition) {
          // Move towards target
          const dx = npc.targetPosition.x - npc.position.x;
          const dy = npc.targetPosition.y - npc.position.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < 1) { // 1^2
            // Reached target
            npc.targetPosition = null;
            if (npc.state === "wandering") {
              npc.state = "idle";
              npc.stateTimer = now + Math.random() * 3000 + 1000;
            }
            // If working, just stay there until timer runs out
          } else {
            // Move
            const speed = 0.5; // units per tick
            const dist = Math.sqrt(distSq);
            npc.position.x += (dx / dist) * speed;
            npc.position.y += (dy / dist) * speed;
          }
        }
      }
    }
  }
}
