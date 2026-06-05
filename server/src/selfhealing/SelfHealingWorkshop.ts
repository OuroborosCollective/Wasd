/**
 * SelfHeal Workshop
 * Deterministic dry-run workshop for self-healing proposals.
 * No magical auto-fixing - controlled workshop with risk and rollback.
 */

import type {
  SelfHealIssue,
  SelfHealPatchProposal,
  SelfHealWorkshopResponse,
  SelfHealRiskLevel,
} from "./SelfHealingWorkshopTypes.js";
import {
  classifySelfHealRisk,
  getRollbackStrategy,
  getDefaultRollbackSteps,
  canAutoApply,
} from "./SelfHealingRiskPolicy.js";

/**
 * Deterministic FNV-1a hash function.
 * Produces stable 8-character hex string from any input.
 * No Math.random() - same input always produces same output.
 */
export function stableSelfHealHash(input: string): string {
  let h = 2166136261; // FNV offset basis
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV prime
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Generate a deterministic patch ID from issue data.
 */
function generatePatchId(issue: SelfHealIssue): string {
  const components = [
    issue.id,
    issue.kind,
    issue.subsystem,
    issue.message,
    ...issue.affectedFiles,
  ].join("|");
  return stableSelfHealHash(components);
}

/**
 * Create a patch proposal for an issue.
 * Deterministic: same issue always produces same proposal.
 */
export function createSelfHealPatchProposal(issue: SelfHealIssue): SelfHealPatchProposal {
  const riskLevel = classifySelfHealRisk(issue);
  const patchId = generatePatchId(issue);
  const rollbackStrategy = getRollbackStrategy(riskLevel);
  const rollbackSteps = getDefaultRollbackSteps(rollbackStrategy);
  const isBlocked = riskLevel === "BLOCKED" || riskLevel === "HIGH";

  // Build blocked reasons if applicable
  const blockedReasons: string[] = [];
  if (riskLevel === "BLOCKED") {
    blockedReasons.push("Policy blocks automatic patching for this subsystem.");
  } else if (riskLevel === "HIGH") {
    blockedReasons.push("High-risk issue requires manual review before apply.");
  }

  // Warnings for medium-risk issues
  const warnings: string[] = [];
  if (riskLevel === "MEDIUM") {
    warnings.push("Manual review recommended before applying this patch.");
  }

  // Build dry-run result
  const dryRun = {
    ok: !isBlocked,
    wouldChangeFiles: [...issue.affectedFiles].sort(), // Sort for deterministic output
    wouldRunCommands: [],
    warnings,
    blockedReasons,
  };

  return {
    patchId,
    issueId: issue.id,
    title: `SelfHeal proposal: ${issue.kind}`,
    summary: issue.message,
    riskLevel,
    dryRun,
    rollback: {
      strategy: rollbackStrategy,
      steps: rollbackSteps,
    },
    createdBy: "selfheal-workshop",
    deterministic: true,
  };
}

/**
 * SelfHeal Workshop class.
 * Generates proposals from detected issues.
 */
export class SelfHealWorkshop {
  private issues: SelfHealIssue[] = [];

  /**
   * Add an issue to the workshop.
   */
  addIssue(issue: SelfHealIssue): void {
    this.issues.push(issue);
  }

  /**
   * Clear all issues from the workshop.
   */
  clearIssues(): void {
    this.issues = [];
  }

  /**
   * Get all current proposals.
   */
  getProposals(): SelfHealPatchProposal[] {
    return this.issues.map(createSelfHealPatchProposal);
  }

  /**
   * Generate workshop response for API.
   */
  getWorkshopResponse(): SelfHealWorkshopResponse {
    return {
      ok: true,
      mode: "dry-run",
      proposals: this.getProposals(),
    };
  }

  /**
   * Get proposal by patch ID.
   */
  getProposalByPatchId(patchId: string): SelfHealPatchProposal | undefined {
    return this.getProposals().find((p) => p.patchId === patchId);
  }

  /**
   * Check if workshop has any proposals.
   */
  hasProposals(): boolean {
    return this.issues.length > 0;
  }

  /**
   * Get count of proposals by risk level.
   */
  getProposalCounts(): Record<SelfHealRiskLevel, number> {
    const proposals = this.getProposals();
    return {
      LOW: proposals.filter((p) => p.riskLevel === "LOW").length,
      MEDIUM: proposals.filter((p) => p.riskLevel === "MEDIUM").length,
      HIGH: proposals.filter((p) => p.riskLevel === "HIGH").length,
      BLOCKED: proposals.filter((p) => p.riskLevel === "BLOCKED").length,
    };
  }

  /**
   * Check if any proposal is auto-applicable.
   */
  hasAutoApplicable(): boolean {
    return this.getProposals().some((p) => canAutoApply(p.riskLevel));
  }
}

// Singleton instance for server-wide use
export const selfHealWorkshop = new SelfHealWorkshop();

export default selfHealWorkshop;