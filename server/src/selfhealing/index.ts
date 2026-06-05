/**
 * SelfHealing Module Index
 * Re-exports for convenient importing.
 */

// Types
export type {
  SelfHealRiskLevel,
  SelfHealIssueKind,
  SelfHealIssue,
  SelfHealDryRunResult,
  SelfHealRollbackStrategy,
  SelfHealRollbackPlan,
  SelfHealPatchProposal,
  SelfHealWorkshopResponse,
} from "./SelfHealingWorkshopTypes.js";

// Workshop (core)
export {
  SelfHealWorkshop,
  selfHealWorkshop,
  stableSelfHealHash,
  createSelfHealPatchProposal,
} from "./SelfHealingWorkshop.js";

// Risk Policy
export {
  classifySelfHealRisk,
  canAutoApply,
  getRollbackStrategy,
  getDefaultRollbackSteps,
} from "./SelfHealingRiskPolicy.js";

// System (legacy)
export {
  SelfHealingSystem,
  safeExecute,
  bootstrapSelfHealing,
  resolveSelfHealingConfigFromEnv,
  resolveSelfHealingDashboardConfigFromEnv,
  selfHealingMiddleware,
  type SelfHealingConfig,
  type SelfHealingDashboardConfig,
} from "./SelfHealingSystem.js";
export { default as sovereignEngine } from "./SelfHealingSystem.js";

// Dashboard (legacy)
export {
  registerSelfHealingDashboard,
} from "./SelfHealingDashboard.js";