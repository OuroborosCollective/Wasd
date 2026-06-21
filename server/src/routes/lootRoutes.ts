'use strict';

/**
 * LOOT ROUTES - Phase 11: OuroborosTickSystem Integration
 * 
 * ARE Infinite Loot Machine routes with deterministic tick context.
 * Uses TickSystemContextProvider instead of direct tickIndex.
 *
 * SECURITY NOTE:
 * These endpoints are administrative and must be protected by
 * adminAuthMiddleware and adminRateLimiter at the mount point.
 * They allow triggering loot generation and checking system status.
 */

import { getLootDirector } from '../bootLootSystem.js';
import express, { Router } from 'express';
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

export function createLootRoutes(): Router {
  const router = Router();

  // Ensure JSON parsing is available for POST body
  router.use(express.json({ limit: '1mb' }));

  /**
   * GET /status
   * Returns the current status of the ARE Infinite Loot Machine.
   * Required: Admin Authentication
   */
  router.get('/status', (_req, res) => {
    const lootDirector = getLootDirector();

    if (!lootDirector) {
      // Fail securely: return a clear error when system is not ready
      res.status(503).json({
        ok: false,
        error: 'Loot system not initialized',
        system: 'ARE_INFINITE_LOOT_MACHINE'
      });
      return;
    }

    res.json({
      ok: true,
      system: 'ARE_INFINITE_LOOT_MACHINE',
      status: lootDirector.getStatus()
    });
  });

  /**
   * POST /generate
   * Generates loot based on provided context.
   * Required: Admin Authentication
   */
  router.post('/generate', async (req, res) => {
    const lootDirector = getLootDirector();

    if (!lootDirector) {
      res.status(503).json({
        ok: false,
        error: 'Loot system not initialized'
      });
      return;
    }

    try {
      const ctx = req.body || {};
      const { ProceduralLootMachine } = await import('../loot/ProceduralLootMachine.js');
      const db = (global as any).__db || {};
      const machine = new ProceduralLootMachine(db);

      // Phase 11: Use TickSystemContextProvider for deterministic tickIndex
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
        // Ouroboros tick system context for deterministic tracking
        tickContext: {
          tickId: tickContext.tickId,
          worldTimeHours: tickContext.worldTimeHours,
          seedHash: tickContext.seedHash,
        },
      });
    } catch (error: any) {
      // SECURITY: Do not leak stack traces or internal implementation details
      console.error('[LootAdmin] Generation failed:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to generate loot'
      });
    }
  });

  return router;
}
