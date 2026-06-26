'use strict';

/**
 * LOOT ROUTES - Phase 11: OuroborosTickSystem Integration
 *
 * ARE Infinite Loot Machine admin routes with deterministic tick context.
 * The router is protected at the source so legacy mount points cannot bypass
 * admin authentication or rate limiting.
 */

import { getLootDirector } from '../bootLootSystem.js';
import express, { type Router } from 'express';
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { adminRateLimiter } from "../middleware/rateLimitMiddleware.js";

export function createLootRouter(): Router {
  const router = express.Router();

  // Ensure JSON parsing is available for POST body, then protect all admin loot
  // endpoints before any handler executes.
  router.use(express.json());
  router.use(adminRateLimiter, adminAuthMiddleware);

  router.get('/status', (_req: any, res: any) => {
    const lootDirector = getLootDirector();

    if (!lootDirector) {
      return res.status(503).json({
        ok: false,
        error: 'Loot system not initialized',
        system: 'ARE_INFINITE_LOOT_MACHINE'
      });
    }

    res.json({
      ok: true,
      system: 'ARE_INFINITE_LOOT_MACHINE',
      status: lootDirector.getStatus()
    });
  });

  router.post('/generate', async (req: any, res: any) => {
    const lootDirector = getLootDirector();

    if (!lootDirector) {
      return res.status(503).json({
        ok: false,
        error: 'Loot system not initialized'
      });
    }

    try {
      const ctx = req.body || {};
      const { ProceduralLootMachine } = await import('../loot/ProceduralLootMachine.js');
      const db = (global as any).__db || {};
      const machine = new ProceduralLootMachine(db);

      // Phase 11: Use TickSystemContextProvider for deterministic tickIndex.
      const tickContext = tickContextProvider.getContext();
      const tickIndex = ctx.tickIndex ?? tickContext.tickIndex;

      const result = await machine.generate({
        playerId: ctx.playerId || 'admin_test',
        tickIndex: tickIndex,
        dropSourceId: ctx.dropSourceId || 'admin',
        lootIndex: ctx.lootIndex || 0,
        areaLevel: ctx.areaLevel || 10,
        treasureClassId: ctx.treasureClassId || 'TC_ACT1_BEAST',
        biomeId: ctx.biomeId || 'mountain',
        factionId: ctx.factionId || 'npc_kingdom_red',
        socialString: ctx.socialString || 'protector oath',
        playerReputation: ctx.playerReputation || 90,
        magicFind: ctx.magicFind || 0,
        killStreak: ctx.killStreak || 0,
        sourceRank: ctx.sourceRank || 'NORMAL'
      });

      res.json({
        ok: true,
        seedHash: result.seedHash,
        items: result.items,
        context: result.context,
        // Ouroboros tick system context for deterministic tracking.
        tickContext: {
          tickId: tickContext.tickId,
          worldTimeHours: tickContext.worldTimeHours,
          seedHash: tickContext.seedHash,
        },
      });
    } catch (_error: any) {
      res.status(500).json({
        ok: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}

export function createLootRoutes(app: any): void {
  app.use('/admin/loot', createLootRouter());
}
