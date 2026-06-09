import { LiveGameplaySnapshotComposer, buildVendorEconomySnapshot, createEmptyVendorEconomySnapshot } from "./LiveGameplaySnapshotComposer.js";
import type { LiveGameplaySnapshot, DiscoveryStats, RecentDiscovery, LiveGameplayCampNpc, LiveGameplayCampStock } from "./LiveGameplaySnapshotTypes.js";
import { toLiveEquipmentSlots } from "./adapters/EquipmentSnapshotAdapter.js";
import { toLiveInventoryItems } from "./adapters/InventorySnapshotAdapter.js";
import { getWalletService, getVendorStockService } from "../economy/economyRuntime.js";
import { getVillageResourceVendor } from "../economy/VillageVendors.js";
import { campNpcService } from "../npc/CampNpcService.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import { createDefaultStatBlock, statKeyToPropertyName, isEquipmentStatKey, capStatValue } from "../equipment/EquipmentStatTypes.js";
import type { EquipmentStatBlock } from "../equipment/EquipmentStatTypes.js";
import { getStarterProcessingStations } from "../crafting/ProcessingStations.js";
import { npcQuestService } from "../quests/NpcQuestService.js";

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
    getSkillStates: () => input.skills.map((skill) => ({
      skillId: String(skill.skillId ?? skill.id ?? "unknown_skill"),
      xp: Math.max(0, Math.floor(Number(skill.xp ?? 0))),
      level: Math.max(1, Math.floor(Number(skill.level ?? 1))),
    })),
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
    getVendorEconomy: async () => {
      try {
        const vendorStockService = await getVendorStockService();
        const stockEntries = await vendorStockService.getStockEntries(vendor.id);
        return buildVendorEconomySnapshot(vendor.id, vendor.name, stockEntries);
      } catch {
        return createEmptyVendorEconomySnapshot();
      }
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

      // Aggregate stats from equipped items (deterministic: sorted by slotId)
      const aggregated: Record<string, number> = {};
      const sortedSlots = [...eq.slots].sort((a, b) =>
        String(a.slotId ?? "").localeCompare(String(b.slotId ?? "")),
      );

      for (const slot of sortedSlots) {
        if (!slot.itemId) continue;
        // Known gathering tool tier bonuses (deterministic, no Math.random)
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

      // Build capped stat block
      const result = createDefaultStatBlock();
      const capped: EquipmentStatBlock = { ...result };
      for (const [key, value] of Object.entries(aggregated)) {
        if (isEquipmentStatKey(key)) {
          const propName = statKeyToPropertyName(key);
          (capped as any)[propName] = capStatValue(key, value);
        }
      }
      return Object.freeze(capped);
    },
    getProcessingStations: () => {
      const stations = getStarterProcessingStations();
      return stations.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        x: s.position.x,
        y: s.position.y,
        interactionRadius: s.interactionRadius,
      }));
    },
    // NPC Quest system integration
    getActiveQuests: (playerId: string) => {
      const activeQuests = npcQuestService.getActiveQuests(playerId);
      return activeQuests.map((q) => ({
        questId: q.questId,
        state: q.state,
        objectives: q.objectives.map((obj) => ({
          objectiveId: obj.objectiveId,
          title: obj.title,
          current: obj.current,
          required: obj.required,
          completed: obj.completed,
        })),
      }));
    },
    getAvailableQuests: (playerId: string) => {
      const availableQuests = npcQuestService.getAvailableQuests(playerId);
      return availableQuests.map((q) => ({
        questId: q.questId,
        state: q.state,
        objectives: q.objectives.map((obj) => ({
          objectiveId: obj.objectiveId,
          title: obj.title,
          current: obj.current,
          required: obj.required,
          completed: obj.completed,
        })),
      }));
    },
    getCompletedQuestIds: (playerId: string) => {
      // Use public NPC dialogue method to get completed quest IDs
      const dialogue = npcQuestService.getNpcDialogue(playerId, "village_trader_001");
      return [...dialogue.completedQuestIds];
    },
    getNpcDialogues: (playerId: string) => {
      // Return dialogues for all known NPCs (village_trader_001)
      const npcIds = ["village_trader_001"];
      return npcIds.map((npcId) => npcQuestService.getNpcDialogue(playerId, npcId));
    },
    getNpcReputations: (playerId: string) => {
      return npcQuestService.getAllNpcReputations(playerId);
    },
  });

  const baseSnapshot = await composer.compose(input.playerId, input.logicalIndex);

  // Get camp NPCs and stocks for discovered gathering camp POIs
  const currentTick = input.logicalIndex;
  const discoveredPoiIds = worldDiscoveryService.getDiscoveredPoiIds(input.playerId);
  
  // Filter worldPois to only discovered gathering camps
  const worldPois = input.worldPois ?? [];
  const discoveredCamps = worldPois.filter(
    (poi) => discoveredPoiIds.includes(poi.poiId) && isGatheringCampPoi(poi.type)
  );

  // Convert to WorldPoiSnapshot format for camp NPC service
  const campPois: WorldPoiSnapshot[] = discoveredCamps.map((poi) => ({
    id: poi.poiId,
    type: poi.type as any,
    title: poi.title,
    position: { x: poi.x, y: poi.y },
    chunk: { x: poi.chunkX, z: poi.chunkZ },
    interactionRadius: 32,
    tags: [],
  }));

  // Update camp stock
  campNpcService.updateCampStock(campPois, currentTick);

  // Generate camp NPCs
  const campNpcs = campNpcService.generateCampNpcs(campPois, currentTick);

  // Get camp stocks
  const campStocks = campNpcService.getCampStockSnapshots(campPois, currentTick);

  // Return snapshot with camp NPCs and stocks
  return Object.freeze({
    ...baseSnapshot,
    campNpcs: Object.freeze(campNpcs),
    campStocks: Object.freeze(campStocks),
  });
}

/**
 * Check if a POI type is a gathering camp.
 */
function isGatheringCampPoi(poiType: string): boolean {
  return poiType === "logging_camp" || poiType === "mining_camp" || poiType === "fishing_camp";
}
