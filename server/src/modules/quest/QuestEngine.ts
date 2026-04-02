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

  private resolveQuestsPath(): string | null {
    const cwd = process.cwd();
    const a = path.resolve(cwd, "game-data/quests/quests.json");
    const b = path.resolve(cwd, "../game-data/quests/quests.json");
    if (fs.existsSync(a)) return a;
    if (fs.existsSync(b)) return b;
    return null;
  }

  private loadData() {
    try {
      const questsPath = this.resolveQuestsPath();
      if (questsPath) {
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

    this.statusCache.set(player, status);
    this.versionCache.set(player, this.definitionVersion);
    return status;
  }

  getQuestDefinitions() {
    return this.quests;
  }

  addQuest(questDef: any) {
    this.quests.set(questDef.id, {
      ...questDef,
      name: questDef.title,
      giver: questDef.giverNpcId || questDef.giverNpc,
      objective: questDef.objectiveType || questDef.objectives?.[0]?.type || "custom"
    });
    this.definitionVersion++;
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

  /**
   * Complete active talk_to quests when the player talks to the target NPC (after dialogue flow).
   */
  checkTalkToQuests(player: any, npcId: string): { quest: any; reward: any }[] {
    const completedQuestRewards: { quest: any; reward: any }[] = [];
    if (!player.quests) return completedQuestRewards;
    const activeQuests = player.quests.filter((q: any) => !q.completed);

    for (const q of activeQuests) {
      const obj = q.objectiveType || q.objective;
      if (obj !== "talk_to") continue;
      const target = q.targetNpcId || q.targetId;
      if (target && target === npcId) {
        const wasOpen = !q.completed;
        const reward = this.completeQuest(player, q.id);
        if (wasOpen && q.completed) {
          completedQuestRewards.push({ quest: q, reward: reward ?? null });
        }
      }
    }
    return completedQuestRewards;
  }

  countItemInInventory(player: any, itemId: string): number {
    const inv = player.inventory || [];
    let sum = 0;
    for (const it of inv) {
      if (it && it.id === itemId) {
        sum += Math.max(1, Math.floor(Number(it.quantity) || 1));
      }
    }
    return sum;
  }

  /**
   * Turn in collect quests when talking to the designated NPC while carrying items.
   */
  checkCollectTurnInQuests(player: any, npcId: string): { quest: any; reward: any }[] {
    const completedQuestRewards: { quest: any; reward: any }[] = [];
    if (!player.quests) return completedQuestRewards;
    const activeQuests = player.quests.filter((q: any) => !q.completed);

    for (const q of activeQuests) {
      const obj = q.objectiveType || q.objective;
      if (obj !== "collect") continue;
      const turnInNpc = q.targetNpcId || q.giverNpcId;
      if (!turnInNpc || turnInNpc !== npcId) continue;
      const needId = q.requiredItemId;
      const needCount = Math.max(1, Number(q.requiredCount ?? 1));
      if (!needId) continue;
      if (this.countItemInInventory(player, needId) < needCount) continue;

      let removed = 0;
      const inv = player.inventory || [];
      for (let i = 0; i < inv.length && removed < needCount; i++) {
        const it = inv[i];
        if (!it || it.id !== needId) continue;
        const q = Math.max(1, Math.floor(Number(it.quantity) || 1));
        const need = needCount - removed;
        if (q <= need) {
          removed += q;
          inv.splice(i, 1);
          i--;
        } else {
          it.quantity = q - need;
          removed += need;
        }
      }
      player.inventory = inv;

      const wasOpen = !q.completed;
      const reward = this.completeQuest(player, q.id);
      if (wasOpen && q.completed) {
        completedQuestRewards.push({ quest: q, reward: reward ?? null });
      }
    }
    return completedQuestRewards;
  }

  /** Payload for client quest UI (minimal fields). */
  getQuestSyncForClient(player: any): any[] {
    if (!player.quests) return [];
    return player.quests.map((q: any) => {
      const obj = q.objectiveType || q.objective;
      let progress: number | undefined;
      let progressMax: number | undefined;
      if (obj === "collect" && q.requiredItemId) {
        progressMax = Math.max(1, Number(q.requiredCount ?? 1));
        progress = Math.min(progressMax, this.countItemInInventory(player, q.requiredItemId));
      }
      return {
        id: q.id,
        title: q.title || q.name || q.id,
        objectiveType: obj,
        completed: !!q.completed,
        targetId: q.targetId,
        targetNpcId: q.targetNpcId,
        requiredItemId: q.requiredItemId,
        requiredCount: q.requiredCount,
        progress,
        progressMax,
      };
    });
  }

  updateCombatQuests(player: any, npcId: string, npcInstanceId: string): { quest: any; reward: any }[] {
    const completedQuestRewards: { quest: any; reward: any }[] = [];
    if (!player.quests) return completedQuestRewards;
    const activeQuests = player.quests.filter((q: any) => !q.completed);

    for (const q of activeQuests) {
      if ((q.objectiveType === "combat" || q.objective === "combat") && (q.targetId === npcId || q.targetId === npcInstanceId)) {
        const wasOpen = !q.completed;
        const reward = this.completeQuest(player, q.id);
        if (wasOpen && q.completed) {
          completedQuestRewards.push({ quest: q, reward: reward ?? null });
        }
      }
    }
    // Optimization Note: completeQuest already handles cache invalidation
    return completedQuestRewards;
  }
}
