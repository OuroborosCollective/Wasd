/**
 * SelfHeal Workshop Unit Tests
 * Tests for deterministic hash, risk classification, and proposal generation.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  stableSelfHealHash,
  createSelfHealPatchProposal,
  SelfHealWorkshop,
} from "../selfhealing/SelfHealingWorkshop.js";
import {
  classifySelfHealRisk,
  canAutoApply,
  getRollbackStrategy,
  getDefaultRollbackSteps,
} from "../selfhealing/SelfHealingRiskPolicy.js";
import type { SelfHealIssue, SelfHealRiskLevel } from "../selfhealing/SelfHealingWorkshopTypes.js";

describe("stableSelfHealHash", () => {
  it("produces stable hash for same input", () => {
    const input = "test-input-string";
    const hash1 = stableSelfHealHash(input);
    const hash2 = stableSelfHealHash(input);
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = stableSelfHealHash("input-a");
    const hash2 = stableSelfHealHash("input-b");
    expect(hash1).not.toBe(hash2);
  });

  it("produces 8-character hex string", () => {
    const hash = stableSelfHealHash("any-input");
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles empty string", () => {
    const hash = stableSelfHealHash("");
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("handles unicode characters", () => {
    const hash1 = stableSelfHealHash("hello");
    const hash2 = stableSelfHealHash("héllo"); // Different unicode
    expect(hash1).not.toBe(hash2);
  });
});

describe("classifySelfHealRisk", () => {
  const createIssue = (partial: Partial<SelfHealIssue>): SelfHealIssue => ({
    id: "test-issue",
    kind: "unknown",
    subsystem: "general",
    message: "Test issue",
    evidence: [],
    affectedFiles: [],
    ...partial,
  });

  it("BLOCKED for auth subsystems", () => {
    const issue = createIssue({ subsystem: "auth" });
    expect(classifySelfHealRisk(issue)).toBe("BLOCKED");
  });

  it("BLOCKED for authentication subsystems", () => {
    const issue = createIssue({ subsystem: "authentication" });
    expect(classifySelfHealRisk(issue)).toBe("BLOCKED");
  });

  it("HIGH for database subsystems", () => {
    const issue = createIssue({ subsystem: "database" });
    expect(classifySelfHealRisk(issue)).toBe("HIGH");
  });

  it("HIGH for determinism_violation", () => {
    const issue = createIssue({ kind: "determinism_violation" });
    expect(classifySelfHealRisk(issue)).toBe("HIGH");
  });

  it("HIGH for docker_misconfig", () => {
    const issue = createIssue({ kind: "docker_misconfig" });
    expect(classifySelfHealRisk(issue)).toBe("HIGH");
  });

  it("MEDIUM for route_missing", () => {
    const issue = createIssue({ kind: "route_missing" });
    expect(classifySelfHealRisk(issue)).toBe("MEDIUM");
  });

  it("LOW for asset_missing", () => {
    const issue = createIssue({ kind: "asset_missing" });
    expect(classifySelfHealRisk(issue)).toBe("LOW");
  });

  it("LOW for client_placeholder", () => {
    const issue = createIssue({ kind: "client_placeholder" });
    expect(classifySelfHealRisk(issue)).toBe("LOW");
  });

  it("MEDIUM for unknown kind", () => {
    const issue = createIssue({ kind: "unknown" });
    expect(classifySelfHealRisk(issue)).toBe("MEDIUM");
  });
});

describe("canAutoApply", () => {
  it("allows LOW risk", () => {
    expect(canAutoApply("LOW")).toBe(true);
  });

  it("allows MEDIUM risk", () => {
    expect(canAutoApply("MEDIUM")).toBe(true);
  });

  it("blocks HIGH risk", () => {
    expect(canAutoApply("HIGH")).toBe(false);
  });

  it("blocks BLOCKED risk", () => {
    expect(canAutoApply("BLOCKED")).toBe(false);
  });
});

describe("getRollbackStrategy", () => {
  it("git_revert for LOW", () => {
    expect(getRollbackStrategy("LOW")).toBe("git_revert");
  });

  it("git_revert for MEDIUM", () => {
    expect(getRollbackStrategy("MEDIUM")).toBe("git_revert");
  });

  it("manual_review for HIGH", () => {
    expect(getRollbackStrategy("HIGH")).toBe("manual_review");
  });

  it("manual_review for BLOCKED", () => {
    expect(getRollbackStrategy("BLOCKED")).toBe("manual_review");
  });
});

describe("getDefaultRollbackSteps", () => {
  it("returns git revert steps", () => {
    const steps = getDefaultRollbackSteps("git_revert");
    expect(steps).toContain("Review generated patch before applying.");
    expect(steps).toContain("git revert");
  });

  it("returns manual review steps", () => {
    const steps = getDefaultRollbackSteps("manual_review");
    expect(steps).toContain("Review the proposal manually.");
    expect(steps).toContain("Implement the fix manually");
  });

  it("returns none steps", () => {
    const steps = getDefaultRollbackSteps("none");
    expect(steps).toContain("No rollback needed");
  });
});

describe("createSelfHealPatchProposal", () => {
  const createIssue = (): SelfHealIssue => ({
    id: "issue-123",
    kind: "asset_missing",
    subsystem: "assets",
    message: "Asset file is missing",
    evidence: ["File not found: /assets/image.png"],
    affectedFiles: ["/public/assets/image.png"],
  });

  it("generates deterministic patch ID", () => {
    const issue = createIssue();
    const proposal1 = createSelfHealPatchProposal(issue);
    const proposal2 = createSelfHealPatchProposal(issue);
    expect(proposal1.patchId).toBe(proposal2.patchId);
  });

  it("sets correct issue ID", () => {
    const issue = createIssue();
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.issueId).toBe(issue.id);
  });

  it("sets correct risk level for asset_missing", () => {
    const issue = createIssue();
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.riskLevel).toBe("LOW");
  });

  it("sets dryRun.ok true for LOW risk", () => {
    const issue = createIssue();
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.dryRun.ok).toBe(true);
  });

  it("sorts affected files for deterministic output", () => {
    const issue: SelfHealIssue = {
      ...createIssue(),
      affectedFiles: ["/z/file.ts", "/a/file.ts", "/m/file.ts"],
    };
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.dryRun.wouldChangeFiles).toEqual([
      "/a/file.ts",
      "/m/file.ts",
      "/z/file.ts",
    ]);
  });

  it("sets blocked reasons for HIGH risk", () => {
    const issue: SelfHealIssue = {
      ...createIssue(),
      kind: "determinism_violation",
    };
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.riskLevel).toBe("HIGH");
    expect(proposal.dryRun.blockedReasons.length).toBeGreaterThan(0);
    expect(proposal.dryRun.ok).toBe(false);
  });

  it("sets blocked reasons for BLOCKED risk", () => {
    const issue: SelfHealIssue = {
      ...createIssue(),
      subsystem: "auth",
    };
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.riskLevel).toBe("BLOCKED");
    expect(proposal.dryRun.blockedReasons).toContain(
      "Policy blocks automatic patching for this subsystem."
    );
  });

  it("adds warnings for MEDIUM risk", () => {
    const issue: SelfHealIssue = {
      ...createIssue(),
      kind: "route_missing",
    };
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.riskLevel).toBe("MEDIUM");
    expect(proposal.dryRun.warnings.length).toBeGreaterThan(0);
  });

  it("does not mutate original issue", () => {
    const issue = createIssue();
    const originalId = issue.id;
    createSelfHealPatchProposal(issue);
    expect(issue.id).toBe(originalId);
  });

  it("sets createdBy to selfheal-workshop", () => {
    const issue = createIssue();
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.createdBy).toBe("selfheal-workshop");
  });

  it("sets deterministic to true", () => {
    const issue = createIssue();
    const proposal = createSelfHealPatchProposal(issue);
    expect(proposal.deterministic).toBe(true);
  });

  it("sets rollback strategy based on risk level", () => {
    const lowIssue = createIssue();
    expect(createSelfHealPatchProposal(lowIssue).rollback.strategy).toBe("git_revert");

    const highIssue: SelfHealIssue = { ...createIssue(), kind: "determinism_violation" };
    expect(createSelfHealPatchProposal(highIssue).rollback.strategy).toBe("manual_review");
  });
});

describe("SelfHealWorkshop", () => {
  let workshop: SelfHealWorkshop;

  beforeEach(() => {
    workshop = new SelfHealWorkshop();
  });

  it("starts empty", () => {
    expect(workshop.hasProposals()).toBe(false);
    expect(workshop.getProposals()).toEqual([]);
  });

  it("adds issues and generates proposals", () => {
    workshop.addIssue({
      id: "issue-1",
      kind: "asset_missing",
      subsystem: "assets",
      message: "Missing asset",
      evidence: [],
      affectedFiles: [],
    });

    expect(workshop.hasProposals()).toBe(true);
    expect(workshop.getProposals().length).toBe(1);
  });

  it("clears all issues", () => {
    workshop.addIssue({
      id: "issue-1",
      kind: "asset_missing",
      subsystem: "assets",
      message: "Missing asset",
      evidence: [],
      affectedFiles: [],
    });

    workshop.clearIssues();
    expect(workshop.hasProposals()).toBe(false);
  });

  it("generates workshop response", () => {
    workshop.addIssue({
      id: "issue-1",
      kind: "asset_missing",
      subsystem: "assets",
      message: "Missing asset",
      evidence: [],
      affectedFiles: [],
    });

    const response = workshop.getWorkshopResponse();
    expect(response.ok).toBe(true);
    expect(response.mode).toBe("dry-run");
    expect(response.proposals.length).toBe(1);
  });

  it("finds proposal by patch ID", () => {
    workshop.addIssue({
      id: "issue-1",
      kind: "asset_missing",
      subsystem: "assets",
      message: "Missing asset",
      evidence: [],
      affectedFiles: [],
    });

    const proposals = workshop.getProposals();
    const found = workshop.getProposalByPatchId(proposals[0].patchId);
    expect(found).toBeDefined();
    expect(found?.issueId).toBe("issue-1");
  });

  it("returns undefined for unknown patch ID", () => {
    const found = workshop.getProposalByPatchId("nonexistent");
    expect(found).toBeUndefined();
  });

  it("counts proposals by risk level", () => {
    workshop.addIssue({
      id: "low-1",
      kind: "asset_missing",
      subsystem: "assets",
      message: "Low risk",
      evidence: [],
      affectedFiles: [],
    });

    workshop.addIssue({
      id: "medium-1",
      kind: "route_missing",
      subsystem: "routes",
      message: "Medium risk",
      evidence: [],
      affectedFiles: [],
    });

    const counts = workshop.getProposalCounts();
    expect(counts.LOW).toBe(1);
    expect(counts.MEDIUM).toBe(1);
    expect(counts.HIGH).toBe(0);
    expect(counts.BLOCKED).toBe(0);
  });

  it("detects auto-applicable proposals", () => {
    workshop.addIssue({
      id: "high-1",
      kind: "determinism_violation",
      subsystem: "are",
      message: "High risk",
      evidence: [],
      affectedFiles: [],
    });

    expect(workshop.hasAutoApplicable()).toBe(false);

    workshop.addIssue({
      id: "low-1",
      kind: "asset_missing",
      subsystem: "assets",
      message: "Low risk",
      evidence: [],
      affectedFiles: [],
    });

    expect(workshop.hasAutoApplicable()).toBe(true);
  });
});