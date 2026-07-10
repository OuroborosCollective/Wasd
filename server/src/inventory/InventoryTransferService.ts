import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import type { InventoryService } from "./InventoryService.js";
import { InventoryStore } from "./InventoryStore.js";
import {
  INVENTORY_CAPACITY,
  ITEM_DEFINITIONS,
  isInventoryItemId,
  normalizeQuantity,
  type InventoryItemId,
  type PlayerInventoryState,
} from "./InventoryTypes.js";

export type InventoryTransferFailureReason =
  | "invalid_player"
  | "same_player"
  | "invalid_item"
  | "invalid_quantity"
  | "invalid_origin"
  | "duplicate_origin"
  | "not_enough_items"
  | "receiver_inventory_full"
  | "sender_remove_failed"
  | "receiver_add_failed"
  | "transaction_failed";

export interface InventoryTransferInput {
  readonly fromPlayerId: string;
  readonly toPlayerId: string;
  readonly itemId: InventoryItemId | string;
  readonly quantity: number;
  readonly tick: number;
  readonly uid: string;
  readonly sourceHash: string;
}

export interface InventoryTransferResult {
  readonly ok: boolean;
  readonly reason?: "transferred" | InventoryTransferFailureReason;
  readonly transferHash: string;
  readonly fromPlayerId: string;
  readonly toPlayerId: string;
  readonly itemId: InventoryItemId;
  readonly quantity: number;
  readonly senderState?: PlayerInventoryState;
  readonly receiverState?: PlayerInventoryState;
  readonly movementHashes?: readonly string[];
}

function normalizePlayerId(value: string): string {
  return value.trim();
}

function isValidRuntimePlayerId(value: string): boolean {
  const normalized = normalizePlayerId(value);
  return normalized.length > 0 && normalized !== "anonymous";
}

function normalizeOrigin(input: InventoryTransferInput): { readonly uid: string; readonly sourceHash: string; readonly tick: number } | null {
  const uid = input.uid.trim();
  const sourceHash = input.sourceHash.trim();
  const tick = Number(input.tick);
  if (!uid || !sourceHash || !Number.isSafeInteger(tick) || tick < 0) return null;
  return Object.freeze({ uid, sourceHash, tick });
}

function transferHash(input: {
  readonly fromPlayerId: string;
  readonly toPlayerId: string;
  readonly itemId: InventoryItemId;
  readonly quantity: number;
  readonly uid: string;
  readonly sourceHash: string;
  readonly tick: number;
}): string {
  return stableHash32([
    "INV_TRANSFER_V1",
    input.fromPlayerId,
    input.toPlayerId,
    input.itemId,
    input.quantity,
    input.uid,
    input.sourceHash,
    input.tick,
  ].join("|")).toString(16);
}

function hasOriginUid(store: InventoryStore, playerId: string, uid: string): boolean {
  return store.getAppliedOriginUids(playerId).includes(uid);
}

function canReceiverAcceptState(state: PlayerInventoryState, itemId: InventoryItemId): boolean {
  const definition = ITEM_DEFINITIONS[itemId];
  const existing = state.slots.find((slot) => slot.itemId === itemId);
  return Boolean(existing && definition.stackable) || state.slots.length < INVENTORY_CAPACITY;
}

function canReceiverAccept(store: InventoryStore, playerId: string, itemId: InventoryItemId): boolean {
  return canReceiverAcceptState(store.getPlayerInventory(playerId), itemId);
}

function cloneState(state: PlayerInventoryState): PlayerInventoryState {
  return {
    playerId: state.playerId,
    schemaVersion: 1,
    capacity: state.capacity,
    slots: state.slots.map((slot) => ({ ...slot })),
  };
}

function failure(input: {
  reason: InventoryTransferFailureReason;
  hash?: string;
  fromPlayerId: string;
  toPlayerId: string;
  itemId?: InventoryItemId;
  quantity?: number;
  senderState?: PlayerInventoryState;
  receiverState?: PlayerInventoryState;
}): InventoryTransferResult {
  return Object.freeze({
    ok: false,
    reason: input.reason,
    transferHash: input.hash ?? "0",
    fromPlayerId: input.fromPlayerId,
    toPlayerId: input.toPlayerId,
    itemId: input.itemId ?? "wood_log",
    quantity: input.quantity ?? 0,
    ...(input.senderState ? { senderState: input.senderState } : {}),
    ...(input.receiverState ? { receiverState: input.receiverState } : {}),
  });
}

export function transferInventoryItem(store: InventoryStore, input: InventoryTransferInput): InventoryTransferResult {
  const fromPlayerId = normalizePlayerId(input.fromPlayerId);
  const toPlayerId = normalizePlayerId(input.toPlayerId);

  if (!isValidRuntimePlayerId(fromPlayerId) || !isValidRuntimePlayerId(toPlayerId)) {
    return failure({ reason: "invalid_player", fromPlayerId, toPlayerId });
  }
  if (fromPlayerId === toPlayerId) {
    return failure({ reason: "same_player", fromPlayerId, toPlayerId });
  }
  if (!isInventoryItemId(input.itemId)) {
    return failure({ reason: "invalid_item", fromPlayerId, toPlayerId });
  }

  const quantity = normalizeQuantity(input.quantity);
  if (quantity <= 0) {
    return failure({ reason: "invalid_quantity", fromPlayerId, toPlayerId, itemId: input.itemId });
  }

  const origin = normalizeOrigin(input);
  if (!origin) {
    return failure({ reason: "invalid_origin", fromPlayerId, toPlayerId, itemId: input.itemId, quantity });
  }
  const hash = transferHash({ fromPlayerId, toPlayerId, itemId: input.itemId, quantity, ...origin });

  if (hasOriginUid(store, toPlayerId, origin.uid)) {
    return failure({ reason: "duplicate_origin", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity });
  }
  if (!store.hasItems({ playerId: fromPlayerId, items: [{ itemId: input.itemId, quantity }] })) {
    return failure({ reason: "not_enough_items", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: store.getPlayerInventory(fromPlayerId) });
  }
  if (!canReceiverAccept(store, toPlayerId, input.itemId)) {
    return failure({ reason: "receiver_inventory_full", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, receiverState: store.getPlayerInventory(toPlayerId) });
  }

  const movementCountBefore = store.getMovementEventCount();
  const senderBefore = cloneState(store.getPlayerInventory(fromPlayerId));
  const receiverBefore = cloneState(store.getPlayerInventory(toPlayerId));
  const senderOrigins = store.getAppliedOriginUids(fromPlayerId);
  const receiverOrigins = store.getAppliedOriginUids(toPlayerId);
  const removeResult = store.removeItem({ playerId: fromPlayerId, itemId: input.itemId, quantity });
  if (!removeResult.ok) {
    return failure({ reason: "sender_remove_failed", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: removeResult.state });
  }

  const addResult = store.addItem({
    playerId: toPlayerId,
    itemId: input.itemId,
    quantity,
    origin: { uid: origin.uid, tick: origin.tick, source: "trade_delta", sourceHash: origin.sourceHash },
  });

  if (!addResult.ok) {
    store.replacePlayerInventory(fromPlayerId, senderBefore, senderOrigins);
    store.replacePlayerInventory(toPlayerId, receiverBefore, receiverOrigins);
    store.truncateMovementEvents(movementCountBefore);
    return failure({ reason: "receiver_add_failed", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: senderBefore, receiverState: receiverBefore });
  }

  const movementHashes = store.getMovementEvents().slice(movementCountBefore).map((event) => event.movementHash);
  return Object.freeze({
    ok: true,
    reason: "transferred",
    transferHash: hash,
    fromPlayerId,
    toPlayerId,
    itemId: input.itemId,
    quantity,
    senderState: removeResult.state,
    receiverState: addResult.state,
    movementHashes: Object.freeze(movementHashes),
  });
}

export async function transferInventoryItemPersistent(
  service: InventoryService,
  input: InventoryTransferInput,
): Promise<InventoryTransferResult> {
  const fromPlayerId = normalizePlayerId(input.fromPlayerId);
  const toPlayerId = normalizePlayerId(input.toPlayerId);

  if (!isValidRuntimePlayerId(fromPlayerId) || !isValidRuntimePlayerId(toPlayerId)) {
    return failure({ reason: "invalid_player", fromPlayerId, toPlayerId });
  }
  if (fromPlayerId === toPlayerId) {
    return failure({ reason: "same_player", fromPlayerId, toPlayerId });
  }
  if (!isInventoryItemId(input.itemId)) {
    return failure({ reason: "invalid_item", fromPlayerId, toPlayerId });
  }

  const quantity = normalizeQuantity(input.quantity);
  if (quantity <= 0) {
    return failure({ reason: "invalid_quantity", fromPlayerId, toPlayerId, itemId: input.itemId });
  }
  const origin = normalizeOrigin(input);
  if (!origin) {
    return failure({ reason: "invalid_origin", fromPlayerId, toPlayerId, itemId: input.itemId, quantity });
  }

  const hash = transferHash({ fromPlayerId, toPlayerId, itemId: input.itemId, quantity, ...origin });
  const [senderBeforeRaw, receiverBeforeRaw] = await Promise.all([
    service.getPlayerInventory(fromPlayerId),
    service.getPlayerInventory(toPlayerId),
  ]);
  const senderBefore = cloneState(senderBeforeRaw);
  const receiverBefore = cloneState(receiverBeforeRaw);
  const senderOrigins = [...service.getAppliedOriginUids(fromPlayerId)];
  const receiverOrigins = [...service.getAppliedOriginUids(toPlayerId)];
  const movementCountBefore = service.getMovementEventCount();

  if (receiverOrigins.includes(origin.uid)) {
    return failure({ reason: "duplicate_origin", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity });
  }
  const senderSlot = senderBefore.slots.find((slot) => slot.itemId === input.itemId);
  if (!senderSlot || senderSlot.quantity < quantity) {
    return failure({ reason: "not_enough_items", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: senderBefore });
  }
  if (!canReceiverAcceptState(receiverBefore, input.itemId)) {
    return failure({ reason: "receiver_inventory_full", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, receiverState: receiverBefore });
  }

  try {
    const removeResult = await service.removeItem({ fromPlayerId, playerId: fromPlayerId, itemId: input.itemId, quantity } as Parameters<InventoryService["removeItem"]>[0]);
    if (!removeResult.ok) {
      return failure({ reason: "sender_remove_failed", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: removeResult.state });
    }

    const addResult = await service.addItem({
      playerId: toPlayerId,
      itemId: input.itemId,
      quantity,
      origin: { uid: origin.uid, tick: origin.tick, source: "trade_delta", sourceHash: origin.sourceHash },
    });
    if (!addResult.ok) {
      await Promise.all([
        service.restorePlayerInventory(fromPlayerId, senderBefore, senderOrigins, movementCountBefore),
        service.restorePlayerInventory(toPlayerId, receiverBefore, receiverOrigins, movementCountBefore),
      ]);
      return failure({ reason: "receiver_add_failed", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: senderBefore, receiverState: receiverBefore });
    }

    return Object.freeze({
      ok: true,
      reason: "transferred",
      transferHash: hash,
      fromPlayerId,
      toPlayerId,
      itemId: input.itemId,
      quantity,
      senderState: removeResult.state,
      receiverState: addResult.state,
      movementHashes: Object.freeze([]),
    });
  } catch {
    await Promise.all([
      service.restorePlayerInventory(fromPlayerId, senderBefore, senderOrigins, movementCountBefore),
      service.restorePlayerInventory(toPlayerId, receiverBefore, receiverOrigins, movementCountBefore),
    ]);
    return failure({ reason: "transaction_failed", hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: senderBefore, receiverState: receiverBefore });
  }
}
