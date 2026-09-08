import { createHash } from "node:crypto";
import express from "express";
import { resolveHttpPlayerIdentity } from "../auth/PlayerIdentityResolver.js";
import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { aurionTransitionRuntime } from "../aurion/AurionTransitionRuntime.js";
import { worldTickAdapter } from "../core/are/WorldTickThinShellAdapter.js";
import { characterService } from "../character/characterRuntime.js";
import { createPaperdollSnapshot } from "../character/PaperdollTypes.js";
import { createStartPathQuestSnapshot } from "../character/StartPathQuestLine.js";
import { toCharacterProfileSnapshot } from "../character/CharacterTypes.js";
import { craftingService } from "../crafting/CraftingService.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { workOrderService } from "../economy/WorkOrderService.js";
import { composeLiveGameplaySnapshotFromLegacy } from "../gameplay/composeLiveGameplaySnapshotFromLegacy.js";
import { generateNPCActivitySnapshot } from "../gameplay/NPCActivitySnapshotGenerator.js";
import { runtimeHistoryLog } from "../history/RuntimeHistoryLog.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { npcQuestRuntime } from "../quests/NpcQuestRuntime.js";
import { questProgressionStore } from "../quests/QuestProgressionStore.js";
import { getVisibleChunkCoords } from "../resources/ChunkResourceGenerator.js";
import { previewVisibleResourceSnapshots } from "../resources/ResourceSnapshotProjection.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { generateVisibleChunkPois, getStarterVillagePois } from "../world/WorldPoiGenerator.js";
import { createGameplaySnapshot, type WorldPoiSnapshot } from "./gameplaySnapshotUtils.js";
import {
  buildRuntimeNpcActivityContexts,
  resolveRuntimeFactionStandings,
  resolveRuntimeGuildSnapshot,
} from "./gameplaySnapshotTruthProviders.js";

export interface GameplaySnapshotRouterDeps {}

function getCurrentTickId(): number | null {
  const tick = Number(tickContextProvider.getTickCounter());
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : null;
}

function isGuestHttpAllowed(): boolean {
  const allowGuest = !["0", "false", "no"].includes(process.env.ALLOW_GUEST_LOGIN?.trim().toLowerCase() || "");
  const allowDev = !["0", "false", "no"].includes(process.env.ALLOW_DEV_LOGIN?.trim().toLowerCase() || "");
  return allowGuest || allowDev || process.env.ALLOW_DEV_PLAYER_ID === "true";
}

function rejectUnauthenticatedInLockedProduction(identity: { authenticated: boolean }): boolean {
  return process.env.NODE_ENV === "production" && !identity.authenticated && !isGuestHttpAllowed();
}

function runtimePlayerPosition(playerId: string): { x: number; y: number } | undefined {
  const player = worldTickAdapter.playerSystem.getPlayer(playerId);
  const x = Number(player?.position?.x);
  const y = Number(player?.position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { x, y };
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function moduleEvidence(value: unknown): { readonly status: "live"; readonly hash: string } {
  return Object.freeze({ status: "live" as const, hash: sha256(value) });
}

export function createGameplaySnapshotRouter(_deps: GameplaySnapshotRouterDeps = {}) {
  const router = express.Router();

  router.get("/snapshot", async (req, res) => {
    const identity = resolveHttpPlayerIdentity(req as Parameters<typeof resolveHttpPlayerIdentity>[0]);
    if (rejectUnauthenticatedInLockedProduction(identity)) {
      res.status(401).json({ ok: false, error: "authenticated_player_required" });
      return;
    }

    const serverTick = getCurrentTickId();
    if (serverTick === null) {
      res.status(503).json({ ok: false, error: "runtime_tick_unavailable" });
      return;
    }

    try {
      await Promise.all([
        questProgressionStore.hydratePlayer(identity.playerId),
        npcQuestRuntime.hydratePlayer(identity.playerId),
        worldDiscoveryService.hydratePlayer(identity.playerId),
      ]);
      const questState = questProgressionStore.getPlayerQuestState(identity.playerId);
      const skillService = await getSkillProgressionService();
      await skillService.hydratePlayer(identity.playerId);
      const skillState = await skillService.getPlayerSkillState(identity.playerId);
      const playerPosition = runtimePlayerPosition(identity.playerId);
      const resources = previewVisibleResourceSnapshots(serverTick, playerPosition);
      const workOrders = workOrderService.listSnapshots(serverTick);

      const inventoryService = await getInventoryService();
      const inventory = await inventoryService.getPlayerInventory(identity.playerId);
      const craftingRecipes = await craftingService.listRecipeSnapshots(identity.playerId, playerPosition);
      const equipment = await equipmentService.getPlayerEquipment(identity.playerId);
      const character = await characterService.getCharacterProfile(identity.playerId);
      const characterSnapshot = toCharacterProfileSnapshot(character);
      const derivedStartPathQuest = createStartPathQuestSnapshot({ character: characterSnapshot, inventory, equipment });
      const persistedStartPathQuest = derivedStartPathQuest
        ? questState.quests.find((quest) => quest.id === derivedStartPathQuest.id)
        : null;
      const startPathQuest = persistedStartPathQuest?.status === "completed"
        ? persistedStartPathQuest
        : derivedStartPathQuest;
      const baseQuests = startPathQuest
        ? questState.quests.filter((quest) => quest.id !== startPathQuest.id)
        : questState.quests;
      const paperdoll = createPaperdollSnapshot({ character: characterSnapshot, equipment });

      let worldPois: WorldPoiSnapshot[] = [];
      if (playerPosition) {
        const tileX = Math.floor(playerPosition.x / 1000);
        const tileZ = Math.floor(playerPosition.y / 1000);
        const visibleChunks = getVisibleChunkCoords(tileX, tileZ);
        // Bolt: Optimized hot-path POI sorting using fast direct relational string comparison instead of slow localeCompare
        worldPois = [...getStarterVillagePois(), ...generateVisibleChunkPois(visibleChunks)]
          .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      }

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

      const composed = await composeLiveGameplaySnapshotFromLegacy({
        playerId: identity.playerId,
        logicalIndex: serverTick,
        inventory,
        equipment,
        skills: skillState.skills,
        resourceNodes: resources,
        worldPois: liveWorldPois,
        discoveryStats,
        recentDiscoveries: [],
      });
      const aurionTransition = aurionTransitionRuntime.getSnapshot(identity.playerId);
      const latestMutation = runtimeHistoryLog.latestByActor(identity.playerId);
      const revisionSequence = latestMutation?.sequence ?? -1;
      const lastMutationHash = latestMutation?.entryHash ?? null;
      const sourceEvidence = Object.freeze({
        character: moduleEvidence({ characterSnapshot, paperdoll }),
        quests: moduleEvidence({ quests: snapshot.quests, active: composed.activeQuests, available: composed.availableQuests, completed: composed.completedQuestIds }),
        dialogues: moduleEvidence({ dialogues: composed.npcDialogues, reputations: composed.npcReputations, memories: composed.npcMemories, rumors: composed.npcRumors }),
        skills: moduleEvidence(composed.skills),
        resources: moduleEvidence(composed.resourceNodes),
        inventory: moduleEvidence(composed.inventory),
        crafting: moduleEvidence({ recipes: craftingRecipes, stations: composed.processingStations }),
        equipment: moduleEvidence({ equipment: composed.equipment, stats: composed.equipmentStats }),
        wallet: moduleEvidence(composed.wallet),
        vendorEconomy: moduleEvidence({ vendorEconomy: composed.vendorEconomy, marketState: composed.marketState }),
        camp: moduleEvidence({ campNpcs: composed.campNpcs, campStocks: composed.campStocks }),
        discovery: moduleEvidence({ worldPois: composed.worldPois, discoveryStats: composed.discoveryStats }),
        guild: moduleEvidence(guildSnapshot),
        factions: moduleEvidence(factionStandings),
        map: moduleEvidence({ worldPois, npcActivity, worldSurface: composed.worldSurface }),
        workOrders: moduleEvidence(workOrders),
        aurion: moduleEvidence(aurionTransition),
      });
      const composedWithEvidence = Object.freeze({
        ...composed,
        aurionTransition,
        sourceEvidence,
        revisionSequence,
        lastMutationHash,
      });
      const revisionPayload = {
        playerId: identity.playerId,
        serverTick,
        snapshot,
        liveGameplaySnapshot: composedWithEvidence,
        workOrders,
        sourceEvidence,
        revisionSequence,
        lastMutationHash,
      };
      const revisionHash = sha256(revisionPayload);
      const liveGameplaySnapshot = Object.freeze({ ...composedWithEvidence, revisionHash });

      res.json({
        ok: true,
        playerId: identity.playerId,
        playerIdentitySource: identity.source,
        authenticated: identity.authenticated,
        serverTick,
        revisionSequence,
        lastMutationHash,
        revisionHash,
        sourceEvidence,
        snapshot,
        liveGameplaySnapshot,
        workOrders,
      });
    } catch (error) {
      console.error("[gameplay-snapshot] Runtime source unavailable:", error);
      res.status(503).json({
        ok: false,
        error: "snapshot_source_unavailable",
        playerId: identity.playerId,
        serverTick,
      });
    }
  });

  return router;
}
