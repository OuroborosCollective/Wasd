/**
 * ARE HEARTBEAT ROUTE
 * 
 * Serves live ARE heartbeat snapshot for the 2D client.
 * 
 * Rules:
 * - No Math.random() for ARE values
 * - No Date.now() for simulation values
 * - kappa is exactly 1000 (invariant)
 * - tickId comes from real server tick state
 * - observerCount comes from WebSocket connection count
 * - replayHash is deterministic from stable input
 */

import express from "express";
import type { WorldTick } from "../core/WorldTick.js";
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
 * Get current tick ID from WorldTick instance.
 * Returns 0 if not available.
 */
function getCurrentTickId(tick: WorldTick | null): number {
  if (!tick) return 0;
  // tick is the WorldTick instance, access tickCount property
  return (tick as any).tickCount ?? 0;
}

/**
 * Create ARE heartbeat router.
 * Requires WorldTick instance for tick count and WebSocket for observer count.
 */
export function createAREHeartbeatRouter(tick: WorldTick, ws: any) {
  const router = express.Router();

  router.get("/heartbeat", (_req, res) => {
    const tickId = getCurrentTickId(tick);
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