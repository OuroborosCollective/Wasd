import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { VendorStockState } from "../economy/VendorStockTypes.js";

export type EconomyWorkOrderKind = "resource_supply";

export interface EconomyWorkOrderRule {
  readonly itemId: string;
  readonly title: string;
  readonly targetStock: number;
  readonly rewardCoins: number;
}

export interface EconomyWorkOrderSnapshot {
  readonly schemaVersion: 1;
  readonly orderId: string;
  readonly kind: EconomyWorkOrderKind;
  readonly npcId: string;
  readonly vendorId: string;
  readonly itemId: string;
  readonly title: string;
  readonly currentStock: number;
  readonly requiredQuantity: number;
  readonly rewardCoins: number;
  readonly tick: number;
  readonly stateHash: string;
}

export const DEFAULT_ECONOMY_WORK_ORDER_RULES: readonly EconomyWorkOrderRule[] = Object.freeze([
  Object.freeze({
    itemId: "wood_log",
    title: "Restock village timber",
    targetStock: 6,
    rewardCoins: 3,
  }),
  Object.freeze({
    itemId: "copper_ore",
    title: "Restock copper ore",
    targetStock: 4,
    rewardCoins: 5,
  }),
  Object.freeze({
    itemId: "raw_fish",
    title: "Restock fresh fish",
    targetStock: 5,
    rewardCoins: 4,
  }),
]);

function normalizeTick(value: unknown): number {
  const tick = Math.floor(Number(value));
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function normalizeStockQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function createOrderHash(input: {
  readonly vendorId: string;
  readonly npcId: string;
  readonly itemId: string;
  readonly currentStock: number;
  readonly requiredQuantity: number;
  readonly tick: number;
}): string {
  return stableHash32([
    "ECONOMY_WORK_ORDER_V1",
    input.vendorId,
    input.npcId,
    input.itemId,
    input.currentStock,
    input.requiredQuantity,
    input.tick,
  ].join("|")).toString(16);
}

export function deriveEconomyWorkOrders(input: {
  readonly stock: VendorStockState;
  readonly tick: number;
  readonly npcId?: string;
  readonly rules?: readonly EconomyWorkOrderRule[];
}): readonly EconomyWorkOrderSnapshot[] {
  const tick = normalizeTick(input.tick);
  const npcId = input.npcId?.trim() || input.stock.vendorId;
  const rules = [...(input.rules ?? DEFAULT_ECONOMY_WORK_ORDER_RULES)].sort((a, b) => a.itemId.localeCompare(b.itemId));
  const orders: EconomyWorkOrderSnapshot[] = [];

  for (const rule of rules) {
    const targetStock = normalizeStockQuantity(rule.targetStock);
    if (targetStock <= 0) continue;

    const currentStock = normalizeStockQuantity(input.stock.items[rule.itemId] ?? 0);
    if (currentStock >= targetStock) continue;

    const requiredQuantity = targetStock - currentStock;
    const stateHash = createOrderHash({
      vendorId: input.stock.vendorId,
      npcId,
      itemId: rule.itemId,
      currentStock,
      requiredQuantity,
      tick,
    });

    orders.push(Object.freeze({
      schemaVersion: 1 as const,
      orderId: `work_order:${input.stock.vendorId}:${rule.itemId}:${stateHash}`,
      kind: "resource_supply" as const,
      npcId,
      vendorId: input.stock.vendorId,
      itemId: rule.itemId,
      title: rule.title,
      currentStock,
      requiredQuantity,
      rewardCoins: normalizeStockQuantity(rule.rewardCoins),
      tick,
      stateHash,
    }));
  }

  return Object.freeze(orders.sort((a, b) => a.orderId.localeCompare(b.orderId)));
}
