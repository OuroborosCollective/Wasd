import { ItemRegistry } from "../inventory/ItemRegistry.js";
import fs from "fs";
import path from "path";

export class QuestEngine {
  private quests: Map<string, any> = new Map();
  // ⚡ Bolt Optimization: definitionVersion increments whenever quests are added or reloaded,
  // ensuring the O(1) player quest status cache is globally invalidated when definitions change.
  private definitionVersion = 0;

  // ⚡ Bolt Optimization: Use WeakMap for caching to avoid leaking memory and preventing
  // runtime caches from being persisted to the database.
  private statusCache = new WeakMap<any, any>();
  private versionCache = new WeakMap<any, number>();

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
        this.definitionVersion++;
      }
    } catch (error) {
      console.error("Error loading Quest data:", error);
    }
  }

  /**
   * ⚡ Bolt Optimization: Explicitly invalidate the player's quest status cache.
   * This is called whenever a quest state changes or prerequisites might have been met.
   */
  public invalidateCache(player: any) {
    this.statusCache.delete(player);
  }

  startQuest(player: any, questId: string) {
    const quest = this.quests.get(questId);
    if (!quest) return null;
    if (!player.quests) player.quests = [];

    // Optimization: Index player quests for O(1) lookup
    const playerQuestMap = new Map<string, any>();
    for (const q of player.quests) {
      playerQuestMap.set(q.id, q);
    }
    
    // Check if already started
    if (playerQuestMap.has(questId)) return null;

    // Check prerequisites
    if (quest.prerequisiteQuestIds && quest.prerequisiteQuestIds.length > 0) {
      for (const preId of quest.prerequisiteQuestIds) {
        const preQuest = playerQuestMap.get(preId);
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
    this.invalidateCache(player);
    return newQuest;
  }

  listQuests(player: any) {
    return player.quests || [];
  }

  getQuestStatus(player: any) {
    // ⚡ Bolt Optimization: Use invalidation-based caching to avoid O(N) recalculations of all
    // quest states (prerequisites, reputations, etc.) during every world tick (10Hz).
    const cachedStatus = this.statusCache.get(player);
    const cachedVersion = this.versionCache.get(player);

    if (cachedStatus && cachedVersion === this.definitionVersion) {
      return cachedStatus;
    }

    const status: any[] = [];
    // ⚡ Bolt Optimization: Use a single Map constructor pass to avoid intermediate .map() array allocations
    const playerQuestMap = new Map<string, any>();
    if (player.quests) {
      for (const q of player.quests) {
        playerQuestMap.set(q.id, q);
      }
    }

    for (const [id, quest] of this.quests) {
      const playerQuest = playerQuestMap.get(id);
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
            const preQuest = playerQuestMap.get(preId);
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
    }

    this.statusCache.set(player, status);
    this.versionCache.set(player, this.definitionVersion);
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

    this.invalidateCache(player);
    return q.reward;
  }

  addQuest(questDef: any) {
    this.quests.set(questDef.id, {
      ...questDef,
      name: questDef.title,
      giver: questDef.giverNpc,
      objective: questDef.objectives?.[0]?.type || "custom"
    });
    this.definitionVersion++;
  }

  updateCombatQuests(player: any, npcId: string, npcInstanceId: string): { quest: any; reward: any }[] {
    const completedQuestRewards: { quest: any; reward: any }[] = [];
    const activeQuests = player.quests.filter((q: any) => !q.completed);

    for (const q of activeQuests) {
      if ((q.objectiveType === "combat" || q.objective === "combat") && (q.targetId === npcId || q.targetId === npcInstanceId)) {
        const reward = this.completeQuest(player, q.id);
        if (reward) {
          completedQuestRewards.push({ quest: q, reward });
        }
      }
    }
    // Optimization Note: completeQuest already handles cache invalidation
    return completedQuestRewards;
  }
}
