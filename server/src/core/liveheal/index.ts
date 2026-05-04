// @ts-nocheck
/**
 * LiveHeal v2 - Public API
 */

export { LiveHealEngine } from "./LiveHealEngine.js";
export { LiveHealRegistry } from "./LiveHealRegistry.js";
export { LiveHealStrategyRegistry } from "./LiveHealStrategyRegistry.js";
export { LiveHealPolicyEngine } from "./LiveHealPolicyEngine.js";
export { LiveHealLearningStore, hashSymptomTags } from "./LiveHealLearningStore.js";
export { LiveHealDependencyGraph } from "./LiveHealDependencyGraph.js";
export { LiveHealAnomalyDetector } from "./LiveHealAnomalyDetector.js";
export { LiveHealRootCauseAnalyzer } from "./LiveHealRootCauseAnalyzer.js";
export { LiveHealPatchLog } from "./LiveHealPatchLog.js";
export {
  createStateMachine,
  transition,
  canTransition,
  tryAcquireHealingLock,
  releaseHealingLock,
  isHealingTimedOut,
  isRelapse,
} from "./LiveHealStateMachine.js";
export {
  bootstrapLiveHeal,
  createLiveHealEngine,
  createDefaultLiveHealConfig,
  resolveLiveHealConfigFromEnv,
} from "./LiveHealIntegration.js";
export type {
  HealthSnapshot,
  HealthStatus,
  HealthMetrics,
  SubSystemState,
  SubSystemAdapter,
  SubSystemRecord,
  ErrorSignature,
  LoadBand,
  HealingStrategy,
  HealingResult,
  RiskLevel,
  HealLogEntry,
  LearningEntry,
  StrategyScore,
  AnomalyObservation,
  CircuitBreakerConfig,
  ProtectedFeature,
  PolicyRule,
  DependencyEdge,
  LiveHealConfig,
  AssetHealthConfig,
  GLBValidationResult,
  GLBValidationIssue,
  GLBValidationSeverity,
  AssetCacheEntry,
  QuarantineEntry,
  StateTransition,
  StateTransitionTrigger,
  LiveHealEvents,
} from "./LiveHealTypes.js";
