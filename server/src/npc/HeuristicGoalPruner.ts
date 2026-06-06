export {
  EchoZoneType,
  HeuristicGoalPruner,
  default,
  determineStateTransition,
  isHighIntensityZone,
  isInEchoZone,
} from "../modules/npc/HeuristicGoalPruner.js";

export type {
  DeterministicGoalPruneContext,
  DeterministicGoalPruneResult,
  EchoZone,
  Goal,
  GoalLike,
  NPCMemoryCache,
  PruningResult,
} from "../modules/npc/HeuristicGoalPruner.js";
