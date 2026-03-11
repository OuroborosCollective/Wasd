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

    const newQuest = { ...quest, startedAt: Date.now(), completed: false };
    player.quests.push(newQuest);
    return newQuest;
  }

  listQuests(player: any) {
    return player.quests || [];
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
