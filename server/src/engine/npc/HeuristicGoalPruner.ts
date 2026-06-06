import {
  HeuristicGoalPruner as LiveHeuristicGoalPruner,
  type DeterministicGoalPruneContext,
  type DeterministicGoalPruneResult,
  type GoalLike,
} from "../../modules/npc/HeuristicGoalPruner.js";

export type { DeterministicGoalPruneContext, DeterministicGoalPruneResult, GoalLike };

// Note: This class does NOT extend LiveHeuristicGoalPruner because TypeScript
// does not allow overriding static methods with incompatible signatures.
// We delegate to the live implementation for pruneGoals while providing
// a compatibility no-op for pruneByEchoIntensity.
export class HeuristicGoalPruner {
  /**
   * Compatibility wrapper for legacy NPCEngine calls.
   * The legacy code passes (npcId: string, cache: NPCMemoryCache) but the base class
   * expects (npc: NPC-like, activeZones: EchoZone[]). This no-op preserves behavior
   * while avoiding type errors during the transition period.
   */
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
