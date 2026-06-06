import {
  HeuristicGoalPruner as LiveHeuristicGoalPruner,
  type DeterministicGoalPruneContext,
  type DeterministicGoalPruneResult,
  type GoalLike,
} from "../../modules/npc/HeuristicGoalPruner.js";

export type { DeterministicGoalPruneContext, DeterministicGoalPruneResult, GoalLike };

export class HeuristicGoalPruner extends LiveHeuristicGoalPruner {
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
}

export default HeuristicGoalPruner;
