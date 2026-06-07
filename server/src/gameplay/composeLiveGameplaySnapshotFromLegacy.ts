import { LiveGameplaySnapshotComposer, buildVendorEconomySnapshot, createEmptyVendorEconomySnapshot } from "./LiveGameplaySnapshotComposer.js";
import type { LiveGameplaySnapshot, DiscoveryStats, RecentDiscovery } from "./LiveGameplaySnapshotTypes.js";
import { toLiveEquipmentSlots } from "./adapters/EquipmentSnapshotAdapter.js";
import { toLiveInventoryItems } from "./adapters/InventorySnapshotAdapter.js";
import { getWalletService, getVendorStockService } from "../economy/economyRuntime.js";
import { getVillageResourceVendor } from "../economy/VillageVendors.js";

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
  });

  return composer.compose(input.playerId, input.logicalIndex);
}
