import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { VendorActorEvidence } from "../economy/VillageVendors.js";
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
  readonly npcActorHash: string;
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
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new Error("work_order_tick_required");
  }
  return tick;
}

function normalizeStockQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function createOrderHash(input: {
  readonly vendorId: string;
  readonly actorHash: string;
  readonly rule: EconomyWorkOrderRule;
  readonly currentStock: number;
  readonly requiredQuantity: number;
}): string {
  return stableHash32([
    "ECONOMY_WORK_ORDER_V2",
    input.vendorId,
    input.actorHash,
    input.rule.itemId,
    input.rule.title,
    input.rule.targetStock,
    input.rule.rewardCoins,
    input.currentStock,
    input.requiredQuantity,
  ].join("|")).toString(16);
}

export function deriveEconomyWorkOrders(input: {
  readonly stock: VendorStockState;
  readonly tick: number;
  readonly actor: VendorActorEvidence;
  readonly rules?: readonly EconomyWorkOrderRule[];
}): readonly EconomyWorkOrderSnapshot[] {
  const tick = normalizeTick(input.tick);
  if (input.actor.actorId !== input.stock.vendorId) {
    throw new Error("work_order_actor_vendor_mismatch");
  }

  const rules = [...(input.rules ?? DEFAULT_ECONOMY_WORK_ORDER_RULES)]
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
  const orders: EconomyWorkOrderSnapshot[] = [];

  for (const rule of rules) {
    const targetStock = normalizeStockQuantity(rule.targetStock);
    if (targetStock <= 0) continue;

    const currentStock = normalizeStockQuantity(input.stock.items[rule.itemId] ?? 0);
    if (currentStock >= targetStock) continue;

    const requiredQuantity = targetStock - currentStock;
    const stateHash = createOrderHash({
      vendorId: input.stock.vendorId,
      actorHash: input.actor.definitionHash,
      rule,
      currentStock,
      requiredQuantity,
    });

    orders.push(Object.freeze({
      schemaVersion: 1 as const,
      orderId: `work_order:${input.stock.vendorId}:${rule.itemId}:${stateHash}`,
      kind: "resource_supply" as const,
      npcId: input.actor.actorId,
      npcActorHash: input.actor.definitionHash,
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
