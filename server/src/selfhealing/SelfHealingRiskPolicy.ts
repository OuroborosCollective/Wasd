/**
 * SelfHeal Risk Policy
 * Deterministic risk classification for self-healing issues.
 * No Math.random() - risk level is derived from issue characteristics.
 */

import type { SelfHealIssue, SelfHealRiskLevel } from "./SelfHealingWorkshopTypes.js";

/**
 * Classify the risk level of a self-healing issue.
 * Deterministic: same issue always produces same risk level.
 */
export function classifySelfHealRisk(issue: SelfHealIssue): SelfHealRiskLevel {
  // Critical subsystems are always blocked
  if (issue.subsystem.includes("auth")) return "BLOCKED";
  if (issue.subsystem.includes("database")) return "HIGH";
  
  // High-risk issue kinds
  if (issue.kind === "determinism_violation") return "HIGH";
  if (issue.kind === "docker_misconfig") return "HIGH";
  
  // Medium risk: missing routes could affect routing
  if (issue.kind === "route_missing") return "MEDIUM";
  
  // Low risk: these are non-critical asset/placeholder issues
  if (issue.kind === "asset_missing") return "LOW";
  if (issue.kind === "client_placeholder") return "LOW";
  
  // Default to MEDIUM for unknown issues
  return "MEDIUM";
}

/**
 * Check if an issue can be automatically applied.
 * HIGH and BLOCKED issues require manual review.
 */
export function canAutoApply(riskLevel: SelfHealRiskLevel): boolean {
  return riskLevel === "LOW" || riskLevel === "MEDIUM";
}

/**
 * Get the rollback strategy based on risk level.
 */
export function getRollbackStrategy(
  riskLevel: SelfHealRiskLevel
): "git_revert" | "manual_review" | "none" {
  if (riskLevel === "LOW" || riskLevel === "MEDIUM") {
    return "git_revert";
  }
  // HIGH and BLOCKED require manual review
  return "manual_review";
}

/**
 * Get default rollback steps based on strategy.
 */
export function getDefaultRollbackSteps(strategy: "git_revert" | "manual_review" | "none"): string[] {
  switch (strategy) {
    case "git_revert":
      return [
        "Review generated patch before applying.",
        "Run targeted tests.",
        "If regression occurs, revert the patch commit with: git revert <commit-hash>",
      ];
    case "manual_review":
      return [
        "Review the proposal manually.",
        "Assess the risk and impact.",
        "Implement the fix manually if appropriate.",
        "Test thoroughly before deployment.",
      ];
    case "none":
      return [
        "No rollback needed - no changes were made.",
      ];
  }
}