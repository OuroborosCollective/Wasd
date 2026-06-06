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
 * - Server determines playerId from auth/session, not client
 */

import express from "express";
import type { WorldTick } from "../core/WorldTick.js";
import { createGameplaySnapshot } from "./gameplaySnapshotUtils.js";
import { questProgressionStore } from "../quests/QuestProgressionStore.js";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import { gatheringService } from "../resources/GatheringService.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { craftingService } from "../crafting/CraftingService.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";

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

  router.get("/snapshot", async (req, res) => {
    const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);

    if (process.env.NODE_ENV === "production" && !identity.authenticated) {
      res.status(401).json({
        ok: false,
        error: "authenticated_player_required",
      });
      return;
    }

    const serverTick = getCurrentTickId(tick);

    // Hydrate persisted quest state before returning
    await questProgressionStore.hydratePlayer(identity.playerId);
    const questState = questProgressionStore.getPlayerQuestState(identity.playerId);

    // Get skill state
    const skillService = await getSkillProgressionService();
    await skillService.hydratePlayer(identity.playerId);
    const skillState = await skillService.getPlayerSkillState(identity.playerId);

    // Get resource node snapshots
    const resources = gatheringService.listResourceSnapshots(serverTick);

    // Get inventory state
    const inventoryService = await getInventoryService();
    const inventory = await inventoryService.getPlayerInventory(identity.playerId);

    // Get crafting recipes
    const craftingRecipes = await craftingService.listRecipeSnapshots(identity.playerId);

    // Get equipment state
    const equipment = await equipmentService.getPlayerEquipment(identity.playerId);

    const snapshot = createGameplaySnapshot({
      serverTick,
      quests: questState.quests,
      skills: skillState.skills,
      resources,
      inventory,
      crafting: {
        recipes: craftingRecipes,
      },
      equipment,
      guild: null,
      factions: [],
      map: {},
    });

    res.json({
      ok: true,
      playerId: identity.playerId,
      playerIdentitySource: identity.source,
      authenticated: identity.authenticated,
      snapshot,
    });
  });

  return router;
}
