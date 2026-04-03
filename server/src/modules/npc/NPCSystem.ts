import { NPCPersonalityEngine } from "./NPCPersonalityEngine.js";
import { NPCMemoryEngine } from "./NPCMemoryEngine.js";
import { NPCGenealogyEngine } from "./NPCGenealogyEngine.js";
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

  constructor() {
    this.personalityEngine = new NPCPersonalityEngine();
    this.memoryEngine = new NPCMemoryEngine();
    this.genealogyEngine = new NPCGenealogyEngine();
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
      health: def?.stats?.health || 100,
      maxHealth: def?.stats?.maxHealth || 100,
      skills: {
        combat: { level: typeof def?.stats?.combatLevel === "number" ? def.stats.combatLevel : 1 },
      },
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
      currentScheduleAction: null as string | null,
      /** Player id currently chased (hostile / enemy only) */
      aggroTargetId: null as string | null,
    };
    this.npcs.set(id, npc);
    return npc;
  }

  getNPC(id: string) {
    return this.npcs.get(id);
  }

  removeNPC(id: string) {
    return this.npcs.delete(id);
  }

  setRuntimeDialogue(npcId: string, text: string, choices: any[] = []) {
    const npc = this.npcs.get(npcId);
    if (!npc) return false;
    const dialogueId = npc.dialogueId || `runtime_${npcId}`;
    this.dialogues.set(dialogueId, {
      id: dialogueId,
      greeting: text,
      nodes: {
        root: {
          text,
          choices,
        },
      },
    });
    npc.dialogueId = dialogueId;
    return true;
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
        questId: null,
        choices: [] as any[],
        npcId,
        nodeId: "root",
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
          if (prereqsMet && questDef?.requiredFlags?.length) {
            for (const flag of questDef.requiredFlags) {
              if (!playerFlags[flag]) {
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

    // Branching nodes — but do not overwrite quest-offer / progress lines from hooks above
    let activeNodeId = "root";
    if (!questId && dialogue.nodes) {
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
    } else if (questId && dialogue.nodes) {
      // Quest is being offered: keep hook text, add accept / decline
      activeNodeId = "root";
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

  handleChoice(
    npcId: string,
    nodeId: string,
    choiceId: string,
    player: any,
    pendingQuestId: string | null
  ) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    if (!player.flags) player.flags = {};

    if (choiceId === "sys_quest_accept" && pendingQuestId) {
      return {
        source: npc.name,
        text: "Good luck — I'll be here if you need anything.",
        questId: null,
        choices: [] as any[],
        npcId,
        nodeId: "root",
        startQuestId: pendingQuestId,
      };
    }
    if (choiceId === "sys_quest_decline") {
      return {
        source: npc.name,
        text: "Alright. Come back when you're ready.",
        questId: null,
        choices: [] as any[],
        npcId,
        nodeId: "root",
      };
    }

    const dialogue = this.dialogues.get(npc.dialogueId);
    if (!dialogue || !dialogue.nodes) return null;

    const node = dialogue.nodes[nodeId];
    if (!node) return null;

    const choice = (node.choices || []).find((c: any) => c.id === choiceId);
    if (!choice) return null;

    if (choice.changeReputation) {
      if (!player.usedChoices) player.usedChoices = [];
      if (player.usedChoices.includes(choiceId)) return null;
      player.usedChoices.push(choiceId);
    }

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

    if (nextNode.setFlag) {
      player.flags[nextNode.setFlag] = true;
    }

    const triggeredQuestId = nextNode.triggerQuestId || null;
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
      questId: triggeredQuestId,
      choices,
      npcId,
      nodeId: choice.nextNodeId,
      startQuestId: triggeredQuestId,
    };
  }

  getAllNPCs() {
    return Array.from(this.npcs.values());
  }

  tick(players: any[], worldTime: number) {
    // Process NPC AI, schedules, needs
    const now = Date.now();
    for (const npc of this.npcs.values()) {
      // Hostile chase is driven by WorldTick (aggro + pathing)
      if (npc.aggroTargetId) {
        continue;
      }

      // 0. Process dynamic needs
      if (!npc.needs) npc.needs = { hunger: 100, energy: 100 }; // Fallback for existing NPCs

      // Dynamic Drive-Decay (Neon Axiom Logic: Activity-based consumption)
      let decayMultiplier = 1.0;
      if (npc.state === "wandering" || npc.state === "working") decayMultiplier = 1.5;
      if (npc.state === "combat") decayMultiplier = 3.0;
      if (npc.state === "idle" || npc.state === "sleeping") decayMultiplier = 0.5;

      npc.needs.hunger = Math.max(0, npc.needs.hunger - (0.01 * decayMultiplier));
      npc.needs.energy = Math.max(0, npc.needs.energy - (0.005 * decayMultiplier));

      // 0. Process Schedule
      const schedule = NPCScheduleRegistry[npc.id];
      if (schedule) {
        // Find the most recent schedule entry that has passed
        let activeEntry = null;
        for (const entry of schedule) {
          if (worldTime >= entry.time) {
            activeEntry = entry;
          }
        }
        // If no entry found (e.g. it's 2 AM and first entry is 6 AM), take the last entry of the previous day
        if (!activeEntry) {
          activeEntry = schedule[schedule.length - 1];
        }

        if (activeEntry && npc.currentScheduleAction !== activeEntry.action) {
          npc.currentScheduleAction = activeEntry.action;
          npc.state = activeEntry.action;
          if (activeEntry.target) {
            npc.targetPosition = { x: activeEntry.target.x, y: activeEntry.target.y };
          }
          console.log(`NPC ${npc.name} changed schedule to ${activeEntry.action}`);
        }
      }

      // 1. Check for nearby players to interact with
      let interacting = false;
      for (const player of players) {
        const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
        if (dist < 15) { // Interaction range
          npc.state = "interacting";
          npc.stateTimer = now + 5000; // Stay interacting for a bit
          npc.targetPosition = null; // Stop moving
          interacting = true;
          break;
        }
      }

      if (interacting) continue;

      // 2. State machine
      if (npc.state === "interacting" && now > npc.stateTimer) {
        npc.state = npc.currentScheduleAction || "idle";
        npc.stateTimer = now + Math.random() * 2000 + 1000;
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
        }
      } else if (npc.state === "idle" || npc.state === "wandering") {
        // Random wandering if idle and no schedule target
        if (now > npc.stateTimer) {
          const r = Math.random();
          if (r < 0.3) {
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
            npc.stateTimer = now + Math.random() * 3000 + 2000;
          }
        }
      }
    }
  }
}
