import express from "express";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { createGameplaySnapshot, type WorldPoiSnapshot } from "./gameplaySnapshotUtils.js";
import { questProgressionStore } from "../quests/QuestProgressionStore.js";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import { gatheringService } from "../resources/GatheringService.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { craftingService } from "../crafting/CraftingService.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { workOrderService } from "../economy/WorkOrderService.js";
import { characterService } from "../character/characterRuntime.js";
import { toCharacterProfileSnapshot } from "../character/CharacterTypes.js";
import { createPaperdollSnapshot } from "../character/PaperdollTypes.js";
import { createStartPathQuestSnapshot } from "../character/StartPathQuestLine.js";
import { composeLiveGameplaySnapshotFromLegacy } from "../gameplay/composeLiveGameplaySnapshotFromLegacy.js";
import { generateNPCActivitySnapshot } from "../gameplay/NPCActivitySnapshotGenerator.js";
import { generateVisibleChunkPois, getStarterVillagePois } from "../world/WorldPoiGenerator.js";
import { getVisibleChunkCoords } from "../resources/ChunkResourceGenerator.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { runLineageBirthForSnapshot, type LineageRuntimeStateProvider } from "../modules/npc/LineageBirthSnapshotBridge.js";
import { getLineageRuntimeStateProvider } from "../modules/npc/LineageRuntimeStateProviderRegistry.js";
import {
  buildRuntimeNpcActivityContexts,
  resolveRuntimeFactionStandings,
  resolveRuntimeGuildSnapshot,
} from "./gameplaySnapshotTruthProviders.js";

export interface GameplaySnapshotRouterDeps {
  readonly lineageRuntimeStateProvider?: LineageRuntimeStateProvider;
}

function getCurrentTickId(): number {
  return tickContextProvider.getTickCounter();
}

function isGuestHttpAllowed(): boolean {
  const allowGuest = !["0", "false", "no"].includes(process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase() || "");
  const allowDev = !["0", "false", "no"].includes(process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || "");
  return allowGuest || allowDev || process.env.ALLOW_DEV_PLAYER_ID === "true";
}

function rejectUnauthenticatedInLockedProduction(identity: { authenticated: boolean }): boolean {
  return process.env.NODE_ENV === "production" && !identity.authenticated && !isGuestHttpAllowed();
}

function resolveLineageRuntimeStateProvider(deps: GameplaySnapshotRouterDeps): LineageRuntimeStateProvider | undefined {
  return deps.lineageRuntimeStateProvider ?? getLineageRuntimeStateProvider();
}

export function createGameplaySnapshotRouter(deps: GameplaySnapshotRouterDeps = {}) {
  const router = express.Router();

  router.get("/snapshot", async (req, res) => {
    const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);
    if (rejectUnauthenticatedInLockedProduction(identity)) {
      res.status(401).json({ ok: false, error: "authenticated_player_required" });
      return;
    }

    const serverTick = getCurrentTickId();
    await questProgressionStore.hydratePlayer(identity.playerId);
    const questState = questProgressionStore.getPlayerQuestState(identity.playerId);

    const skillService = await getSkillProgressionService();
    await skillService.hydratePlayer(identity.playerId);
    const skillState = await skillService.getPlayerSkillState(identity.playerId);

    const pxRaw = req.query.px;
    const pyRaw = req.query.py;
    const playerPosition = typeof pxRaw === "string" && typeof pyRaw === "string" ? { x: Number(pxRaw), y: Number(pyRaw) } : undefined;
    const resources = gatheringService.listResourceSnapshots(serverTick, playerPosition);
    const workOrders = workOrderService.listSnapshots(serverTick);

    const inventoryService = await getInventoryService();
    const inventory = await inventoryService.getPlayerInventory(identity.playerId);
    const craftingRecipes = await craftingService.listRecipeSnapshots(identity.playerId);
    const equipment = await equipmentService.getPlayerEquipment(identity.playerId);
    const character = await characterService.getCharacterProfile(identity.playerId);
    const characterSnapshot = toCharacterProfileSnapshot(character);
    const derivedStartPathQuest = createStartPathQuestSnapshot({ character: characterSnapshot, inventory, equipment });
    const persistedStartPathQuest = derivedStartPathQuest ? questState.quests.find((quest) => quest.id === derivedStartPathQuest.id) : null;
    const startPathQuest = persistedStartPathQuest?.status === "completed"
      ? persistedStartPathQuest
      : derivedStartPathQuest?.status === "completed"
        ? questProgressionStore.upsertDerivedQuestSnapshot(identity.playerId, derivedStartPathQuest)
        : derivedStartPathQuest;
    const baseQuests = startPathQuest ? questState.quests.filter((quest) => quest.id !== startPathQuest.id) : questState.quests;
    const paperdoll = createPaperdollSnapshot({ character: characterSnapshot, equipment });

    let worldPois: WorldPoiSnapshot[] = [];
    if (playerPosition) {
      const tileX = Math.floor(playerPosition.x / 1000);
      const tileZ = Math.floor(playerPosition.y / 1000);
      const visibleChunks = getVisibleChunkCoords(tileX, tileZ);
      const generatedPois = generateVisibleChunkPois(visibleChunks);
      const starterPois = getStarterVillagePois();
      worldPois = [...starterPois, ...generatedPois].sort((a, b) => a.id.localeCompare(b.id));
    }

    await worldDiscoveryService.hydratePlayer(identity.playerId);
    let recentDiscoveries: readonly { poiId: string; title: string; type: string }[] = [];
    if (playerPosition && worldPois.length > 0) {
      const playerPositionKappa = { x: playerPosition.x * 1000, y: playerPosition.y * 1000 };
      const newDiscoveries = worldDiscoveryService.processDiscovery(identity.playerId, playerPositionKappa, worldPois);
      if (newDiscoveries.length > 0) {
        recentDiscoveries = newDiscoveries.map((poiId) => {
          const poi = worldPois.find((candidate) => candidate.id === poiId);
          return { poiId, title: poi?.title ?? poiId, type: poi?.type ?? "unknown" };
        });
      }
    }

    await runLineageBirthForSnapshot({
      playerId: identity.playerId,
      logicalIndex: serverTick,
      provider: resolveLineageRuntimeStateProvider(deps),
      context: { worldPois, playerPosition },
    });

    const discoveryStats = worldDiscoveryService.getStats(identity.playerId);
    const discoveredPoiIds = worldDiscoveryService.getDiscoveredPoiIds(identity.playerId);
    const guildSnapshot = resolveRuntimeGuildSnapshot(identity.playerId);
    const factionStandings = resolveRuntimeFactionStandings(identity.playerId);
    const npcActivityEntities = buildRuntimeNpcActivityContexts({
      playerId: identity.playerId,
      tick: serverTick,
      playerPosition,
      worldPois,
      discoveredPoiIds,
    });
    const npcActivity = generateNPCActivitySnapshot({ tick: serverTick, entities: [...npcActivityEntities] });

    const snapshot = createGameplaySnapshot({
      serverTick,
      character: characterSnapshot,
      paperdoll,
      quests: startPathQuest ? [...baseQuests, startPathQuest] : baseQuests,
      skills: skillState.skills,
      resources,
      inventory,
      crafting: { recipes: craftingRecipes },
      equipment,
      guild: guildSnapshot,
      factions: [...factionStandings],
      map: { worldPois },
      npcActivity,
    });

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
      workOrders,
    });
  });

  return router;
}
