import {
  HeuristicGoalPruner as LiveHeuristicGoalPruner,
  type DeterministicGoalPruneContext,
  type DeterministicGoalPruneResult,
  type GoalLike,
} from "../../modules/npc/HeuristicGoalPruner.js";

export type { DeterministicGoalPruneContext, DeterministicGoalPruneResult, GoalLike };

export class HeuristicGoalPruner extends LiveHeuristicGoalPruner {
  // Inherit all methods including pruneByEchoIntensity from base class
  // Override not needed - base class implementation is sufficient
}

export default HeuristicGoalPruner;
