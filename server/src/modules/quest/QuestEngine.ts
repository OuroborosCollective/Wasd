import { ItemRegistry } from "../inventory/ItemRegistry.js";
import fs from "fs";
import path from "path";

export class QuestEngine {
  private quests: Map<string, any> = new Map();

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const questsPath = path.resolve(process.cwd(), "game-data/quests/quests.json");
      if (fs.existsSync(questsPath)) {
        const questData = JSON.parse(fs.readFileSync(questsPath, "utf-8"));
        questData.forEach((quest: any) => {
          // Map to internal format if needed
          this.quests.set(quest.id, {
            ...quest,
            name: quest.title,
            giver: quest.giverNpcId,
            objective: quest.objectiveType
          });
        });
      }
    } catch (error) {
      console.error("Error loading Quest data:", error);
    }
  }

  startQuest(player: any, questId: string) {
    const quest = this.quests.get(questId);
    if (!quest) return null;
    if (!player.quests) player.quests = [];
    
    // Check if already started
    if (player.quests.find((q: any) => q.id === questId)) return null;

    // Check prerequisites
    if (quest.prerequisiteQuestIds && quest.prerequisiteQuestIds.length > 0) {
      for (const preId of quest.prerequisiteQuestIds) {
        const preQuest = player.quests.find((q: any) => q.id === preId);
        if (!preQuest || !preQuest.completed) {
          return null; // Prerequisite not met
        }
      }
    }

    // Check flag prerequisites
    if (quest.requiredFlags && quest.requiredFlags.length > 0) {
      for (const flag of quest.requiredFlags) {
        if (!player.flags || !player.flags[flag]) {
          return null; // Flag not met
        }
      }
    }

    // Check reputation prerequisites
    if (quest.requiredReputation) {
      for (const factionId in quest.requiredReputation) {
        const req = quest.requiredReputation[factionId];
        const currentRep = (player.reputation && player.reputation[factionId]) || 0;
        if (req.min !== undefined && currentRep < req.min) return null;
        if (req.max !== undefined && currentRep > req.max) return null;
      }
    }

    const newQuest = { ...quest, startedAt: Date.now(), completed: false };
    player.quests.push(newQuest);
    return newQuest;
  }

  listQuests(player: any) {
    return player.quests || [];
  }

  getQuestStatus(player: any) {
    const status: any[] = [];
    this.quests.forEach((quest, id) => {
      const playerQuest = player.quests ? player.quests.find((q: any) => q.id === id) : null;
      let state = "locked";
      
      if (playerQuest && playerQuest.completed) {
        state = "completed";
      } else if (playerQuest) {
        state = "active";
      } else {
        // Check prerequisites
        let prereqsMet = true;
        if (quest.prerequisiteQuestIds) {
          for (const preId of quest.prerequisiteQuestIds) {
            const preQuest = player.quests ? player.quests.find((q: any) => q.id === preId) : null;
            if (!preQuest || !preQuest.completed) {
              prereqsMet = false;
              break;
            }
          }
        }
        if (quest.requiredReputation) {
          for (const factionId in quest.requiredReputation) {
            const req = quest.requiredReputation[factionId];
            const currentRep = (player.reputation && player.reputation[factionId]) || 0;
            if (req.min !== undefined && currentRep < req.min) prereqsMet = false;
            if (req.max !== undefined && currentRep > req.max) prereqsMet = false;
          }
        }
        if (prereqsMet) state = "available";
      }
      
      status.push({
        id,
        title: quest.title,
        state,
        objective: playerQuest ? playerQuest.objective : quest.objective
      });
    });
    return status;
  }

  getQuestDefinitions() {
    return this.quests;
  }

  completeQuest(player: any, questId: string) {
    const quests = player.quests || [];
    const q = quests.find((x: any) => x.id === questId);
    if (!q || q.completed) return null;
    q.completed = true;
    q.completedAt = Date.now();
    
    // Apply rewards
    if (q.reward) {
      player.gold = (player.gold || 0) + (q.reward.gold || 0);
      player.xp = (player.xp || 0) + (q.reward.xp || 0);
      
      if (q.reward.itemId) {
        if (!player.inventory) player.inventory = [];
        const item = ItemRegistry.createInstance(q.reward.itemId);
        if (item) {
          player.inventory.push(item);
        }
      }
    }

    return q.reward;
  }
}
