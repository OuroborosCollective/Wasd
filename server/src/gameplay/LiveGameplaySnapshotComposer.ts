/**
 * LIVE GAMEPLAY SNAPSHOT COMPOSER
 *
 * Deterministic, server-authoritative composition of gameplay snapshots.
 * Collects data from stores/services and produces stable snapshot output.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - All arrays sorted deterministically
 * - No mutation of source data
 */

import type {
  LiveGameplaySnapshot,
  LiveGameplayInventoryItem,
  LiveGameplayEquipmentSlot,
  LiveGameplaySkillState,
  LiveGameplayResourceNode,
  LiveGameplayWorldPoi,
  LiveGameplayVendorEconomySnapshot,
  LiveGameplayProcessingStation,
  DiscoveryStats,
  RecentDiscovery,
  LiveGameplayCampNpc,
  LiveGameplayCampStock,
  LiveGameplayQuestProgress,
  LiveGameplayNpcDialogue,
  LiveGameplayNpcReputation,
  LiveGameplayNpcMemory,
  LiveGameplayNpcRumor,
  LiveGameplayWorldSurface,
  LiveGameplayCivicState,
  LiveGameplayCivicPressure,
} from "./LiveGameplaySnapshotTypes.js";
import { EMPTY_LIVE_GAMEPLAY_WORLD_SURFACE } from "./LiveGameplaySnapshotTypes.js";
import { RESOURCE_SELL_PRICES } from "../economy/ResourceSellPrices.js";
import { calculateDynamicPrice } from "../economy/DemandPricing.js";
import { createDefaultStatBlock } from "../equipment/EquipmentStatTypes.js";

export interface LiveGameplaySnapshotComposerDeps {
  readonly getInventoryItems: (playerId: string) => readonly LiveGameplayInventoryItem[] | Promise<readonly LiveGameplayInventoryItem[]>;
  readonly getEquipmentSlots: (playerId: string) => readonly LiveGameplayEquipmentSlot[] | Promise<readonly LiveGameplayEquipmentSlot[]>;
  readonly getSkillStates: (playerId: string) => readonly LiveGameplaySkillState[] | Promise<readonly LiveGameplaySkillState[]>;
  readonly getResourceNodes: (playerId: string) => readonly LiveGameplayResourceNode[] | Promise<readonly LiveGameplayResourceNode[]>;
  readonly getWallet: (playerId: string) => { readonly coin: number } | Promise<{ readonly coin: number }>;
  readonly getWorldPois?: (playerId: string) => readonly LiveGameplayWorldPoi[] | Promise<readonly LiveGameplayWorldPoi[]>;
  readonly getVendorEconomy?: (playerId: string) => LiveGameplayVendorEconomySnapshot | Promise<LiveGameplayVendorEconomySnapshot>;
  readonly getDiscoveryStats?: (playerId: string) => DiscoveryStats | Promise<DiscoveryStats>;
  readonly getRecentDiscoveries?: (playerId: string) => readonly RecentDiscovery[] | Promise<readonly RecentDiscovery[]>;
  readonly getCampNpcs?: () => readonly LiveGameplayCampNpc[] | Promise<readonly LiveGameplayCampNpc[]>;
  readonly getCampStocks?: () => readonly LiveGameplayCampStock[] | Promise<readonly LiveGameplayCampStock[]>;
  readonly getEquipmentStats?: (playerId: string) => import("../equipment/EquipmentStatTypes.js").EquipmentStatBlock | Promise<import("../equipment/EquipmentStatTypes.js").EquipmentStatBlock>;
  readonly getProcessingStations?: () => readonly LiveGameplayProcessingStation[] | Promise<readonly LiveGameplayProcessingStation[]>;
  readonly getActiveQuests?: (playerId: string) => readonly LiveGameplayQuestProgress[] | Promise<readonly LiveGameplayQuestProgress[]>;
  readonly getAvailableQuests?: (playerId: string) => readonly LiveGameplayQuestProgress[] | Promise<readonly LiveGameplayQuestProgress[]>;
  readonly getCompletedQuestIds?: (playerId: string) => readonly string[] | Promise<readonly string[]>;
  readonly getNpcDialogues?: (playerId: string) => readonly LiveGameplayNpcDialogue[] | Promise<readonly LiveGameplayNpcDialogue[]>;
  readonly getNpcReputations?: (playerId: string) => readonly LiveGameplayNpcReputation[] | Promise<readonly LiveGameplayNpcReputation[]>;
  readonly getNpcMemories?: (playerId: string) => readonly LiveGameplayNpcMemory[] | Promise<readonly LiveGameplayNpcMemory[]>;
  readonly getNpcRumors?: (playerId: string) => readonly LiveGameplayNpcRumor[] | Promise<readonly LiveGameplayNpcRumor[]>;
  readonly getWorldSurface?: (playerId: string, logicalIndex: number) => LiveGameplayWorldSurface | Promise<LiveGameplayWorldSurface>;
}

export class LiveGameplaySnapshotComposer {
  public constructor(private readonly deps: LiveGameplaySnapshotComposerDeps) {}

  public async compose(playerId: string, logicalIndex: number): Promise<LiveGameplaySnapshot> {
    const [inventory, equipment, skills, resourceNodes] = await Promise.all([
      this.deps.getInventoryItems(playerId),
      this.deps.getEquipmentSlots(playerId),
      this.deps.getSkillStates(playerId),
      this.deps.getResourceNodes(playerId),
    ]);

    const wallet = await this.deps.getWallet(playerId);
    const safeLogicalIndex = this.safeIndex(logicalIndex);

    const worldPois = this.deps.getWorldPois
      ? await this.deps.getWorldPois(playerId)
      : [];

    const vendorEconomy = this.deps.getVendorEconomy
      ? await this.deps.getVendorEconomy(playerId)
      : { vendors: [] };

    const discoveryStats = this.deps.getDiscoveryStats
      ? await this.deps.getDiscoveryStats(playerId)
      : { discoveredPoiCount: 0, discoveredChunkCount: 0, visiblePoiCount: 0 };

    const recentDiscoveries = this.deps.getRecentDiscoveries
      ? await this.deps.getRecentDiscoveries(playerId)
      : [];

    const campNpcs = this.deps.getCampNpcs
      ? await this.deps.getCampNpcs()
      : [];
    const campStocks = this.deps.getCampStocks
      ? await this.deps.getCampStocks()
      : [];

    const equipmentStats = this.deps.getEquipmentStats
      ? await this.deps.getEquipmentStats(playerId)
      : createDefaultStatBlock();

    const processingStations = this.deps.getProcessingStations
      ? await this.deps.getProcessingStations()
      : [];

    const activeQuests = this.deps.getActiveQuests
      ? await this.deps.getActiveQuests(playerId)
      : [];
    const availableQuests = this.deps.getAvailableQuests
      ? await this.deps.getAvailableQuests(playerId)
      : [];
    const completedQuestIds = this.deps.getCompletedQuestIds
      ? await this.deps.getCompletedQuestIds(playerId)
      : [];
    const npcDialogues = this.deps.getNpcDialogues
      ? await this.deps.getNpcDialogues(playerId)
      : [];
    const npcReputations = this.deps.getNpcReputations
      ? await this.deps.getNpcReputations(playerId)
      : [];
    const npcMemories = this.deps.getNpcMemories
      ? await this.deps.getNpcMemories(playerId)
      : [];
    const npcRumors = this.deps.getNpcRumors
      ? await this.deps.getNpcRumors(playerId)
      : [];
    const worldSurface = this.deps.getWorldSurface
      ? await this.deps.getWorldSurface(playerId, safeLogicalIndex)
      : EMPTY_LIVE_GAMEPLAY_WORLD_SURFACE;
    const civicState = buildCivicStateFromWorldSurface(safeLogicalIndex, worldSurface);

    return Object.freeze({
      schemaVersion: "live-gameplay-snapshot.v1" as const,
      playerId,
      logicalIndex: safeLogicalIndex,
      tickRateHz: 10 as const,
      tickMs: 100 as const,
      inventory: Object.freeze([...inventory].sort((a, b) => a.itemId.localeCompare(b.itemId))),
      equipment: Object.freeze([...equipment].sort((a, b) => a.slot.localeCompare(b.slot))),
      skills: Object.freeze([...skills].sort((a, b) => a.skillId.localeCompare(b.skillId))),
      resourceNodes: Object.freeze([...resourceNodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId))),
      wallet: Object.freeze(wallet),
      worldPois: Object.freeze([...worldPois].sort((a, b) => a.poiId.localeCompare(b.poiId))),
      vendorEconomy: Object.freeze(vendorEconomy),
      discoveryStats: Object.freeze(discoveryStats),
      recentDiscoveries: Object.freeze([...recentDiscoveries]),
      campNpcs: Object.freeze([...campNpcs].sort((a, b) => a.id.localeCompare(b.id))),
      campStocks: Object.freeze([...campStocks].sort((a, b) => a.poiId.localeCompare(b.poiId))),
      equipmentStats,
      processingStations: Object.freeze([...processingStations].sort((a, b) => a.id.localeCompare(b.id))),
      activeQuests: Object.freeze([...activeQuests].sort((a, b) => a.questId.localeCompare(b.questId))),
      availableQuests: Object.freeze([...availableQuests].sort((a, b) => a.questId.localeCompare(b.questId))),
      completedQuestIds: Object.freeze([...completedQuestIds].sort()),
      npcDialogues: Object.freeze([...npcDialogues].sort((a, b) => a.npcId.localeCompare(b.npcId))),
      npcReputations: Object.freeze([...npcReputations].sort((a, b) => a.npcId.localeCompare(b.npcId))),
      npcMemories: Object.freeze([...npcMemories].sort((a, b) => a.npcId.localeCompare(b.npcId))),
      npcRumors: Object.freeze([...npcRumors].sort((a, b) => a.rumorId.localeCompare(b.rumorId))),
      worldSurface: Object.freeze(worldSurface),
      civicState: Object.freeze(civicState),
    });
  }

  private safeIndex(value: number): number {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
}

export function createEmptyVendorEconomySnapshot(): LiveGameplayVendorEconomySnapshot {
  return Object.freeze({
    vendors: Object.freeze([]),
  });
}

export function buildVendorEconomySnapshot(
  vendorId: string,
  vendorName: string,
  stockEntries: ReadonlyArray<{ itemId: string; quantity: number }>,
): LiveGameplayVendorEconomySnapshot {
  const sellableItemIds = Object.keys(RESOURCE_SELL_PRICES);

  const stock = stockEntries
    .filter((entry) => entry.quantity > 0)
    .map((entry) => ({
      itemId: entry.itemId,
      quantity: entry.quantity,
    }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId));

  const prices = sellableItemIds
    .map((itemId) => {
      const currentStock = stockEntries.find((e) => e.itemId === itemId)?.quantity ?? 0;
      const priceInfo = calculateDynamicPrice(itemId, currentStock);
      return {
        itemId,
        unitPrice: priceInfo.unitPrice,
        basePrice: priceInfo.basePrice,
        demandBand: priceInfo.demandBand,
      };
    })
    .sort((a, b) => a.itemId.localeCompare(b.itemId));

  return Object.freeze({
    vendors: Object.freeze([
      Object.freeze({
        id: vendorId,
        name: vendorName,
        stock: Object.freeze(stock),
        prices: Object.freeze(prices),
      }),
    ]),
  });
}

type SurfaceEntry = Record<string, unknown>;

function isSurfaceEntry(value: unknown): value is SurfaceEntry {
  return typeof value === "object" && value !== null;
}

function textField(entry: SurfaceEntry, key: string): string {
  const value = entry[key];
  return typeof value === "string" ? value : "";
}

function surfaceIdentity(entry: unknown, fallback: string): string {
  if (!isSurfaceEntry(entry)) return fallback;
  return textField(entry, "id") || textField(entry, "houseId") || textField(entry, "npcId") || textField(entry, "lineageId") || fallback;
}

function surfaceKind(entry: unknown): string {
  if (!isSurfaceEntry(entry)) return "";
  return textField(entry, "kind") || textField(entry, "type") || textField(entry, "role");
}

function isHouseGroup(entry: unknown): boolean {
  const key = `${surfaceIdentity(entry, "")}:${surfaceKind(entry)}`.toLowerCase();
  return key.includes("house") || key.includes("settlement") || key.includes("home");
}

function isPopulationPoint(entry: unknown): boolean {
  const key = `${surfaceIdentity(entry, "")}:${surfaceKind(entry)}`.toLowerCase();
  return key.includes("npc") || key.includes("lineage") || key.includes("citizen") || key.includes("resident");
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function pressureFor(population: number, capacity: number, occupancyPermille: number): LiveGameplayCivicPressure {
  if (population <= 0 || capacity <= 0) return "empty";
  if (occupancyPermille > 1000) return "over_capacity";
  if (occupancyPermille >= 750) return "crowded";
  return "settled";
}

export function buildCivicStateFromWorldSurface(
  logicalIndex: number,
  worldSurface: LiveGameplayWorldSurface,
): LiveGameplayCivicState {
  const tick = Number.isSafeInteger(logicalIndex) && logicalIndex >= 0 ? logicalIndex : 0;
  const groups = [...(worldSurface.groups ?? [])];
  const points = [...(worldSurface.points ?? [])];
  const houseKeys = groups
    .filter(isHouseGroup)
    .map((entry, index) => surfaceIdentity(entry, `house:${index}`))
    .sort();
  const populationKeys = points
    .filter(isPopulationPoint)
    .map((entry, index) => surfaceIdentity(entry, `population:${index}`))
    .sort();

  const houseCount = houseKeys.length;
  const population = populationKeys.length;
  const capacity = houseCount * 4;
  const occupancyPermille = capacity > 0 ? Math.floor((population * 1000) / capacity) : 0;
  const pressure = pressureFor(population, capacity, occupancyPermille);
  const civicHash = `civic:${fnv1a32(`${tick}|${houseKeys.join(",")}|${populationKeys.join(",")}`)}`;

  return Object.freeze({
    schemaVersion: "civic-state.v1" as const,
    tick,
    houseCount,
    population,
    capacity,
    occupancyPermille,
    pressure,
    civicHash,
  });
}
