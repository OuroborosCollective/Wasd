/**
 * ARE HEARTBEAT ROUTE
 * 
 * Serves live ARE heartbeat snapshot for the 2D client.
 * 
 * Phase 11: Uses TickSystemContextProvider instead of WorldTick.ts coupling.
 * 
 * Rules:
 * - No Math.random() for ARE values
 * - No Date.now() for simulation values
 * - kappa is exactly 1000 (invariant)
 * - tickId comes from TickSystemContextProvider
 * - observerCount comes from WebSocket connection count
 * - replayHash is deterministic from stable input
 */

import express from "express";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { createAREHeartbeatSnapshot } from "./areHeartbeatUtils.js";

/**
 * Get current observer count from WebSocket server.
 * Returns 0 if not available (clean fallback).
 */
function getObserverCount(ws: any): number {
  // Try to get connected clients count from WebSocket server
  try {
    if (ws?.wss?.clients) {
      // Count only connected (readyState === 1) clients
      let count = 0;
      for (const client of ws.wss.clients) {
        if (client.readyState === 1) {
          count++;
        }
      }
      return count;
    }
  } catch {
    // Fallback: return 0
  }
  return 0;
}

/**
 * Create ARE heartbeat router.
 * Phase 11: Uses TickSystemContextProvider for tick count.
 */
export function createAREHeartbeatRouter(_tick: any, ws: any) {
  const router = express.Router();

  router.get("/heartbeat", (_req, res) => {
    // Phase 11: Use TickSystemContextProvider for deterministic tick
    const tickContext = tickContextProvider.getContext();
    const tickId = tickContext.tickId;
    const observerCount = getObserverCount(ws);

    const snapshot = createAREHeartbeatSnapshot({
      tickId,
      observerCount,
      worldSeed: process.env.WORLD_SEED,
    });

    res.json(snapshot);
  });

  return router;
}