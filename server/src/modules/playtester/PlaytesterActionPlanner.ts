// @ts-nocheck
import type { PlaytesterAction } from "./playtesterTypes.js";

type PlannerContext = {
  hasQuest: boolean;
  activeQuestObjectiveType: string | null;
  hasLootNearby: boolean;
  hasNpcNearby: boolean;
  hasEnemyNearby: boolean;
  hasEmptyWeaponSlot: boolean;
  hasInventoryWeapon: boolean;
  isDead: boolean;
  isStuck: boolean;
};

export type PlannedAction = {
  action: PlaytesterAction;
  goal: string;
};

export class PlaytesterActionPlanner {
  plan(ctx: PlannerContext): PlannedAction {
    if (ctx.isDead) {
      return { action: "respawn", goal: "recover_after_death" };
    }
    if (ctx.isStuck) {
      return { action: "recover_from_stuck", goal: "unstick_navigation" };
    }
    if (ctx.hasLootNearby) {
      return { action: "pickup_loot", goal: "collect_ground_loot" };
    }
    if (ctx.hasEmptyWeaponSlot && ctx.hasInventoryWeapon) {
      return { action: "equip_best_weapon", goal: "improve_combat_readiness" };
    }
    if (!ctx.hasQuest && ctx.hasNpcNearby) {
      return { action: "start_available_quest", goal: "start_new_quest" };
    }
    if (ctx.hasQuest) {
      if (ctx.activeQuestObjectiveType === "talk_to") {
        return { action: "return_to_quest_target", goal: "talk_to_quest_npc" };
      }
      if (ctx.activeQuestObjectiveType === "collect") {
        return { action: "collect_required_item", goal: "gather_collect_objective" };
      }
      if (ctx.activeQuestObjectiveType === "combat" || ctx.hasEnemyNearby) {
        return { action: "attack_training_target", goal: "progress_combat_objective" };
      }
      return { action: "progress_active_quest", goal: "advance_active_quest_state" };
    }
    if (ctx.hasNpcNearby) {
      return { action: "interact_with_npc", goal: "probe_dialogue_and_interactions" };
    }
    if (ctx.hasEnemyNearby) {
      return { action: "attack_training_target", goal: "combat_smoke_check" };
    }
    return { action: "explore_nearby_chunk", goal: "discover_content_nodes" };
  }
}
