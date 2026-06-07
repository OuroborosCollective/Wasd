/**
 * CAMP NPC SERVICE
 *
 * Server-authoritative camp NPC generation and state management.
 * Deterministic: No Math.random(), no Date.now(), stable ordering.
 *
 * NPC output goes to camp stock, NOT player inventory.
 */

import type {
  CampNpcType,
  CampNpcSnapshot,
  CampNpcActivity,
  CampNpcPosition,
  CampStockSnapshot,
  CampStockEntry,
} from "./CampNpcTypes.js";
import {
  getNpcTypeForPoiType,
  getNpcName,
  getNpcRole,
  getActivityPhase,
  ACTIVITY_MESSAGES,
  CAMP_OUTPUT_ITEM,
  isGatheringCamp,
  NPC_DIALOGUE,
} from "./CampNpcTypes.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import { getCampStockBuyPrice, isCampStockBuyable } from "../economy/CampStockPrices.js";

/**
 * Maximum stock quantity per item in camp stock.
 */
const MAX_STOCK_PER_ITEM = 20;

/**
 * Camp stock state.
 */
interface CampStockState {
  items: Record<string, number>;
  lastProcessedCycle: number;
}

/**
 * Camp NPC Service - generates deterministic camp NPCs and manages camp stock.
 */
export class CampNpcService {
  private campStocks = new Map<string, CampStockState>();

  /**
   * Generate camp NPCs for discovered gathering camp POIs.
   * Returns NPCs sorted by ID for deterministic output.
   */
  generateCampNpcs(
    pois: readonly WorldPoiSnapshot[],
    currentTick: number,
  ): CampNpcSnapshot[] {
    const npcs: CampNpcSnapshot[] = [];

    for (const poi of pois) {
      // Only generate NPCs for gathering camps (not village stations)
      if (!isGatheringCamp(poi.type)) continue;

      const npcType = getNpcTypeForPoiType(poi.type);
      if (!npcType) continue;

      const npcId = this.generateNpcId(poi.id);
      const activity = getActivityPhase(currentTick);

      // Generate deterministic position near the POI
      const position = this.generateNpcPosition(poi, npcType);

      npcs.push({
        id: npcId,
        type: npcType,
        name: getNpcName(npcType),
        role: getNpcRole(npcType),
        poiId: poi.id,
        position,
        state: this.getNpcState(activity),
        activity,
        activityMessage: ACTIVITY_MESSAGES[npcType][activity],
      });
    }

    // Sort by ID for deterministic iteration
    return npcs.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Generate stable NPC ID from POI ID.
   * Format: npc:{poiId}:worker:0
   */
  private generateNpcId(poiId: string): string {
    return `npc:${poiId}:worker:0`;
  }

  /**
   * Generate deterministic NPC position near the POI.
   * Uses small offset based on NPC type for visual variety.
   */
  private generateNpcPosition(
    poi: WorldPoiSnapshot,
    npcType: CampNpcType,
  ): CampNpcPosition {
    // Deterministic offset based on NPC type (small, non-random)
    const offsets: Record<CampNpcType, { dx: number; dy: number }> = {
      camp_woodcutter: { dx: 2, dy: -1 },
      camp_miner: { dx: -1, dy: 2 },
      camp_fisher: { dx: 1, dy: 1 },
    };

    const offset = offsets[npcType];

    return {
      x: poi.position.x + offset.dx * 1000, // Convert to kappa units
      y: poi.position.y + offset.dy * 1000,
    };
  }

  /**
   * Get NPC state from activity.
   */
  private getNpcState(activity: CampNpcActivity): "idle" | "working" | "resting" {
    switch (activity) {
      case "gathering":
      case "returning":
        return "working";
      case "depositing":
        return "idle";
    }
  }

  /**
   * Update camp stock for visible gathering camp POIs.
   * Adds 1 resource per completed deposit phase per camp.
   */
  updateCampStock(
    pois: readonly WorldPoiSnapshot[],
    currentTick: number,
  ): void {
    for (const poi of pois) {
      if (!isGatheringCamp(poi.type)) continue;

      const npcType = getNpcTypeForPoiType(poi.type);
      if (!npcType) continue;

      const currentCycle = Math.floor(currentTick / 40);

      // Get or create camp stock state
      let stockState = this.campStocks.get(poi.id);
      if (!stockState) {
        stockState = {
          items: {},
          lastProcessedCycle: -1, // Initialize to -1 so first cycle is considered "new"
        };
        this.campStocks.set(poi.id, stockState);
      }

      // Check if we've moved to a new cycle and are in depositing phase
      const isDepositing = currentTick % 40 >= 30 && currentTick % 40 < 40;
      const newCycle = currentCycle > stockState.lastProcessedCycle;

      if (newCycle && isDepositing) {
        // Add 1 resource to camp stock
        const outputItem = CAMP_OUTPUT_ITEM[npcType];
        const currentQty = stockState.items[outputItem] ?? 0;
        const newQty = Math.min(currentQty + 1, MAX_STOCK_PER_ITEM);
        stockState.items[outputItem] = newQty;
        stockState.lastProcessedCycle = currentCycle;
      }
    }
  }

  /**
   * Get camp stock snapshots for discovered gathering camp POIs.
   * Includes buyPrice for buyable items.
   */
  getCampStockSnapshots(
    pois: readonly WorldPoiSnapshot[],
    currentTick: number,
  ): CampStockSnapshot[] {
    const snapshots: CampStockSnapshot[] = [];

    for (const poi of pois) {
      if (!isGatheringCamp(poi.type)) continue;

      const stockState = this.campStocks.get(poi.id);
      if (!stockState) {
        // Return empty stock for camps we haven't processed yet
        snapshots.push({
          poiId: poi.id,
          items: [],
          lastUpdatedTick: 0,
        });
        continue;
      }

      // Convert items record to array sorted by itemId, include buyPrice if buyable
      const items: CampStockEntry[] = Object.entries(stockState.items)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, quantity]) => ({
          itemId,
          quantity,
          buyPrice: isCampStockBuyable(itemId) ? getCampStockBuyPrice(itemId) : null,
        }))
        .sort((a, b) => a.itemId.localeCompare(b.itemId));

      snapshots.push({
        poiId: poi.id,
        items,
        lastUpdatedTick: stockState.lastProcessedCycle * 40,
      });
    }

    return snapshots.sort((a, b) => a.poiId.localeCompare(b.poiId));
  }

  /**
   * Buy stock from a camp NPC.
   * Validates all conditions before mutating any state.
   * Returns error string on failure, null on success.
   */
  buyStock(input: {
    poiId: string;
    itemId: string;
    quantity: number;
  }): { ok: true; unitPrice: number; totalCost: number; remainingStock: number } | { ok: false; error: string } {
    const { poiId, itemId, quantity } = input;

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, error: "invalid_quantity" };
    }

    // Check camp stock exists
    const stockState = this.campStocks.get(poiId);
    if (!stockState) {
      return { ok: false, error: "invalid_camp" };
    }

    // Check item is in camp stock
    const currentQty = stockState.items[itemId];
    if (!currentQty || currentQty <= 0) {
      return { ok: false, error: "insufficient_camp_stock" };
    }

    // Check sufficient stock
    if (currentQty < quantity) {
      return { ok: false, error: "insufficient_camp_stock" };
    }

    // Check item is buyable and get price
    const unitPrice = getCampStockBuyPrice(itemId);
    if (unitPrice === null) {
      return { ok: false, error: "invalid_item" };
    }

    const totalCost = unitPrice * quantity;

    // Mutate camp stock
    const newQty = currentQty - quantity;
    if (newQty <= 0) {
      delete stockState.items[itemId];
    } else {
      stockState.items[itemId] = newQty;
    }

    return {
      ok: true,
      unitPrice,
      totalCost,
      remainingStock: newQty,
    };
  }

  /**
   * Get trading dialogue for a camp NPC type.
   */
  getTradingDialogue(npcType: CampNpcType): string {
    return NPC_DIALOGUE[npcType]?.trading ?? "No stock available.";
  }

  /**
   * Get NPC dialogue for a specific NPC ID.
   */
  getNpcDialogue(npcId: string, currentTick: number): { message: string; activity: CampNpcActivity } | null {
    // Parse NPC ID to get POI ID and type
    const match = npcId.match(/^npc:(.+):worker:0$/);
    if (!match) return null;

    // We need to reconstruct the NPC type from the POI type
    // This requires access to the POI, which we don't have here
    // For MVP, we derive from the npcId pattern
    const poiId = match[1];
    const poiTypeMatch = poiId.match(/poi:\d+:\d+:(\w+):0$/);
    if (!poiTypeMatch) return null;

    const poiType = poiTypeMatch[1];
    const npcType = getNpcTypeForPoiType(poiType);
    if (!npcType) return null;

    const activity = getActivityPhase(currentTick);
    const dialogue = this.getDialogueForNpcType(npcType, activity);

    return {
      message: dialogue,
      activity,
    };
  }

  /**
   * Get dialogue based on NPC type and current activity.
   */
  private getDialogueForNpcType(npcType: CampNpcType, activity: CampNpcActivity): string {
    switch (activity) {
      case "gathering":
      case "returning":
        return `${getNpcName(npcType)}: I'm working now.`;
      case "depositing":
        return `${getNpcName(npcType)}: We have some stock at camp.`;
    }
  }

  /**
   * Clear all camp stock state (for testing).
   */
  clearForTests(): void {
    this.campStocks.clear();
  }
}

/**
 * Global camp NPC service instance.
 */
export const campNpcService = new CampNpcService();