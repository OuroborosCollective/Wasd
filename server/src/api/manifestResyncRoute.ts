import { Router, type Request, type Response } from 'express';
import type { WorldTick } from '../core/are/index.js';
import { tickContextProvider } from '../core/are/TickSystemContextProvider.js';
import { authRequestHandler } from '../middleware/authRequestHandler.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { adminRateLimiter } from '../middleware/rateLimitMiddleware.js';

export interface ResyncRequest {
  playerId: string;
  clientTick: number;
  clientStateHash: string;
  clientSnapshot?: unknown;
}

export interface ResyncResponse {
  ok: boolean;
  serverTick: number;
  serverStateHash: string;
  state: unknown;
  snapshotTick: number;
  snapshotHash: string;
}

export interface ManifestErrorResponse {
  ok: false;
  error: string;
}

const paramText = (value: unknown): string => Array.isArray(value) ? String(value[0] ?? '') : typeof value === 'string' ? value : '';

function manifestError(error: string): ManifestErrorResponse {
  return { ok: false, error };
}

export function createManifestResyncRouter(worldTick: WorldTick): Router {
  const router = Router();

  router.get('/status', adminAuthMiddleware, (_req: Request, res: Response) => {
    try {
      const manager = worldTick.getManifestManager();
      res.json({
        ok: true,
        lastStateHash: manager.getLastStateHash(),
        lastSnapshotTick: manager.getLastSnapshotTick(),
        highestTick: manager.getReplayGuard().getHighestTick(),
        replayGuardNonces: manager.getReplayGuard().getNonceCount(),
      });
    } catch (error) {
      res.status(500).json(manifestError(String(error)));
    }
  });

  router.post('/resync', adminRateLimiter, authRequestHandler, (req: Request, res: Response) => {
    try {
      const { playerId, clientTick, clientStateHash } = req.body as ResyncRequest;
      if (!playerId || typeof clientTick !== 'number') {
        res.status(400).json(manifestError('Missing required fields: playerId, clientTick'));
        return;
      }

      const manager = worldTick.getManifestManager();
      const serverStateHash = manager.getLastStateHash();
      const response: ResyncResponse = {
        ok: true,
        serverTick: tickContextProvider.getContext().tickId,
        serverStateHash,
        state: (worldTick as any).buildFullState(),
        snapshotTick: manager.getLastSnapshotTick(),
        snapshotHash: manager.getReplayGuard().getHighestTick() > 0 ? serverStateHash : '',
      };

      const divergenceManifest = worldTick.handleClientDivergence(clientTick, clientStateHash || '');
      if (divergenceManifest) {
        (response as ResyncResponse & { divergence?: unknown }).divergence = {
          divergenceTick: clientTick,
          divergedComponents: divergenceManifest.divergence?.divergedComponents ?? [],
        };
      }

      res.json(response);
    } catch (error) {
      res.status(500).json(manifestError(String(error)));
    }
  });

  router.get('/snapshot/:tick', adminRateLimiter, authRequestHandler, (req: Request, res: Response) => {
    try {
      const tick = parseInt(paramText(req.params.tick), 10);
      if (Number.isNaN(tick)) {
        res.status(400).json(manifestError('Invalid tick number'));
        return;
      }

      const manager = worldTick.getManifestManager();
      res.json({
        ok: true,
        tick,
        stateHash: manager.getLastStateHash(),
        snapshotTick: manager.getLastSnapshotTick(),
        note: 'Snapshot storage is not yet available; current manifest metadata returned.',
      });
    } catch (error) {
      res.status(500).json(manifestError(String(error)));
    }
  });

  router.post('/verify', adminRateLimiter, authRequestHandler, (req: Request, res: Response) => {
    try {
      const { stateHash, tick } = req.body;
      if (!stateHash || typeof tick !== 'number') {
        res.status(400).json(manifestError('Missing required fields: stateHash, tick'));
        return;
      }

      const manager = worldTick.getManifestManager();
      const currentHash = manager.getLastStateHash();
      res.json({
        ok: true,
        matches: stateHash === currentHash,
        serverTick: tickContextProvider.getContext().tickId,
        serverStateHash: currentHash,
        requestedTick: tick,
        tickDiff: Math.abs(tickContextProvider.getContext().tickId - tick),
      });
    } catch (error) {
      res.status(500).json(manifestError(String(error)));
    }
  });

  return router;
}
