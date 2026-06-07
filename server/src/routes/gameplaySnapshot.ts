/**
 * GAMEPLAY SNAPSHOT ROUTE
 *
 * Serves live gameplay snapshot for the 2D client.
 * Provides Quest/Guild/Faction/Map data from server-authoritative state.
 * Includes Character Profile and Paperdoll Snapshot.
 *
 * Rules:
 * - No Math.random() for gameplay values
 * - No Date.now() for gameplay state
 * - All values come from real server state
 * - Empty/null states are honest and allowed
 * - status="empty" means server reachable but no gameplay data yet
 * - Server determines playerId from auth/session, not client unless guest/dev fallback is enabled
 */

import express from "express";
import type { WorldTick } from "../core/WorldTick.js";
import { createGameplaySnapshot } from "./gameplaySnapshotUtils.js";
import type { WorldPoiSnapshot } from "./gameplaySnapshotUtils.js";
import { questProgressionStore } from "../quests/QuestProgressionStore.js";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import { gatheringService } from "../resources/GatheringService.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { craftingService } from "../crafting/CraftingService.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { characterService } from "../character/characterRuntime.js";
import { toCharacterProfileSnapshot } from "../character/CharacterTypes.js";
import { createPaperdollSnapshot } from "../character/PaperdollTypes.js";
import { createStartPathQuestSnapshot } from "../character/StartPathQuestLine.js";
import { composeLiveGameplaySnapshotFromLegacy } from "../gameplay/composeLiveGameplaySnapshotFromLegacy.js";
import { generateVisibleChunkPois, getStarterVillagePois, deriveChunkBiome, generateChunkPois } from "../world/WorldPoiGenerator.js";
import { getVisibleChunkCoords } from "../resources/ChunkResourceGenerator.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";

/**
 * Get current tick ID from WorldTick instance.
 * Returns 0 if not available.
 */
function getCurrentTickId(tick: WorldTick | null): number {
  if (!tick) return 0;
  return (tick as any).tickCount ?? 0;
}

function isGuestHttpAllowed(): boolean {
  const allowGuest = !["0", "false", "no"].includes(
    process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase() || "",
  );
  const allowDev = !["0", "false", "no"].includes(
    process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || "",
  );
  return allowGuest || allowDev || process.env.ALLOW_DEV_PLAYER_ID === "true";
}

function rejectUnauthenticatedInLockedProduction(identity: { authenticated: boolean }): boolean {
  return process.env.NODE_ENV === "production" && !identity.authenticated && !isGuestHttpAllowed();
}

/**
 * Create gameplay snapshot router.
 * Requires WorldTick instance for server tick.
 */
export function createGameplaySnapshotRouter(tick: WorldTick) {
  const router = express.Router();

  router.get("/snapshot", async (req, res) => {
    const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);

    if (rejectUnauthenticatedInLockedProduction(identity)) {
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
    // Player position is optional - if provided (as query params px, py in kappa units),
    // visible procedural chunks will be registered
    const pxRaw = req.query.px;
    const pyRaw = req.query.py;
    const playerPosition = (typeof pxRaw === "string" && typeof pyRaw === "string")
      ? { x: Number(pxRaw), y: Number(pyRaw) }
      : undefined;

    const resources = gatheringService.listResourceSnapshots(serverTick, playerPosition);

    // Get inventory state
    const inventoryService = await getInventoryService();
    const inventory = await inventoryService.getPlayerInventory(identity.playerId);

    // Get crafting recipes
    const craftingRecipes = await craftingService.listRecipeSnapshots(identity.playerId);

    // Get equipment state
    const equipment = await equipmentService.getPlayerEquipment(identity.playerId);

    // Get character profile
    const character = await characterService.getCharacterProfile(identity.playerId);
    const characterSnapshot = toCharacterProfileSnapshot(character);
    const derivedStartPathQuest = createStartPathQuestSnapshot({
      character: characterSnapshot,
      inventory,
      equipment,
    });

    const persistedStartPathQuest = derivedStartPathQuest
      ? questState.quests.find((quest) => quest.id === derivedStartPathQuest.id)
      : null;

    const startPathQuest = persistedStartPathQuest?.status === "completed"
      ? persistedStartPathQuest
      : derivedStartPathQuest?.status === "completed"
        ? questProgressionStore.upsertDerivedQuestSnapshot(identity.playerId, derivedStartPathQuest)
        : derivedStartPathQuest;

    const baseQuests = startPathQuest
      ? questState.quests.filter((quest) => quest.id !== startPathQuest.id)
      : questState.quests;

    // Create paperdoll snapshot from character and equipment
    const paperdoll = createPaperdollSnapshot({
      character: characterSnapshot,
      equipment,
    });

    // Generate world POIs for visible chunks
    let worldPois: WorldPoiSnapshot[] = [];
    if (playerPosition) {
      // Calculate tile position from kappa position
      const tileX = Math.floor(playerPosition.x / 1000);
      const tileZ = Math.floor(playerPosition.y / 1000);
      const visibleChunks = getVisibleChunkCoords(tileX, tileZ);
      
      // Generate POIs for visible chunks
      const generatedPois = generateVisibleChunkPois(visibleChunks);
      
      // Add starter village POIs (they're not generated for chunk 0,0)
      const starterPois = getStarterVillagePois();
      
      worldPois = [...starterPois, ...generatedPois].sort((a, b) => a.id.localeCompare(b.id));
    }

    // Hydrate and process discovery state
    await worldDiscoveryService.hydratePlayer(identity.playerId);
    
    // Process discovery if player has a position
    let recentDiscoveries: readonly { poiId: string; title: string; type: string }[] = [];
    if (playerPosition && worldPois.length > 0) {
      // Convert player position from tiles to kappa units for distance comparison
      // Player position from bridge is in tiles (e.g., 460), POIs are in kappa (e.g., 460000)
      const playerPositionKappa = {
        x: playerPosition.x * 1000,
        y: playerPosition.y * 1000,
      };
      
      const newDiscoveries = worldDiscoveryService.processDiscovery(
        identity.playerId,
        playerPositionKappa,
        worldPois,
      );
      
      // Build recent discoveries list for client feedback
      if (newDiscoveries.length > 0) {
        recentDiscoveries = newDiscoveries.map((poiId) => {
          const poi = worldPois.find((p) => p.id === poiId);
          return {
            poiId,
            title: poi?.title ?? poiId,
            type: poi?.type ?? "unknown",
          };
        });
      }
    }
    
    // Get discovery stats and discovered POI IDs
    const discoveryStats = worldDiscoveryService.getStats(identity.playerId);
    const discoveredPoiIds = worldDiscoveryService.getDiscoveredPoiIds(identity.playerId);

    const snapshot = createGameplaySnapshot({
      serverTick,
      character: characterSnapshot,
      paperdoll,
      quests: startPathQuest
        ? [...baseQuests, startPathQuest]
        : baseQuests,
      skills: skillState.skills,
      resources,
      inventory,
      crafting: {
        recipes: craftingRecipes,
      },
      equipment,
      guild: null,
      factions: [],
      map: {
        worldPois,
      },
    });

    // Convert POIs to live gameplay format with discovery info
    const liveWorldPois = worldPois.map((poi) => ({
      poiId: poi.id,
      type: poi.type,
      title: poi.title,
      x: poi.position.x,
      y: poi.position.y,
      chunkX: poi.chunk.x,
      chunkZ: poi.chunk.z,
      discovered: discoveredPoiIds.includes(poi.id),
    }));

    const liveGameplaySnapshot = await composeLiveGameplaySnapshotFromLegacy({
      playerId: identity.playerId,
      logicalIndex: serverTick,
      inventory,
      equipment,
      skills: skillState.skills,
      resourceNodes: resources,
      worldPois: liveWorldPois,
      discoveryStats,
      recentDiscoveries,
    });

    // Persist discovery state (non-blocking)
    worldDiscoveryService.persistPlayer(identity.playerId).catch((err) => {
      console.error("[Discovery] Failed to persist:", err);
    });

    res.json({
      ok: true,
      playerId: identity.playerId,
      playerIdentitySource: identity.source,
      authenticated: identity.authenticated,
      snapshot,
      liveGameplaySnapshot,
    });
  });

  return router;
}
