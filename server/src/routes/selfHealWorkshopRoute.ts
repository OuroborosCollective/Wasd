/**
 * SelfHeal Workshop API Route
 * Read-only endpoint for dry-run workshop proposals.
 * GET /api/self-healing
 * 
 * Phase 11: Integrated with OuroborosTickSystem via TickSystemContextProvider.
 */

import type { Express, Request, Response } from "express";
import { Router } from "express";
import { selfHealWorkshop } from "../selfhealing/SelfHealingWorkshop.js";
import type { SelfHealIssue } from "../selfhealing/SelfHealingWorkshopTypes.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

/**
 * Create the SelfHeal Workshop router.
 * Read-only - no file mutation.
 */
export function createSelfHealWorkshopRouter() {
  const router = Router();

  /**
   * GET /api/self-healing
   * Returns all current workshop proposals.
   * Read-only - no file changes.
   */
  router.get("/", async (_req: Request, res: Response) => {
    try {
      // Detect issues from various sources
      const detectedIssues = await detectIssuesFromSystem();
      
      // Clear and repopulate workshop with detected issues
      selfHealWorkshop.clearIssues();
      for (const issue of detectedIssues) {
        selfHealWorkshop.addIssue(issue);
      }

      const response = selfHealWorkshop.getWorkshopResponse();
      
      // Phase 11: Include deterministic tick context for Ouroboros integration
      const tickContext = tickContextProvider.getContext();
      
      // Safe response - no secrets, no stack traces
      res.json({
        ...response,
        // Ouroboros tick system context
        tickContext: {
          tickId: tickContext.tickId,
          worldTimeHours: tickContext.worldTimeHours,
          seedHash: tickContext.seedHash,
        },
      });
    } catch (error) {
      // Fail gracefully - no stack traces in production
      console.error("[SelfHealWorkshop] Error generating proposals:", error);
      res.status(500).json({
        ok: false,
        mode: "dry-run",
        error: "Failed to generate proposals",
        proposals: [],
      });
    }
  });

  /**
   * GET /api/self-healing/:patchId
   * Get a specific proposal by patch ID.
   */
  router.get("/:patchId", (req: Request, res: Response) => {
    try {
      const patchId = String(req.params.patchId);
      const proposal = selfHealWorkshop.getProposalByPatchId(patchId);
      
      if (!proposal) {
        return res.status(404).json({
          ok: false,
          error: "Proposal not found",
        });
      }
      
      // Phase 11: Include deterministic tick context for Ouroboros integration
      const tickContext = tickContextProvider.getContext();
      res.json({
        ok: true,
        proposal,
        // Ouroboros tick system context
        tickContext: {
          tickId: tickContext.tickId,
          worldTimeHours: tickContext.worldTimeHours,
          seedHash: tickContext.seedHash,
        },
      });
    } catch (error) {
      console.error("[SelfHealWorkshop] Error fetching proposal:", error);
      res.status(500).json({
        ok: false,
        error: "Failed to fetch proposal",
      });
    }
  });

  return router;
}

/**
 * Detect issues from various system sources.
 * Returns real issues only - no fabricated problems.
 */
async function detectIssuesFromSystem(): Promise<SelfHealIssue[]> {
  const issues: SelfHealIssue[] = [];
  
  // Check ARE invariant violations from the guard
  try {
    const { areInvariantGuard } = await import("../are/AREInvariantGuard.js");
    const guardStatus = areInvariantGuard?.getStatus?.();
    if (guardStatus && guardStatus.scannedSources?.length) {
      for (const scanResult of guardStatus.scannedSources) {
        const violations = scanResult.violations || [];
        for (const violation of violations) {
          issues.push({
            id: `determinism-${violation.token}-${violation.line}`,
            kind: "determinism_violation",
            subsystem: "are",
            message: `Determinism violation: ${violation.token} at line ${violation.line}`,
            evidence: [
              `Token: ${violation.token}`,
              `Line: ${violation.line}`,
              `File: ${violation.file}`,
            ],
            affectedFiles: [violation.file],
          });
        }
      }
    }
  } catch {
    // Guard not available - skip
  }
  
  return issues;
}

/**
 * Register the workshop route with the Express app.
 */
export function registerSelfHealWorkshopRoute(app: Express): void {
  const router = createSelfHealWorkshopRouter();
  app.use("/api/self-healing", router);
  console.log("[SelfHealWorkshop] Route registered at /api/self-healing");
}

export default createSelfHealWorkshopRouter;