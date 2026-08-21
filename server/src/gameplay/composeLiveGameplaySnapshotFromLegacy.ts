import { LiveGameplaySnapshotComposer, buildVendorEconomySnapshot } from "./LiveGameplaySnapshotComposer.js";
import type { LiveGameplaySnapshot, DiscoveryStats, RecentDiscovery, LiveGameplayCampNpc, LiveGameplayCampStock, LiveGameplayQuestProgress, LiveGameplayNpcMemory, LiveGameplayNpcRumor } from "./LiveGameplaySnapshotTypes.js";
import { toLiveEquipmentSlots } from "./adapters/EquipmentSnapshotAdapter.js";
import { toLiveInventoryItems } from "./adapters/InventorySnapshotAdapter.js";
import { getWalletService, getVendorStockService } from "../economy/economyRuntime.js";
import { getVillageResourceVendor } from "../economy/VillageVendors.js";
import { campNpcService } from "../npc/CampNpcService.js";
import { campStockRuntime } from "../npc/CampStockRuntime.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import { createDefaultStatBlock, statKeyToPropertyName, isEquipmentStatKey, capStatValue } from "../equipment/EquipmentStatTypes.js";
import type { EquipmentStatBlock } from "../equipment/EquipmentStatTypes.js";
import { getStarterProcessingStations } from "../crafting/ProcessingStations.js";
import { npcQuestService } from "../quests/NpcQuestService.js";
import { generateCampQuestOffers } from "../quests/CampQuestDirector.js";
import { campQuestRuntime } from "../quests/campQuestRuntime.js";
import { npcMemoryService } from "../npc/NpcMemoryService.js";
import { npcRumorService } from "../npc/NpcRumorService.js";
import { getNpcLineageWorldSurface } from "../modules/npc/NpcLineageWorldSurfaceRuntime.js";

interface LegacyInventorySlot {
  readonly itemId?: string;
  readonly id?: string;
  readonly quantity?: number;
  readonly count?: number;
}

interface LegacyInventorySnapshot {
  readonly slots?: readonly LegacyInventorySlot[];
}

interface LegacyEquipmentSlot {
  readonly slot?: string;
  readonly slotId?: string;
  readonly itemId?: string | null;
}

interface LegacyEquipmentSnapshot {
  readonly slots?: readonly LegacyEquipmentSlot[];
}

interface LegacySkillSnapshot {
  readonly id?: string;
  readonly skillId?: string;
  readonly xp?: number;
  readonly level?: number;
  readonly xpExact?: string;
  readonly levelExact?: string;
  readonly xpIntoLevelExact?: string;
  readonly xpForNextLevelExact?: string;
  readonly numberProjectionExact?: boolean;
}

interface LegacyResourceNodeSnapshot {
  readonly id?: string;
  readonly nodeId?: string;
  readonly kind?: string;
  readonly resourceId?: string;
  readonly itemRewardId?: string;
  readonly skillId?: string;
  readonly x?: number;
  readonly y?: number;
  readonly position?: {
    readonly x?: number;
    readonly y?: number;
  };
  readonly available?: boolean;
  readonly status?: string;
}

interface NpcQuestProgressSource {
  readonly questId: string;
  readonly state: "available" | "active" | "ready_to_complete" | "completed";
  readonly objectives: readonly {
    readonly objectiveId: string;
    readonly title: string;
    readonly current: number;
    readonly required: number;
    readonly completed: boolean;
  }[];
}

export interface ComposeLiveGameplaySnapshotFromLegacyInput {
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly inventory: LegacyInventorySnapshot;
  readonly equipment: LegacyEquipmentSnapshot | null;
  readonly skills: readonly LegacySkillSnapshot[];
  readonly resourceNodes: readonly LegacyResourceNodeSnapshot[];
  readonly worldPois?: readonly {
    readonly poiId: string;
    readonly type: string;
    readonly title: string;
    readonly x: number;
    readonly y: number;
    readonly chunkX: number;
    readonly chunkZ: number;
    readonly discovered?: boolean;
  }[];
  readonly discoveryStats?: {
    readonly discoveredPoiCount: number;
    readonly discoveredChunkCount: number;
    readonly visiblePoiCount: number;
  };
  readonly recentDiscoveries?: readonly {
    readonly poiId: string;
    readonly title: string;
    readonly type: string;
  }[];
}

function toLiveNpcQuestProgress(quest: NpcQuestProgressSource): LiveGameplayQuestProgress {
  const definition = npcQuestService.getQuestDefinition(quest.questId);
  const base = {
    questId: quest.questId,
    title: definition?.title ?? quest.questId,
    description: definition?.description ?? "",
    npcId: definition?.npcId ?? "",
    state: quest.state,
    objectives: quest.objectives.map((obj) => ({
      objectiveId: obj.objectiveId,
      title: obj.title,
      current: obj.current,
      required: obj.required,
      completed: obj.completed,
    })),
  } satisfies Omit<LiveGameplayQuestProgress, "reward">;

  if (!definition) return base;
  return {
    ...base,
    reward: {
      coins: definition.reward.coins,
      gatheringXp: definition.reward.gatheringXp,
      craftingXp: definition.reward.craftingXp,
      reputation: definition.reward.reputation,
    },
  };
}

function canonicalNonNegativeExact(value: unknown, allowZero = true): string | undefined {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) return undefined;
  if (!allowZero && value === "0") return undefined;
  return value;
}

export async function composeLiveGameplaySnapshotFromLegacy(
  input: ComposeLiveGameplaySnapshotFromLegacyInput,
): Promise<LiveGameplaySnapshot> {
  const vendor = getVillageResourceVendor();

  const composer = new LiveGameplaySnapshotComposer({
    getInventoryItems: () => toLiveInventoryItems(input.inventory.slots ?? []),
    getEquipmentSlots: () => toLiveEquipmentSlots(
      (input.equipment?.slots ?? []).map((slot) => ({
        slot: String(slot.slot ?? slot.slotId ?? ""),
        itemId: slot.itemId ?? null,
      })),
    ),
    getSkillStates: () => input.skills.map((skill) => {
      const xpExact = canonicalNonNegativeExact(skill.xpExact);
      const levelExact = canonicalNonNegativeExact(skill.levelExact, false);
      const xpIntoLevelExact = canonicalNonNegativeExact(skill.xpIntoLevelExact);
      const xpForNextLevelExact = canonicalNonNegativeExact(skill.xpForNextLevelExact, false);
      return {
        skillId: String(skill.skillId ?? skill.id ?? "unknown_skill"),
        xp: Math.max(0, Math.floor(Number(skill.xp ?? 0))),
        level: Math.max(1, Math.floor(Number(skill.level ?? 1))),
        ...(xpExact ? { xpExact } : {}),
        ...(levelExact ? { levelExact } : {}),
        ...(xpIntoLevelExact ? { xpIntoLevelExact } : {}),
        ...(xpForNextLevelExact ? { xpForNextLevelExact } : {}),
        ...(typeof skill.numberProjectionExact === "boolean"
          ? { numberProjectionExact: skill.numberProjectionExact }
          : {}),
      };
    }),
    getResourceNodes: () => input.resourceNodes.map((node) => ({
      nodeId: String(node.nodeId ?? node.id ?? "unknown_node"),
      resourceId: String(node.resourceId ?? node.itemRewardId ?? node.kind ?? "resource"),
      skillId: String(node.skillId ?? "unknown_skill"),
      x: Number(node.x ?? node.position?.x ?? 0),
      y: Number(node.y ?? node.position?.y ?? 0),
      available: node.available === true || node.status === "available",
    })),
    getWallet: async (playerId: string) => {
      const walletService = await getWalletService();
      const wallet = await walletService.getWallet(playerId);
      return { coin: wallet.balances.coin };
    },
    getWorldPois: () => input.worldPois ?? [],
    getWorldSurface: (playerId: string, logicalIndex: number) => getNpcLineageWorldSurface(playerId, logicalIndex),
    getVendorEconomy: async () => {
      const vendorStockService = await getVendorStockService();
      const stockEntries = await vendorStockService.getStockEntries(vendor.id);
      return buildVendorEconomySnapshot(vendor.id, vendor.name, stockEntries);
    },
    getDiscoveryStats: () => input.discoveryStats ?? {
      discoveredPoiCount: 0,
      discoveredChunkCount: 0,
      visiblePoiCount: 0,
    },
    getRecentDiscoveries: () => input.recentDiscoveries ?? [],
    getEquipmentStats: (_playerId: string): EquipmentStatBlock => {
      const eq = input.equipment as { slots?: readonly { slotId?: string; itemId?: string | null }[] } | null;
      if (!eq?.slots) return createDefaultStatBlock();
      const aggregated: Record<string, number> = {};
      const sortedSlots = [...eq.slots].sort((a, b) =>
        String(a.slotId ?? "").localeCompare(String(b.slotId ?? "")),
      );
      for (const slot of sortedSlots) {
        if (!slot.itemId) continue;
        const tierMap: Record<string, Partial<Record<string, number>>> = {
          wooden_axe: { gatheringXp: 100 },
          copper_pickaxe: { gatheringXp: 100 },
          simple_fishing_rod: { gatheringXp: 100 },
          copper_axe: { gatheringXp: 200 },
          reinforced_pickaxe: { gatheringXp: 200 },
          reinforced_fishing_rod: { gatheringXp: 200 },
        };
        const itemBonuses = tierMap[slot.itemId];
        if (itemBonuses) {
          for (const [key, value] of Object.entries(itemBonuses)) {
            aggregated[key] = (aggregated[key] ?? 0) + value;
          }
        }
      }
      const capped: EquipmentStatBlock = { ...createDefaultStatBlock() };
      for (const [key, value] of Object.entries(aggregated)) {
        if (isEquipmentStatKey(key)) {
          const propName = statKeyToPropertyName(key);
          (capped as any)[propName] = capStatValue(key, value);
        }
      }
      return Object.freeze(capped);
    },
    getProcessingStations: () => getStarterProcessingStations().map((station) => ({
      id: station.id,
      type: station.type,
      title: station.title,
      x: station.position.x,
      y: station.position.y,
      interactionRadius: station.interactionRadius,
    })),
    getActiveQuests: (playerId: string) => npcQuestService.getActiveQuests(playerId).map(toLiveNpcQuestProgress),
    getAvailableQuests: async (playerId: string) => {
      const npcQuests = npcQuestService.getAvailableQuests(playerId).map(toLiveNpcQuestProgress);
      const npcCompletedQuestIds = npcQuestService.getCompletedQuestIds(playerId);
      const campCompletedQuestIds = await campQuestRuntime.getCompletedQuestIds(playerId);
      const completedQuestIds = [...npcCompletedQuestIds, ...campCompletedQuestIds];
      const campQuests = generateCampQuestOffers({
        playerId,
        logicalIndex: input.logicalIndex,
        worldPois: input.worldPois ?? [],
        discoveredPoiIds: worldDiscoveryService.getDiscoveredPoiIds(playerId),
        completedQuestIds,
      });
      return [...npcQuests, ...campQuests].sort((a, b) => a.questId.localeCompare(b.questId));
    },
    getCompletedQuestIds: async (playerId: string) => {
      const npcCompletedQuestIds = npcQuestService.getCompletedQuestIds(playerId);
      const campCompletedQuestIds = await campQuestRuntime.getCompletedQuestIds(playerId);
      return [...new Set([...npcCompletedQuestIds, ...campCompletedQuestIds])].sort();
    },
    getNpcDialogues: (playerId: string) => [npcQuestService.getNpcDialogue(playerId, "village_trader_001")],
    getNpcReputations: (playerId: string) => npcQuestService.getAllNpcReputations(playerId),
    getNpcMemories: async (playerId: string) => {
      const snapshots = await npcMemoryService.getAllMemorySnapshots(playerId);
      return snapshots.map((snapshot): LiveGameplayNpcMemory => ({
        npcId: snapshot.npcId,
        playerId: snapshot.playerId,
        reputation: snapshot.reputation,
        trustTier: snapshot.trustTier,
        memoryEventCount: snapshot.memoryEventCount,
        recentMemoryNotes: snapshot.recentMemoryNotes,
        knownRumorCount: snapshot.knownRumorCount,
      }));
    },
    getNpcRumors: async (playerId: string) => {
      const rumors = await npcRumorService.getRumorSnapshots(playerId);
      return rumors.map((rumor): LiveGameplayNpcRumor => ({
        rumorId: rumor.rumorId,
        npcId: rumor.npcId,
        playerId: rumor.playerId,
        kind: rumor.kind,
        weight: rumor.weight,
        note: rumor.note,
        sourceNpcId: rumor.sourceNpcId,
      }));
    },
  });

  const baseSnapshot = await composer.compose(input.playerId, input.logicalIndex);
  const currentTick = input.logicalIndex;
  const discoveredPoiIds = worldDiscoveryService.getDiscoveredPoiIds(input.playerId);
  const worldPois = input.worldPois ?? [];
  const discoveredCamps = worldPois.filter(
    (poi) => discoveredPoiIds.includes(poi.poiId) && isGatheringCampPoi(poi.type),
  );
  const campPois: WorldPoiSnapshot[] = discoveredCamps.map((poi) => ({
    id: poi.poiId,
    type: poi.type as any,
    title: poi.title,
    position: { x: poi.x, y: poi.y },
    chunk: { x: poi.chunkX, z: poi.chunkZ },
    interactionRadius: 32,
    tags: [],
  }));

  await campStockRuntime.hydratePois(campPois.map((poi) => poi.id));
  const campNpcs = campNpcService.generateCampNpcs(campPois, currentTick);
  const campStocks = campNpcService.getCampStockSnapshots(campPois, currentTick);

  return Object.freeze({
    ...baseSnapshot,
    campNpcs: Object.freeze(campNpcs),
    campStocks: Object.freeze(campStocks),
  });
}

function isGatheringCampPoi(poiType: string): boolean {
  return poiType === "logging_camp" || poiType === "mining_camp" || poiType === "fishing_camp";
}
