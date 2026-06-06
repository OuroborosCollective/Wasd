import {
  HeuristicGoalPruner as LiveHeuristicGoalPruner,
  type DeterministicGoalPruneContext,
  type DeterministicGoalPruneResult,
  type GoalLike,
} from "../../modules/npc/HeuristicGoalPruner.js";

export type { DeterministicGoalPruneContext, DeterministicGoalPruneResult, GoalLike };

export class HeuristicGoalPruner extends LiveHeuristicGoalPruner {
  static pruneByEchoIntensity(npcId: string, cache: unknown): void {
    void npcId;
    void cache;
  }

  static pruneGoals<TGoal extends GoalLike>(
    goals: readonly TGoal[] | null | undefined,
    context: DeterministicGoalPruneContext,
  ): DeterministicGoalPruneResult<TGoal> {
    return LiveHeuristicGoalPruner.pruneGoals(goals, context);
  }
}

export default HeuristicGoalPruner;
