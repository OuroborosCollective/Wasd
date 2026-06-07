/**
 * ECONOMY SERVICE
 *
 * Server-authoritative economy operations for resource selling.
 * Deterministic: No Math.random(), no Date.now(), stable ordering.
 * Fail-close: failed operations do not mutate state.
 */

import { InventoryService } from "../inventory/InventoryService.js";
import { WalletService } from "./WalletService.js";
import { VendorStockService } from "./VendorStockService.js";
import { isSellable } from "./ResourceSellPrices.js";
import { calculateDynamicPrice } from "./DemandPricing.js";
import {
  getVillageResourceVendor,
  checkVendorProximity,
  type VendorDefinition,
} from "./VillageVendors.js";
import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import type { DemandBand } from "./VendorStockTypes.js";

export interface SellResourceInput {
  playerId: string;
  itemId: InventoryItemId | string;
  quantity: number;
  playerPosition?: { x: number; y: number };
  vendorId?: string;
}

export interface SellResourceResult {
  ok: boolean;
  itemId: string;
  quantitySold: number;
  unitPrice: number;
  basePrice: number;
  totalCoins: number;
  newBalance: number;
  stockBefore: number;
  stockAfter: number;
  demandBand: DemandBand;
  reason?:
    | "sold"
    | "invalid_player"
    | "invalid_item"
    | "invalid_quantity"
    | "not_sellable"
    | "insufficient_quantity"
    | "missing_player_position"
    | "invalid_player_position"
    | "vendor_too_far"
    | "missing_vendor"
    | "invalid_vendor";
}

export interface SellAllResourcesInput {
  playerId: string;
  playerPosition?: { x: number; y: number };
  vendorId?: string;
}

export interface SellAllResourcesResult {
  ok: boolean;
  sold: Array<{
    itemId: string;
    quantitySold: number;
    unitPrice: number;
    basePrice: number;
    totalCoins: number;
    stockBefore: number;
    stockAfter: number;
    demandBand: DemandBand;
  }>;
  totalCoins: number;
  newBalance: number;
  reason?:
    | "sold"
    | "nothing_to_sell"
    | "invalid_player"
    | "missing_player_position"
    | "invalid_player_position"
    | "vendor_too_far"
    | "missing_vendor"
    | "invalid_vendor";
}

export class EconomyService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly walletService: WalletService,
    private readonly vendorStockService: VendorStockService,
  ) {}

  async sellResource(input: SellResourceInput): Promise<SellResourceResult> {
    // Validate player
    if (!input.playerId || input.playerId === "anonymous") {
      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: 0,
        basePrice: 0,
        totalCoins: 0,
        newBalance: 0,
        stockBefore: 0,
        stockAfter: 0,
        demandBand: "normal",
        reason: "invalid_player",
      };
    }

    // Validate quantity
    const quantity = Math.floor(Number(input.quantity));
    if (quantity <= 0 || !Number.isFinite(quantity)) {
      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: 0,
        basePrice: 0,
        totalCoins: 0,
        newBalance: 0,
        stockBefore: 0,
        stockAfter: 0,
        demandBand: "normal",
        reason: "invalid_quantity",
      };
    }

    // Check if item is sellable
    if (!isSellable(input.itemId)) {
      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: 0,
        basePrice: 0,
        totalCoins: 0,
        newBalance: 0,
        stockBefore: 0,
        stockAfter: 0,
        demandBand: "normal",
        reason: "not_sellable",
      };
    }

    // Check if player has enough
    const inventory = await this.inventoryService.getPlayerInventory(input.playerId);
    const slot = inventory.slots.find((s) => s.itemId === input.itemId);

    if (!slot || slot.quantity < quantity) {
      // Get current price info even for failure
      const vendorId = input.vendorId ?? "village_trader_001";
      const currentStock = await this.vendorStockService.getItemQuantity(vendorId, input.itemId);
      const priceInfo = calculateDynamicPrice(input.itemId, currentStock);

      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: priceInfo.unitPrice,
        basePrice: priceInfo.basePrice,
        totalCoins: 0,
        newBalance: 0,
        stockBefore: currentStock,
        stockAfter: currentStock,
        demandBand: priceInfo.demandBand,
        reason: "insufficient_quantity",
      };
    }

    // Validate vendor proximity
    const vendorProximityResult = this.validateVendorProximity(input);
    if (!vendorProximityResult.valid) {
      const failureReason = vendorProximityResult.reason ?? "vendor_too_far";
      const vendorId = input.vendorId ?? "village_trader_001";
      const currentStock = await this.vendorStockService.getItemQuantity(vendorId, input.itemId);
      const priceInfo = calculateDynamicPrice(input.itemId, currentStock);

      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: priceInfo.unitPrice,
        basePrice: priceInfo.basePrice,
        totalCoins: 0,
        newBalance: 0,
        stockBefore: currentStock,
        stockAfter: currentStock,
        demandBand: priceInfo.demandBand,
        reason: failureReason,
      };
    }

    // All validations passed - perform the transaction
    // Get dynamic price based on current vendor stock
    const vendorId = input.vendorId ?? "village_trader_001";
    const stockBefore = await this.vendorStockService.getItemQuantity(vendorId, input.itemId);
    const priceInfo = calculateDynamicPrice(input.itemId, stockBefore);

    // Remove items from inventory
    const removeResult = await this.inventoryService.removeItem({
      playerId: input.playerId,
      itemId: input.itemId,
      quantity,
    });

    if (!removeResult.ok) {
      // Should not happen if we checked correctly, but fail-safe
      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: priceInfo.unitPrice,
        basePrice: priceInfo.basePrice,
        totalCoins: 0,
        newBalance: 0,
        stockBefore,
        stockAfter: stockBefore,
        demandBand: priceInfo.demandBand,
        reason: "insufficient_quantity",
      };
    }

    // Add coins to wallet
    const totalCoins = quantity * priceInfo.unitPrice;
    const updatedWallet = await this.walletService.addCoins({
      playerId: input.playerId,
      amount: totalCoins,
    });

    // Update vendor stock
    const stockAfter = await this.vendorStockService.addItems(vendorId, input.itemId, quantity);

    return {
      ok: true,
      itemId: String(input.itemId),
      quantitySold: quantity,
      unitPrice: priceInfo.unitPrice,
      basePrice: priceInfo.basePrice,
      totalCoins,
      newBalance: updatedWallet.balances.coin,
      stockBefore,
      stockAfter: stockAfter.items[input.itemId] ?? stockBefore + quantity,
      demandBand: priceInfo.demandBand,
      reason: "sold",
    };
  }

  async sellAllResources(input: SellAllResourcesInput): Promise<SellAllResourcesResult> {
    // Validate player
    if (!input.playerId || input.playerId === "anonymous") {
      return {
        ok: false,
        sold: [],
        totalCoins: 0,
        newBalance: 0,
        reason: "invalid_player",
      };
    }

    // Get inventory
    const inventory = await this.inventoryService.getPlayerInventory(input.playerId);

    // Find all sellable resource slots
    const sellableSlots = inventory.slots.filter((slot) => isSellable(slot.itemId));

    if (sellableSlots.length === 0) {
      return {
        ok: false,
        sold: [],
        totalCoins: 0,
        newBalance: 0,
        reason: "nothing_to_sell",
      };
    }

    // Validate vendor proximity
    const vendorProximityResult = this.validateVendorProximity(input);
    if (!vendorProximityResult.valid) {
      const failureReason = vendorProximityResult.reason ?? "vendor_too_far";
      return {
        ok: false,
        sold: [],
        totalCoins: 0,
        newBalance: 0,
        reason: failureReason,
      };
    }

    const vendorId = input.vendorId ?? "village_trader_001";

    // Calculate what can be sold with dynamic prices
    // Sort by itemId for deterministic ordering
    const sortedSlots = [...sellableSlots].sort((a, b) => a.itemId.localeCompare(b.itemId));

    const sellOps: Array<{
      itemId: string;
      quantity: number;
      unitPrice: number;
      basePrice: number;
      totalCoins: number;
      stockBefore: number;
      stockAfter: number;
      demandBand: DemandBand;
    }> = [];

    let totalCoins = 0;

    for (const slot of sortedSlots) {
      // Get current stock at the moment of this item
      const stockBefore = await this.vendorStockService.getItemQuantity(vendorId, slot.itemId);
      const priceInfo = calculateDynamicPrice(slot.itemId, stockBefore);

      const slotTotal = slot.quantity * priceInfo.unitPrice;
      totalCoins += slotTotal;
      sellOps.push({
        itemId: slot.itemId,
        quantity: slot.quantity,
        unitPrice: priceInfo.unitPrice,
        basePrice: priceInfo.basePrice,
        totalCoins: slotTotal,
        stockBefore,
        stockAfter: stockBefore + slot.quantity, // Predicted after add
        demandBand: priceInfo.demandBand,
      });
    }

    if (sellOps.length === 0) {
      return {
        ok: false,
        sold: [],
        totalCoins: 0,
        newBalance: 0,
        reason: "nothing_to_sell",
      };
    }

    // Remove all items and add coins in a transaction
    for (const op of sellOps) {
      await this.inventoryService.removeItem({
        playerId: input.playerId,
        itemId: op.itemId,
        quantity: op.quantity,
      });
    }

    const updatedWallet = await this.walletService.addCoins({
      playerId: input.playerId,
      amount: totalCoins,
    });

    // Update vendor stock for each item
    for (const op of sellOps) {
      await this.vendorStockService.addItems(vendorId, op.itemId, op.quantity);
    }

    return {
      ok: true,
      sold: sellOps.map((op) => ({
        itemId: op.itemId,
        quantitySold: op.quantity,
        unitPrice: op.unitPrice,
        basePrice: op.basePrice,
        totalCoins: op.totalCoins,
        stockBefore: op.stockBefore,
        stockAfter: op.stockAfter,
        demandBand: op.demandBand,
      })),
      totalCoins,
      newBalance: updatedWallet.balances.coin,
      reason: "sold",
    };
  }

  /**
   * Validate that player is near a valid vendor.
   * Returns { valid: true } if vendor is valid and player is in range.
   * Returns { valid: false, reason: string } with failure reason.
   */
  private validateVendorProximity(input: {
    playerPosition?: { x: number; y: number };
    vendorId?: string;
  }): {
    valid: boolean;
    reason?:
      | "missing_vendor"
      | "invalid_vendor"
      | "missing_player_position"
      | "invalid_player_position"
      | "vendor_too_far";
  } {
    // Default vendor is the village trader
    const vendorId = input.vendorId ?? "village_trader_001";

    // Check if vendor exists
    const vendor = getVillageResourceVendor();
    if (vendor.id !== vendorId) {
      return { valid: false, reason: "invalid_vendor" };
    }

    // Player position is required for selling
    if (!input.playerPosition) {
      return { valid: false, reason: "missing_player_position" };
    }

    // Validate player position is finite
    const pos = input.playerPosition;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      return { valid: false, reason: "invalid_player_position" };
    }

    // Check proximity
    const proximity = checkVendorProximity(pos, vendor);
    if (!proximity.withinRange) {
      return { valid: false, reason: "vendor_too_far" };
    }

    return { valid: true };
  }
}