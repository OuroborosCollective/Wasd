import type { EquipmentEvent } from "./equipment";
import type { InventoryEvent } from "./inventory";
import type { QuestEvent } from "./quests";
import type { SkillId } from "./skills";

export type GameplayEvent =
  | InventoryEvent
  | EquipmentEvent
  | QuestEvent
  | {
      type: "loot_pickup_requested";
      tickId: number;
      entityId: string;
    }
  | {
      type: "loot_pickup_confirmed";
      itemId: string;
      quantity: number;
      entityId?: string;
    }
  | {
      type: "skill_requested";
      tickId: number;
      skillId: SkillId;
      targetId?: string;
      x?: number;
      y?: number;
    }
  | {
      type: "skill_confirmed";
      tickId: number;
      skillId: SkillId;
    }
  | {
      type: "npc_interaction_requested";
      tickId: number;
      npcId: string;
    }
  | {
      type: "npc_dialogue";
      npcId: string;
      npcName: string;
      text: string;
    };

export interface GameplayEventQueue {
  push(event: GameplayEvent): void;
  drain(): GameplayEvent[];
  size(): number;
  clear(): void;
}

export function createGameplayEventQueue(maxEvents = 128): GameplayEventQueue {
  const events: GameplayEvent[] = [];

  return {
    push(event) {
      events.push(event);

      while (events.length > maxEvents) {
        events.shift();
      }
    },

    drain() {
      const drained = events.slice();
      events.length = 0;
      return drained;
    },

    size() {
      return events.length;
    },

    clear() {
      events.length = 0;
    }
  };
}