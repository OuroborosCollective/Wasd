/**
 * Manifest Resync API
 * 
 * Endpoint for client divergence recovery.
 * When a client detects divergence, it can request a resync from this endpoint.
 * 
 * Flow:
 * 1. Client detects divergence (stateHash mismatch or large tick gap)
 * 2. Client calls POST /api/manifest/resync with its current state
 * 3. Server validates the request
 * 4. Server creates a resync manifest and returns full state
 * 5. Client replaces its state with the server state
 */

import { Router, Request, Response } from 'express';
import type { WorldTick } from '../core/WorldTick.js';
import { tickContextProvider } from '../core/are/TickSystemContextProvider.js';

export interface ResyncRequest {
  /** Player ID requesting resync */
  playerId: string;
  /** Client's current tick */
  clientTick: number;
  /** Client's last known state hash */
  clientStateHash: string;
  /** Client's current world state (for comparison) */
  clientSnapshot?: unknown;
}

export interface ResyncResponse {
  /** Whether resync was successful */
  ok: boolean;
  /** Server's current tick */
  serverTick: number;
  /** Server's current state hash */
  serverStateHash: string;
  /** Full server state for resync */
  state: unknown;
  /** Snapshot tick to use for future reference */
  snapshotTick: number;
  /** Snapshot state hash */
  snapshotHash: string;
  /** Error message if resync failed */
  error?: string;
}

export function createManifestResyncRouter(worldTick: WorldTick): Router {
  const router = Router();

  /**
   * GET /api/manifest/status
   * 
   * Get current manifest system status.
   */
  router.get('/status', (_req: Request, res: Response) => {
    try {
      const manager = worldTick.getManifestManager();
      const state = manager.getLastStateHash();
      
      res.json({
        ok: true,
        lastStateHash: state,
        lastSnapshotTick: manager.getLastSnapshotTick(),
        highestTick: manager.getReplayGuard().getHighestTick(),
        replayGuardNonces: manager.getReplayGuard().getNonceCount(),
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  /**
   * POST /api/manifest/resync
   * 
   * Request a state resync after client divergence.
   * 
   * Body:
   * {
   *   playerId: string,
   *   clientTick: number,
   *   clientStateHash: string
   * }
   */
  router.post('/resync', (req: Request, res: Response) => {
    try {
      const { playerId, clientTick, clientStateHash } = req.body as ResyncRequest;
      
      if (!playerId || typeof clientTick !== 'number') {
        res.status(400).json({
          ok: false,
          error: 'Missing required fields: playerId, clientTick',
        } as ResyncResponse);
        return;
      }

      // Get current server state (using private method via class access)
      const serverState = (worldTick as any).buildFullState();
      // Phase 11: Use TickSystemContextProvider for deterministic tick
      const serverTick = tickContextProvider.getContext().tickId;
      
      // Create divergence manifest
      const divergenceManifest = worldTick.handleClientDivergence(
        clientTick,
        clientStateHash || ''
      );

      // Get manifest manager info
      const manager = worldTick.getManifestManager();
      const serverStateHash = manager.getLastStateHash();
      const snapshotTick = manager.getLastSnapshotTick();

      // Build resync response
      const response: ResyncResponse = {
        ok: true,
        serverTick,
        serverStateHash,
        state: serverState,
        snapshotTick,
        snapshotHash: manager.getReplayGuard().getHighestTick() > 0 
          ? serverStateHash 
          : '',
      };

      // If there was a divergence, include manifest info
      if (divergenceManifest) {
        (response as any).divergence = {
          divergenceTick: clientTick,
          divergedComponents: divergenceManifest.divergence?.divergedComponents ?? [],
        };
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: String(error),
      } as ResyncResponse);
    }
  });

  /**
   * GET /api/manifest/snapshot/:tick
   * 
   * Get a specific snapshot for debugging/audit.
   */
  router.get('/snapshot/:tick', (req: Request, res: Response) => {
    try {
      const tickParam = req.params.tick;
      const tick = parseInt(Array.isArray(tickParam) ? tickParam[0] : tickParam, 10);
      if (isNaN(tick)) {
        res.status(400).json({ ok: false, error: 'Invalid tick number' });
        return;
      }

      // For now, just return current state with tick info
      // A full snapshot system would store snapshots separately
      const manager = worldTick.getManifestManager();
      
      res.json({
        ok: true,
        tick,
        stateHash: manager.getLastStateHash(),
        snapshotTick: manager.getLastSnapshotTick(),
        note: 'Full snapshot storage not yet implemented - returns current state',
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  /**
   * POST /api/manifest/verify
   * 
   * Verify a manifest without triggering resync.
   * Useful for clients to check their state validity.
   */
  router.post('/verify', (req: Request, res: Response) => {
    try {
      const { stateHash, tick } = req.body;
      
      if (!stateHash || typeof tick !== 'number') {
        res.status(400).json({
          ok: false,
          error: 'Missing required fields: stateHash, tick',
        });
        return;
      }

      const manager = worldTick.getManifestManager();
      const currentHash = manager.getLastStateHash();
      const matches = stateHash === currentHash;

      res.json({
        ok: true,
        matches,
        // Phase 11: Use TickSystemContextProvider for deterministic tick
        serverTick: tickContextProvider.getContext().tickId,
        serverStateHash: currentHash,
        requestedTick: tick,
        tickDiff: Math.abs(tickContextProvider.getContext().tickId - tick),
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  return router;
}