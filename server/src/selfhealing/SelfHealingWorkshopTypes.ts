/**
 * SelfHeal Workshop Types
 * Deterministic dry-run workshop for self-healing proposals.
 * No magical auto-fixing - controlled workshop with risk and rollback.
 */

/**
 * Risk classification levels for self-healing issues.
 * Higher risk levels require more manual review.
 */
export type SelfHealRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "BLOCKED";

/**
 * Kinds of issues that SelfHeal can detect and propose fixes for.
 */
export type SelfHealIssueKind =
  | "route_missing"
  | "asset_missing"
  | "client_placeholder"
  | "determinism_violation"
  | "docker_misconfig"
  | "unknown";

/**
 * A detected issue in the system that could be addressed.
 */
export interface SelfHealIssue {
  id: string;
  kind: SelfHealIssueKind;
  subsystem: string;
  message: string;
  evidence: string[];
  affectedFiles: string[];
}

/**
 * Result of a dry-run analysis.
 * Shows what WOULD change without actually changing anything.
 */
export interface SelfHealDryRunResult {
  ok: boolean;
  wouldChangeFiles: string[];
  wouldRunCommands: string[];
  warnings: string[];
  blockedReasons: string[];
}

/**
 * Rollback strategy if a patch needs to be reverted.
 */
export type SelfHealRollbackStrategy =
  | "none"
  | "restore_files"
  | "git_revert"
  | "manual_review";

/**
 * Plan for rolling back a patch if needed.
 */
export interface SelfHealRollbackPlan {
  strategy: SelfHealRollbackStrategy;
  steps: string[];
}

/**
 * A proposal for fixing an issue.
 * All IDs and hashes are deterministic based on issue data.
 */
export interface SelfHealPatchProposal {
  patchId: string;
  issueId: string;
  title: string;
  summary: string;
  riskLevel: SelfHealRiskLevel;
  dryRun: SelfHealDryRunResult;
  rollback: SelfHealRollbackPlan;
  createdBy: "selfheal-workshop";
  deterministic: true;
}

/**
 * API response for the workshop endpoint.
 */
export interface SelfHealWorkshopResponse {
  ok: boolean;
  mode: "dry-run";
  proposals: SelfHealPatchProposal[];
}