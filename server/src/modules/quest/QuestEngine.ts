import { ItemRegistry } from "../inventory/ItemRegistry.js";
import fs from "fs";
import path from "path";

/**
 * QuestEngine — loads, tracks, and completes player quests.
 *
 * On construction the engine reads all quest definitions from
 * `game-data/quests/quests.json` and indexes them by ID.  Each definition
 * is normalised into an internal format with the following aliases:
 * - `name`      ← `title`
 * - `giver`     ← `giverNpcId`
 * - `objective` ← `objectiveType`
 *
 * ### Quest lifecycle
 * 1. **Available** — all prerequisites are met but the player has not yet
 *    accepted the quest.
 * 2. **Active** — {@link startQuest} has been called; quest lives in
 *    `player.quests` with `completed: false`.
 * 3. **Completed** — {@link completeQuest} marks it `completed: true`,
 *    applies gold/XP/item rewards, and records `completedAt`.
 * 4. **Locked** — prerequisites are not met; status returned by
 *    {@link getQuestStatus}.
 *
 * ### Prerequisites
 * A quest may require any combination of:
 * - Previously completed quests (`prerequisiteQuestIds`).
 * - Player flags set to `true` (`requiredFlags`).
 * - Faction reputation within a numeric range (`requiredReputation`).
 */
export class QuestEngine {
  private quests: Map<string, any> = new Map();

  /**
   * Initialises the engine and loads quest data from disk.
   */
  constructor() {
    this.loadData();
  }

  /**
   * Reads `game-data/quests/quests.json` and populates the internal quest
   * map.  Parse/IO errors are caught and logged; the engine continues with
   * an empty map if the file is unavailable.
   */
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

  /**
   * Attempts to add a quest to the player's active quest list.
   *
   * The following conditions must all be satisfied for the quest to start:
   * - The quest ID exists in the loaded definitions.
   * - The player has not already started or completed the quest.
   * - All `prerequisiteQuestIds` are completed on the player's record.
   * - All `requiredFlags` are set to `true` on `player.flags`.
   * - All `requiredReputation` thresholds are satisfied.
   *
   * @param player  - The player accepting the quest.  `player.quests` is
   *                  initialised to `[]` if absent.
   * @param questId - ID of the quest definition to start.
   * @returns The newly created active quest object (a copy of the definition
   *          with `startedAt` and `completed: false` added), or `null` if
   *          the quest cannot be started.
   */
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

  /**
   * Returns the player's current quest array.
   *
   * @param player - The player whose quests to retrieve.
   * @returns The `player.quests` array, or `[]` if not initialised.
   */
  listQuests(player: any) {
    return player.quests || [];
  }

  /**
   * Computes the status of every quest in the registry relative to the
   * given player.
   *
   * Possible `state` values in the returned array:
   * - `"completed"` — the player has finished the quest.
   * - `"active"`    — the quest is in progress.
   * - `"available"` — prerequisites are met; ready to be started.
   * - `"locked"`    — prerequisites are not yet met.
   *
   * @param player - The player for whom to compute quest status.
   * @returns Array of `{ id, title, state, objective }` objects, one per
   *          registered quest.
   */
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
            const preQuest = player.quests.find((q: any) => q.id === preId);
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

  /**
   * Exposes the full internal quest definition map.
   *
   * Used by {@link NPCSystem.handleInteraction} to check prerequisite chains
   * when displaying quest-specific dialogue lines.
   *
   * @returns A `Map<string, any>` keyed by quest ID.
   */
  getQuestDefinitions() {
    return this.quests;
  }

  /**
   * Marks an active quest as completed and applies its rewards to the player.
   *
   * Rewards applied (if defined on `quest.reward`):
   * - `gold`   — added to `player.gold`.
   * - `xp`     — added to `player.xp`.
   * - `itemId` — a new item instance created via {@link ItemRegistry.createInstance}
   *              and pushed into `player.inventory`.
   *
   * @param player  - The player completing the quest.
   * @param questId - ID of the quest to complete.  The quest must already be
   *                  active (`completed: false`) in `player.quests`.
   * @returns The reward object from the quest definition, or `null` if the
   *          quest was not found, was not active, or was already completed.
   */
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
