import { Router } from "express";
import { OracleEndpoint } from "./OracleEndpoint.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

const router: Router = Router();

/**
 * GET /api/oracle
 * 
 * Oracle sync endpoint with Ouroboros tick system integration.
 * Returns deterministic pulse with Ouroboros autonomous agent state.
 */
router.get("/oracle", async (_req, res) => {
  const pulse = await OracleEndpoint.syncWithCreator({});
  res.json(pulse);
});

/**
 * GET /api/tick/context
 * 
 * Returns current tick context for diagnostics.
 * Phase 11: Ouroboros tick system diagnostic endpoint.
 */
router.get("/tick/context", async (_req, res) => {
  const context = tickContextProvider.getContext();
  res.json({
    ok: true,
    tickContext: {
      tickId: context.tickId,
      tickIndex: context.tickIndex,
      worldTimeHours: context.worldTimeHours,
      tickTimestamp: context.tickTimestamp,
      seedHash: context.seedHash,
    },
  });
});

export default router;
