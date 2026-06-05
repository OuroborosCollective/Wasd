/**
 * GAMEPLAY SNAPSHOT ROUTE
 * 
 * Serves live gameplay snapshot for the 2D client.
 * Provides Quest/Guild/Faction/Map data from server-authoritative state.
 * 
 * Rules:
 * - No Math.random() for gameplay values
 * - No Date.now() for gameplay state
 * - All values come from real server state
 * - Empty/null states are honest and allowed
 * - status="empty" means server reachable but no gameplay data yet
 */

import express from "express";
import type { WorldTick } from "../core/WorldTick.js";
import { createEmptyGameplaySnapshot } from "./gameplaySnapshotUtils.js";

/**
 * Get current tick ID from WorldTick instance.
 * Returns 0 if not available.
 */
function getCurrentTickId(tick: WorldTick | null): number {
  if (!tick) return 0;
  return (tick as any).tickCount ?? 0;
}

/**
 * Create gameplay snapshot router.
 * Requires WorldTick instance for server tick.
 */
export function createGameplaySnapshotRouter(tick: WorldTick) {
  const router = express.Router();

  router.get("/snapshot", (_req, res) => {
    const serverTick = getCurrentTickId(tick);

    // Real subsystems not connected yet - return empty but honest snapshot
    const snapshot = createEmptyGameplaySnapshot(serverTick);

    res.json({ ok: true, snapshot });
  });

  return router;
}