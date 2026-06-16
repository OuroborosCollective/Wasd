import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { InventoryService } from "../inventory/InventoryService.js";
import type { InventoryItemId } from "../inventory/InventoryTypes.js";
import { WalletService } from "./WalletService.js";
import { VendorStockService } from "./VendorStockService.js";
import { isSellable } from "./ResourceSellPrices.js";
import { calculateDynamicPrice } from "./DemandPricing.js";
import {
  getVillageResourceVendor,
  checkVendorProximity,
} from "./VillageVendors.js";
import type { DemandBand } from "./VendorStockTypes.js";
import { runtimeHistoryLog, type RuntimeHistoryLog } from "../history/RuntimeHistoryLog.js";

export interface SellResourceInput {
  playerId: string;
  itemId: InventoryItemId | string;
  quantity: number;
  playerPosition?: { x: number; y: number };
  vendorId?: string;
  currentTick?: number;
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
  historyHash?: string;
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

export interface BuyResourceInput {
  playerId: string;
  itemId: InventoryItemId | string;
  quantity: number;
  playerPosition?: { x: number; y: number };
  vendorId?: string;
  currentTick?: number;
}

export interface BuyResourceResult {
  ok: boolean;
  itemId: string;
  quantityBought: number;
  unitPrice: number;
  basePrice: number;
  totalCoins: number;
  newBalance: number;
  stockBefore: number;
  stockAfter: number;
  demandBand: DemandBand;
  originUid?: string;
  historyHash?: string;
  reason?:
    | "bought"
    | "invalid_player"
    | "invalid_item"
    | "invalid_quantity"
    | "not_sellable"
    | "insufficient_stock"
    | "insufficient_wallet"
    | "inventory_add_failed"
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
  currentTick?: number;
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
  historyHash?: string;
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

function normalizeTick(value: number | undefined): number {
  const tick = Number(value ?? 0);
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function tradeDeltaHash(input: {
  playerId: string;
  vendorId: string;
  itemId: string;
  quantity: number;
  totalCoins: number;
  stockBefore: number;
  currentTick: number;
}): string {
  return stableHash32([
    "ECONOMY_TRADE_DELTA_V1",
    input.playerId,
    input.vendorId,
    input.itemId,
    input.quantity,
    input.totalCoins,
    input.stockBefore,
    input.currentTick,
  ].join("|")).toString(16);
}

export class EconomyService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly walletService: WalletService,
    private readonly vendorStockService: VendorStockService,
    private readonly history: RuntimeHistoryLog = runtimeHistoryLog,
  ) {}

  async sellResource(input: SellResourceInput): Promise<SellResourceResult> {
    if (!input.playerId || input.playerId === "anonymous") {
      return this.sellFailure(input, "invalid_player");
    }

    const quantity = Math.floor(Number(input.quantity));
    if (quantity <= 0 || !Number.isFinite(quantity)) {
      return this.sellFailure(input, "invalid_quantity");
    }

    if (!isSellable(input.itemId)) {
      return this.sellFailure(input, "not_sellable");
    }

    const inventory = await this.inventoryService.getPlayerInventory(input.playerId);
    const slot = inventory.slots.find((s) => s.itemId === input.itemId);

    if (!slot || slot.quantity < quantity) {
      return this.sellFailure(input, "insufficient_quantity", quantity);
    }

    const vendorProximityResult = this.validateVendorProximity(input);
    if (!vendorProximityResult.valid) {
      return this.sellFailure(input, vendorProximityResult.reason ?? "vendor_too_far", quantity);
    }

    const vendorId = input.vendorId ?? "village_trader_001";
    const stockBefore = await this.vendorStockService.getItemQuantity(vendorId, input.itemId);
    const priceInfo = calculateDynamicPrice(input.itemId, stockBefore);

    const removeResult = await this.inventoryService.removeItem({
      playerId: input.playerId,
      itemId: input.itemId,
      quantity,
    });

    if (!removeResult.ok) {
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

    const totalCoins = quantity * priceInfo.unitPrice;
    const updatedWallet = await this.walletService.addCoins({ playerId: input.playerId, amount: totalCoins });
    const stockAfter = await this.vendorStockService.addItems(vendorId, input.itemId, quantity);
    const currentTick = normalizeTick(input.currentTick);
    const history = this.history.write({
      tick: currentTick,
      source: "economy_sell",
      actorId: input.playerId,
      subjectId: `${vendorId}:${input.itemId}`,
      payload: { itemId: input.itemId, quantity, totalCoins, stockBefore, stockAfter: stockAfter.items[input.itemId] ?? stockBefore + quantity },
    });

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
      historyHash: history.entryHash,
      reason: "sold",
    };
  }

  async buyResource(input: BuyResourceInput): Promise<BuyResourceResult> {
    if (!input.playerId || input.playerId === "anonymous") return this.buyFailure(input, "invalid_player");

    const quantity = Math.floor(Number(input.quantity));
    if (quantity <= 0 || !Number.isFinite(quantity)) return this.buyFailure(input, "invalid_quantity");
    if (!isSellable(input.itemId)) return this.buyFailure(input, "not_sellable");

    const vendorProximityResult = this.validateVendorProximity(input);
    if (!vendorProximityResult.valid) return this.buyFailure(input, vendorProximityResult.reason ?? "vendor_too_far", quantity);

    const vendorId = input.vendorId ?? "village_trader_001";
    const stockBefore = await this.vendorStockService.getItemQuantity(vendorId, input.itemId);
    const priceInfo = calculateDynamicPrice(input.itemId, stockBefore);
    if (stockBefore < quantity) return this.buyFailure(input, "insufficient_stock", quantity, stockBefore, priceInfo);

    const totalCoins = quantity * priceInfo.unitPrice;
    const wallet = await this.walletService.getWallet(input.playerId);
    if (wallet.balances.coin < totalCoins) return this.buyFailure(input, "insufficient_wallet", quantity, stockBefore, priceInfo);

    const currentTick = normalizeTick(input.currentTick);
    const sourceHash = tradeDeltaHash({ playerId: input.playerId, vendorId, itemId: String(input.itemId), quantity, totalCoins, stockBefore, currentTick });
    const originUid = `buy:${sourceHash}`;
    const stockAfter = await this.vendorStockService.removeItems(vendorId, input.itemId, quantity);
    if (!stockAfter) return this.buyFailure(input, "insufficient_stock", quantity, stockBefore, priceInfo);

    const walletAfter = await this.walletService.subtractCoins({ playerId: input.playerId, amount: totalCoins });
    const addResult = await this.inventoryService.addItem({
      playerId: input.playerId,
      itemId: input.itemId,
      quantity,
      origin: { uid: originUid, tick: currentTick, source: "trade_delta", sourceHash },
    });

    if (!addResult.ok) {
      return {
        ok: false,
        itemId: String(input.itemId),
        quantityBought: 0,
        unitPrice: priceInfo.unitPrice,
        basePrice: priceInfo.basePrice,
        totalCoins: 0,
        newBalance: walletAfter.balances.coin,
        stockBefore,
        stockAfter: stockAfter.items[input.itemId] ?? 0,
        demandBand: priceInfo.demandBand,
        originUid,
        reason: "inventory_add_failed",
      };
    }

    const history = this.history.write({
      tick: currentTick,
      source: "trade_transfer",
      actorId: input.playerId,
      subjectId: `${vendorId}:${input.itemId}`,
      payload: { itemId: input.itemId, quantity, totalCoins, stockBefore, stockAfter: stockAfter.items[input.itemId] ?? 0, originUid },
    });

    return {
      ok: true,
      itemId: String(input.itemId),
      quantityBought: quantity,
      unitPrice: priceInfo.unitPrice,
      basePrice: priceInfo.basePrice,
      totalCoins,
      newBalance: walletAfter.balances.coin,
      stockBefore,
      stockAfter: stockAfter.items[input.itemId] ?? 0,
      demandBand: priceInfo.demandBand,
      originUid,
      historyHash: history.entryHash,
      reason: "bought",
    };
  }

  async sellAllResources(input: SellAllResourcesInput): Promise<SellAllResourcesResult> {
    if (!input.playerId || input.playerId === "anonymous") return { ok: false, sold: [], totalCoins: 0, newBalance: 0, reason: "invalid_player" };

    const inventory = await this.inventoryService.getPlayerInventory(input.playerId);
    const sellableSlots = inventory.slots.filter((slot) => isSellable(slot.itemId));
    if (sellableSlots.length === 0) return { ok: false, sold: [], totalCoins: 0, newBalance: 0, reason: "nothing_to_sell" };

    const vendorProximityResult = this.validateVendorProximity(input);
    if (!vendorProximityResult.valid) return { ok: false, sold: [], totalCoins: 0, newBalance: 0, reason: vendorProximityResult.reason ?? "vendor_too_far" };

    const vendorId = input.vendorId ?? "village_trader_001";
    const sortedSlots = [...sellableSlots].sort((a, b) => a.itemId.localeCompare(b.itemId));
    const sellOps: Array<{ itemId: string; quantity: number; unitPrice: number; basePrice: number; totalCoins: number; stockBefore: number; stockAfter: number; demandBand: DemandBand }> = [];
    let totalCoins = 0;

    for (const slot of sortedSlots) {
      const stockBefore = await this.vendorStockService.getItemQuantity(vendorId, slot.itemId);
      const priceInfo = calculateDynamicPrice(slot.itemId, stockBefore);
      const slotTotal = slot.quantity * priceInfo.unitPrice;
      totalCoins += slotTotal;
      sellOps.push({ itemId: slot.itemId, quantity: slot.quantity, unitPrice: priceInfo.unitPrice, basePrice: priceInfo.basePrice, totalCoins: slotTotal, stockBefore, stockAfter: stockBefore + slot.quantity, demandBand: priceInfo.demandBand });
    }

    for (const op of sellOps) {
      await this.inventoryService.removeItem({ playerId: input.playerId, itemId: op.itemId, quantity: op.quantity });
    }

    const updatedWallet = await this.walletService.addCoins({ playerId: input.playerId, amount: totalCoins });
    for (const op of sellOps) await this.vendorStockService.addItems(vendorId, op.itemId, op.quantity);

    const history = this.history.write({
      tick: normalizeTick(input.currentTick),
      source: "economy_sell",
      actorId: input.playerId,
      subjectId: `${vendorId}:sell_all`,
      payload: { totalCoins, sold: sellOps },
    });

    return {
      ok: true,
      sold: sellOps.map((op) => ({ itemId: op.itemId, quantitySold: op.quantity, unitPrice: op.unitPrice, basePrice: op.basePrice, totalCoins: op.totalCoins, stockBefore: op.stockBefore, stockAfter: op.stockAfter, demandBand: op.demandBand })),
      totalCoins,
      newBalance: updatedWallet.balances.coin,
      historyHash: history.entryHash,
      reason: "sold",
    };
  }

  private async sellFailure(input: SellResourceInput, reason: NonNullable<SellResourceResult["reason"]>, quantity = 0): Promise<SellResourceResult> {
    const vendorId = input.vendorId ?? "village_trader_001";
    const stockBefore = await this.vendorStockService.getItemQuantity(vendorId, input.itemId).catch(() => 0);
    const priceInfo = calculateDynamicPrice(input.itemId, stockBefore);
    return { ok: false, itemId: String(input.itemId), quantitySold: 0, unitPrice: priceInfo.unitPrice, basePrice: priceInfo.basePrice, totalCoins: 0, newBalance: 0, stockBefore, stockAfter: stockBefore, demandBand: priceInfo.demandBand, reason };
  }

  private async buyFailure(input: BuyResourceInput, reason: NonNullable<BuyResourceResult["reason"]>, quantity = 0, stockBefore = 0, priceInfo = calculateDynamicPrice(input.itemId, stockBefore)): Promise<BuyResourceResult> {
    return { ok: false, itemId: String(input.itemId), quantityBought: 0, unitPrice: priceInfo.unitPrice, basePrice: priceInfo.basePrice, totalCoins: 0, newBalance: 0, stockBefore, stockAfter: stockBefore, demandBand: priceInfo.demandBand, reason };
  }

  private validateVendorProximity(input: { playerPosition?: { x: number; y: number }; vendorId?: string }): { valid: boolean; reason?: "missing_vendor" | "invalid_vendor" | "missing_player_position" | "invalid_player_position" | "vendor_too_far" } {
    const vendorId = input.vendorId ?? "village_trader_001";
    const vendor = getVillageResourceVendor();
    if (vendor.id !== vendorId) return { valid: false, reason: "invalid_vendor" };
    if (!input.playerPosition) return { valid: false, reason: "missing_player_position" };
    const pos = input.playerPosition;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return { valid: false, reason: "invalid_player_position" };
    const proximity = checkVendorProximity(pos, vendor);
    if (!proximity.withinRange) return { valid: false, reason: "vendor_too_far" };
    return { valid: true };
  }
}
