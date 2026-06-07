/**
 * ECONOMY SERVICE
 *
 * Server-authoritative economy operations for resource selling.
 * Deterministic: No Math.random(), no Date.now(), stable ordering.
 * Fail-close: failed operations do not mutate state.
 */

import { InventoryService } from "../inventory/InventoryService.js";
import { WalletService } from "./WalletService.js";
import { getSellPrice, isSellable } from "./ResourceSellPrices.js";
import type { InventoryItemId } from "../inventory/InventoryTypes.js";

export interface SellResourceInput {
  playerId: string;
  itemId: InventoryItemId | string;
  quantity: number;
}

export interface SellResourceResult {
  ok: boolean;
  itemId: string;
  quantitySold: number;
  unitPrice: number;
  totalCoins: number;
  newBalance: number;
  reason?:
    | "sold"
    | "invalid_player"
    | "invalid_item"
    | "invalid_quantity"
    | "not_sellable"
    | "insufficient_quantity";
}

export interface SellAllResourcesInput {
  playerId: string;
}

export interface SellAllResourcesResult {
  ok: boolean;
  sold: Array<{
    itemId: string;
    quantitySold: number;
    unitPrice: number;
    totalCoins: number;
  }>;
  totalCoins: number;
  newBalance: number;
  reason?: "sold" | "nothing_to_sell" | "invalid_player";
}

export class EconomyService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly walletService: WalletService,
  ) {}

  async sellResource(input: SellResourceInput): Promise<SellResourceResult> {
    // Validate player
    if (!input.playerId || input.playerId === "anonymous") {
      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: 0,
        totalCoins: 0,
        newBalance: 0,
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
        totalCoins: 0,
        newBalance: 0,
        reason: "invalid_quantity",
      };
    }

    // Check if item is sellable
    const priceResult = getSellPrice(input.itemId);
    if (!priceResult.sellable) {
      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: 0,
        totalCoins: 0,
        newBalance: 0,
        reason: "not_sellable",
      };
    }

    // Check if player has enough
    const inventory = await this.inventoryService.getPlayerInventory(input.playerId);
    const slot = inventory.slots.find((s) => s.itemId === input.itemId);

    if (!slot || slot.quantity < quantity) {
      return {
        ok: false,
        itemId: String(input.itemId),
        quantitySold: 0,
        unitPrice: priceResult.price,
        totalCoins: 0,
        newBalance: 0,
        reason: "insufficient_quantity",
      };
    }

    // All validations passed - perform the transaction
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
        unitPrice: priceResult.price,
        totalCoins: 0,
        newBalance: 0,
        reason: "insufficient_quantity",
      };
    }

    // Add coins to wallet
    const totalCoins = quantity * priceResult.price;
    const updatedWallet = await this.walletService.addCoins({
      playerId: input.playerId,
      amount: totalCoins,
    });

    return {
      ok: true,
      itemId: String(input.itemId),
      quantitySold: quantity,
      unitPrice: priceResult.price,
      totalCoins,
      newBalance: updatedWallet.balances.coin,
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

    // Calculate what can be sold
    const sellOps: Array<{
      itemId: string;
      quantity: number;
      price: number;
      totalCoins: number;
    }> = [];

    let totalCoins = 0;

    for (const slot of sellableSlots) {
      const priceResult = getSellPrice(slot.itemId);
      if (!priceResult.sellable) continue;

      const slotTotal = slot.quantity * priceResult.price;
      totalCoins += slotTotal;
      sellOps.push({
        itemId: slot.itemId,
        quantity: slot.quantity,
        price: priceResult.price,
        totalCoins: slotTotal,
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

    return {
      ok: true,
      sold: sellOps.map((op) => ({
        itemId: op.itemId,
        quantitySold: op.quantity,
        unitPrice: op.price,
        totalCoins: op.totalCoins,
      })),
      totalCoins,
      newBalance: updatedWallet.balances.coin,
      reason: "sold",
    };
  }
}