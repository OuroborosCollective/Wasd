import { stableHash32 } from "../core/determinism/AREDeterminism.js";
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
  | "receiver_add_failed";

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

function hasOriginUid(store: InventoryStore, uid: string): boolean {
  return store.getMovementEvents().some((event) => event.origin?.uid === uid);
}

function canReceiverAccept(store: InventoryStore, playerId: string, itemId: InventoryItemId): boolean {
  const definition = ITEM_DEFINITIONS[itemId];
  const state = store.getPlayerInventory(playerId);
  const existing = state.slots.find((slot) => slot.itemId === itemId);
  return Boolean(existing && definition.stackable) || state.slots.length < INVENTORY_CAPACITY;
}

export function transferInventoryItem(store: InventoryStore, input: InventoryTransferInput): InventoryTransferResult {
  const fromPlayerId = normalizePlayerId(input.fromPlayerId);
  const toPlayerId = normalizePlayerId(input.toPlayerId);
  const fallbackItemId: InventoryItemId = "wood_log";

  if (!isValidRuntimePlayerId(fromPlayerId) || !isValidRuntimePlayerId(toPlayerId)) {
    return Object.freeze({ ok: false, reason: "invalid_player", transferHash: "0", fromPlayerId, toPlayerId, itemId: fallbackItemId, quantity: 0 });
  }

  if (fromPlayerId === toPlayerId) {
    return Object.freeze({ ok: false, reason: "same_player", transferHash: "0", fromPlayerId, toPlayerId, itemId: fallbackItemId, quantity: 0 });
  }

  if (!isInventoryItemId(input.itemId)) {
    return Object.freeze({ ok: false, reason: "invalid_item", transferHash: "0", fromPlayerId, toPlayerId, itemId: fallbackItemId, quantity: 0 });
  }

  const quantity = normalizeQuantity(input.quantity);
  if (quantity <= 0) {
    return Object.freeze({ ok: false, reason: "invalid_quantity", transferHash: "0", fromPlayerId, toPlayerId, itemId: input.itemId, quantity: 0 });
  }

  const origin = normalizeOrigin(input);
  if (!origin) {
    return Object.freeze({ ok: false, reason: "invalid_origin", transferHash: "0", fromPlayerId, toPlayerId, itemId: input.itemId, quantity });
  }

  const hash = transferHash({ fromPlayerId, toPlayerId, itemId: input.itemId, quantity, ...origin });

  if (hasOriginUid(store, origin.uid)) {
    return Object.freeze({ ok: false, reason: "duplicate_origin", transferHash: hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity });
  }

  if (!store.hasItems({ playerId: fromPlayerId, items: [{ itemId: input.itemId, quantity }] })) {
    return Object.freeze({ ok: false, reason: "not_enough_items", transferHash: hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: store.getPlayerInventory(fromPlayerId) });
  }

  if (!canReceiverAccept(store, toPlayerId, input.itemId)) {
    return Object.freeze({ ok: false, reason: "receiver_inventory_full", transferHash: hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, receiverState: store.getPlayerInventory(toPlayerId) });
  }

  const movementCountBefore = store.getMovementEvents().length;
  const removeResult = store.removeItem({ playerId: fromPlayerId, itemId: input.itemId, quantity });
  if (!removeResult.ok) {
    return Object.freeze({ ok: false, reason: "sender_remove_failed", transferHash: hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: removeResult.state });
  }

  const addResult = store.addItem({
    playerId: toPlayerId,
    itemId: input.itemId,
    quantity,
    origin: { uid: origin.uid, tick: origin.tick, source: "trade_delta", sourceHash: origin.sourceHash },
  });

  if (!addResult.ok) {
    return Object.freeze({ ok: false, reason: "receiver_add_failed", transferHash: hash, fromPlayerId, toPlayerId, itemId: input.itemId, quantity, senderState: removeResult.state, receiverState: addResult.state });
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
