import { QuestRegistry } from "./QuestRegistry.js";
import { ItemRegistry } from "../inventory/ItemRegistry.js";

export class QuestEngine {
  startQuest(player: any, questId: keyof typeof QuestRegistry) {
    const quest = QuestRegistry[questId];
    if (!quest) return null;
    if (!player.quests) player.quests = [];
    
    // Check if already started
    if (player.quests.find((q: any) => q.id === questId)) return null;

    const newQuest = { ...quest, startedAt: Date.now(), completed: false };
    player.quests.push(newQuest);
    return newQuest;
  }

  listQuests(player: any) {
    return player.quests || [];
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