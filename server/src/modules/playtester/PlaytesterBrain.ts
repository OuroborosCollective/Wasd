// @ts-nocheck
import { PlaytesterActionPlanner } from "./PlaytesterActionPlanner.js";
import type { PlaytesterAction } from "./playtesterTypes.js";

type BrainContext = {
  dead: boolean;
  questObjectiveType: string | null;
  questActive: boolean;
  hasLootNearby: boolean;
  hasNpcNearby: boolean;
  hasEnemyNearby: boolean;
  hasInventoryWeapon: boolean;
  hasWeaponEquipped: boolean;
  stuckScore: number;
};

export type BrainDecision = {
  action: PlaytesterAction;
  goal: string;
};

export class PlaytesterBrain {
  private readonly planner = new PlaytesterActionPlanner();

  decide(ctx: BrainContext): BrainDecision {
    return this.planner.plan({
      hasQuest: ctx.questActive,
      activeQuestObjectiveType: ctx.questObjectiveType,
      hasLootNearby: ctx.hasLootNearby,
      hasNpcNearby: ctx.hasNpcNearby,
      hasEnemyNearby: ctx.hasEnemyNearby,
      hasEmptyWeaponSlot: !ctx.hasWeaponEquipped,
      hasInventoryWeapon: ctx.hasInventoryWeapon,
      isDead: ctx.dead,
      isStuck: ctx.stuckScore >= 5,
    });
  }
}
