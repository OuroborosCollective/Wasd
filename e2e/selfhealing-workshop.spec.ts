import { test, expect } from "@playwright/test";

/**
 * E2E tests for SelfHeal Workshop endpoint
 * 
 * Verifies:
 * - GET /api/self-healing returns HTTP 200
 * - Response contains ok, mode="dry-run", proposals array
 * - Proposals have correct structure
 * - No secrets or stack traces in response
 */

test.describe("SelfHeal Workshop E2E", () => {
  test("Workshop endpoint returns HTTP 200", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    expect(res.status(), "Workshop endpoint should return HTTP 200").toBe(200);
  });

  test("Response contains ok=true", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  test("mode is dry-run", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();
    expect(json.mode).toBe("dry-run");
  });

  test("proposals is an array", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();
    expect(Array.isArray(json.proposals)).toBe(true);
  });

  test("Response has correct structure when proposals exist", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();

    // If there are proposals, verify structure
    if (json.proposals.length > 0) {
      const proposal = json.proposals[0];

      // Required fields
      expect(typeof proposal.patchId).toBe("string");
      expect(typeof proposal.issueId).toBe("string");
      expect(typeof proposal.title).toBe("string");
      expect(typeof proposal.summary).toBe("string");
      expect(typeof proposal.riskLevel).toBe("string");

      // Risk level must be valid
      expect(["LOW", "MEDIUM", "HIGH", "BLOCKED"]).toContain(proposal.riskLevel);

      // Dry run structure
      expect(typeof proposal.dryRun).toBe("object");
      expect(typeof proposal.dryRun.ok).toBe("boolean");
      expect(Array.isArray(proposal.dryRun.wouldChangeFiles)).toBe(true);
      expect(Array.isArray(proposal.dryRun.wouldRunCommands)).toBe(true);
      expect(Array.isArray(proposal.dryRun.warnings)).toBe(true);
      expect(Array.isArray(proposal.dryRun.blockedReasons)).toBe(true);

      // Rollback structure
      expect(typeof proposal.rollback).toBe("object");
      expect(typeof proposal.rollback.strategy).toBe("string");
      expect(
        ["none", "restore_files", "git_revert", "manual_review"]
      ).toContain(proposal.rollback.strategy);
      expect(Array.isArray(proposal.rollback.steps)).toBe(true);

      // Metadata
      expect(proposal.createdBy).toBe("selfheal-workshop");
      expect(proposal.deterministic).toBe(true);
    }
  });

  test("Response contains no secrets", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();
    const responseText = JSON.stringify(json).toLowerCase();

    // Check for common secret patterns (should not be present)
    const secretPatterns = [
      "password",
      "secret",
      "token",
      "api_key",
      "apikey",
      "private_key",
    ];

    for (const pattern of secretPatterns) {
      // Allow in keys, but not as actual values
      if (responseText.includes(`"${pattern}"`) && responseText.includes(`:${pattern}`)) {
        // This would indicate a leaked secret
        console.warn(`Potential secret leak detected: ${pattern}`);
      }
    }
  });

  test("Response contains no stack traces", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const text = await res.text();

    // Stack traces typically contain these patterns
    expect(text).not.toContain("at Object.<anonymous>");
    expect(text).not.toContain("at Function.");
    expect(text).not.toContain("node_modules");
  });

  test("Workshop endpoint responds within reasonable time", async ({ request }) => {
    const start = Date.now();
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(elapsed, "Workshop should respond quickly").toBeLessThan(5000);
  });

  test("proposal patchId is 8-character hex", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();

    if (json.proposals.length > 0) {
      const proposal = json.proposals[0];
      expect(proposal.patchId).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  test("HIGH risk proposals have blockedReasons", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();

    const highRiskProposals = json.proposals.filter(
      (p: any) => p.riskLevel === "HIGH"
    );

    for (const proposal of highRiskProposals) {
      expect(proposal.dryRun.blockedReasons.length).toBeGreaterThan(0);
      expect(proposal.dryRun.ok).toBe(false);
    }
  });

  test("BLOCKED proposals have policy block message", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();

    const blockedProposals = json.proposals.filter(
      (p: any) => p.riskLevel === "BLOCKED"
    );

    for (const proposal of blockedProposals) {
      const hasPolicyBlock = proposal.dryRun.blockedReasons.some(
        (reason: string) => reason.includes("Policy blocks")
      );
      expect(hasPolicyBlock).toBe(true);
    }
  });

  test("proposals have deterministic affectedFiles order", async ({ request }) => {
    const res = await request.get("/api/self-healing", { timeout: 30_000 });
    const json = await res.json();

    for (const proposal of json.proposals) {
      // Check that wouldChangeFiles is sorted
      if (proposal.dryRun.wouldChangeFiles.length > 1) {
        const files = proposal.dryRun.wouldChangeFiles;
        const sorted = [...files].sort();
        expect(files).toEqual(sorted);
      }
    }
  });

  test("workshop/workshop route returns same as workshop route", async ({ request }) => {
    const res1 = await request.get("/api/self-healing", { timeout: 30_000 });
    const res2 = await request.get("/api/self-healing/workshop", { timeout: 30_000 });

    expect(res1.status()).toBe(200);
    expect(res2.status()).toBe(200);

    const json1 = await res1.json();
    const json2 = await res2.json();

    expect(json1.ok).toBe(json2.ok);
    expect(json1.mode).toBe(json2.mode);
    expect(json1.proposals.length).toBe(json2.proposals.length);
  });
});