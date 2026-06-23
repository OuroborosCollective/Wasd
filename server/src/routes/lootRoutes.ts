'use strict';

/**
 * LOOT ROUTES - Phase 11: OuroborosTickSystem Integration
 * 
 * ARE Infinite Loot Machine routes with deterministic tick context.
 * Uses TickSystemContextProvider instead of direct tickIndex.
 */

import { getLootDirector } from '../bootLootSystem.js';
import express, { Router } from 'express';
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

export function createLootRouter(): Router {
  const router = express.Router();

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
      res.status(500).json({
        ok: false,
        error: error.message
      });
    }
  });

  return router;
}
