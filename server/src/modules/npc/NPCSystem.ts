import { NPCPersonalityEngine } from "./NPCPersonalityEngine.js";
import { NPCMemoryEngine } from "./NPCMemoryEngine.js";
import { NPCGenealogyEngine } from "./NPCGenealogyEngine.js";
import fs from "fs";
import path from "path";

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
      stamina: 100,
      inventory: [],
      personality: this.personalityEngine.generateTraits(),
      memory: [],
      dna: this.genealogyEngine.createLineage(id, "Unknown"),
      dialogueId: def ? def.dialogueId : null,
      questHooks: def ? def.questHooks : []
    };
    this.npcs.set(id, npc);
    return npc;
  }

  getNPC(id: string) {
    return this.npcs.get(id);
  }

  handleInteraction(npcId: string, charName: string, playerQuests: any[] = [], questDefinitions: Map<string, any> = new Map()) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    const dialogue = this.dialogues.get(npc.dialogueId);
    if (!dialogue) {
      return {
        source: npc.name,
        text: `Hello, I am ${npc.name}. Welcome to Areloria!`,
        questId: null
      };
    }

    let text = dialogue.greeting;
    let questId = null;

    // Check for quest-specific dialogue
    if (npc.questHooks && npc.questHooks.length > 0) {
      for (const qId of npc.questHooks) {
        const playerQuest = playerQuests.find(q => q.id === qId);
        if (!playerQuest) {
          // Player hasn't started this quest yet
          
          // Check prerequisites
          const questDef = questDefinitions.get(qId);
          let prereqsMet = true;
          if (questDef && questDef.prerequisiteQuestIds) {
            for (const preId of questDef.prerequisiteQuestIds) {
              const preQuest = playerQuests.find(q => q.id === preId);
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
            continue; // Skip offering if prereqs not met and no specific line
          }

          if (dialogue.questStartLines && dialogue.questStartLines[qId]) {
            text = dialogue.questStartLines[qId];
            questId = qId;
            break;
          }
        } else if (!playerQuest.completed) {
          // Player is on this quest
          if (dialogue.questProgressLines && dialogue.questProgressLines[qId]) {
            text = dialogue.questProgressLines[qId];
            break;
          }
        } else {
          // Player completed this quest
          if (dialogue.questCompleteLines && dialogue.questCompleteLines[qId]) {
            text = dialogue.questCompleteLines[qId];
            break;
          }
        }
      }
    }

    // Check if this NPC is a target for an active quest
    for (const playerQuest of playerQuests) {
      if (!playerQuest.completed && playerQuest.targetNpcId === npcId) {
        if (dialogue.questCompleteLines && dialogue.questCompleteLines[playerQuest.id]) {
          text = dialogue.questCompleteLines[playerQuest.id];
          break;
        }
      }
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
