/**
 * INVENTORY STORE
 *
 * Server-authoritative in-memory inventory store.
 * Deterministic: No Math.random(), stable ordering, no Date.now().
 */

import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import {
  INVENTORY_CAPACITY,
  ITEM_DEFINITIONS,
  createDefaultInventoryState,
  isInventoryItemId,
  isInventoryOriginSource,
  normalizePlayerInventoryState,
  normalizeQuantity,
  type InventoryAddResult,
  type InventoryItemId,
  type InventoryItemOrigin,
  type InventoryMovementEvent,
  type InventoryRemoveResult,
  type PlayerInventoryState,
} from "./InventoryTypes.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOrigin(value: unknown): InventoryItemOrigin | null | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return null;

  const uid = typeof value.uid === "string" ? value.uid.trim() : "";
  const sourceHash = typeof value.sourceHash === "string" ? value.sourceHash.trim() : "";
  const tick = Number(value.tick);

  if (!uid || !sourceHash || !Number.isSafeInteger(tick) || tick < 0 || !isInventoryOriginSource(value.source)) {
    return null;
  }

  return Object.freeze({ uid, tick, source: value.source, sourceHash });
}

function inventoryStateHash(state: PlayerInventoryState): string {
  const slots = state.slots
    .map((slot) => `${slot.slotId}:${slot.itemId}:${slot.quantity}`)
    .sort()
    .join(",");
  return stableHash32(["INV_STATE_V1", state.playerId, state.schemaVersion, state.capacity, slots].join("|")).toString(16);
}

function createMovementEvent(input: {
  sequence: number;
  playerId: string;
  itemId: InventoryItemId;
  quantity: number;
  movement: "add" | "remove";
  beforeStateHash: string;
  afterStateHash: string;
  origin?: InventoryItemOrigin;
}): InventoryMovementEvent {
  const seed = [
    "INV_MOVE_V1",
    input.sequence,
    input.playerId,
    input.itemId,
    input.quantity,
    input.movement,
    input.beforeStateHash,
    input.afterStateHash,
    input.origin?.uid ?? "",
    input.origin?.tick ?? 0,
    input.origin?.source ?? "",
    input.origin?.sourceHash ?? "",
  ].join("|");

  return Object.freeze({
    movementHash: stableHash32(seed).toString(16),
    playerId: input.playerId,
    itemId: input.itemId,
    quantity: input.quantity,
    movement: input.movement,
    beforeStateHash: input.beforeStateHash,
    afterStateHash: input.afterStateHash,
    ...(input.origin ? { origin: input.origin } : {}),
  });
}

function normalizeOriginUids(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export class InventoryStore {
  private readonly inventories = new Map<string, PlayerInventoryState>();
  private readonly appliedOriginUidsByPlayer = new Map<string, Set<string>>();
  private readonly movementEvents: InventoryMovementEvent[] = [];

  getPlayerInventory(playerId: string): PlayerInventoryState {
    const existing = this.inventories.get(playerId);
    if (existing) return normalizePlayerInventoryState(existing, playerId);

    const created = createDefaultInventoryState(playerId);
    this.inventories.set(playerId, created);
    return created;
  }

  getAppliedOriginUids(playerId: string): readonly string[] {
    return Object.freeze(normalizeOriginUids([...(this.appliedOriginUidsByPlayer.get(playerId) ?? [])]));
  }

  addItem(input: {
    playerId: string;
    itemId: InventoryItemId | string;
    quantity: number;
    origin?: InventoryItemOrigin;
  }): InventoryAddResult {
    if (!input.playerId || input.playerId === "anonymous") {
      return { ok: false, playerId: input.playerId, itemId: "wood_log", quantity: 0, reason: "invalid_item" };
    }

    if (!isInventoryItemId(input.itemId)) {
      return { ok: false, playerId: input.playerId, itemId: "wood_log", quantity: 0, reason: "invalid_item" };
    }

    const quantity = normalizeQuantity(input.quantity);
    if (quantity <= 0) {
      return { ok: false, playerId: input.playerId, itemId: input.itemId, quantity: 0, reason: "invalid_quantity" };
    }

    const origin = normalizeOrigin(input.origin);
    const definition = ITEM_DEFINITIONS[input.itemId];
    const state = this.getPlayerInventory(input.playerId);

    if (origin === null) {
      return { ok: false, playerId: input.playerId, itemId: definition.id, quantity, reason: "invalid_origin", state };
    }

    const appliedOrigins = this.appliedOriginUidsByPlayer.get(input.playerId) ?? new Set<string>();
    if (origin && appliedOrigins.has(origin.uid)) {
      return { ok: false, playerId: input.playerId, itemId: definition.id, quantity, reason: "duplicate_origin", state };
    }

    const beforeStateHash = inventoryStateHash(state);
    const existing = state.slots.find((slot) => slot.itemId === definition.id);
    let nextState: PlayerInventoryState;

    if (existing && definition.stackable) {
      nextState = normalizePlayerInventoryState(
        {
          ...state,
          slots: state.slots.map((slot) =>
            slot.itemId === definition.id
              ? { ...slot, quantity: Math.min(slot.quantity + quantity, definition.maxStack) }
              : slot,
          ),
        },
        input.playerId,
      );
    } else {
      if (state.slots.length >= INVENTORY_CAPACITY) {
        return { ok: false, playerId: input.playerId, itemId: definition.id, quantity, reason: "inventory_full", state };
      }

      nextState = normalizePlayerInventoryState(
        {
          ...state,
          slots: [
            ...state.slots,
            {
              slotId: definition.stackable
                ? `slot_${definition.id}`
                : `slot_${definition.id}_${String(state.slots.filter((s) => s.itemId === definition.id).length + 1).padStart(3, "0")}`,
              itemId: definition.id,
              name: definition.name,
              quantity,
              category: definition.category,
              stackable: definition.stackable,
              maxStack: definition.maxStack,
            },
          ],
        },
        input.playerId,
      );
    }

    this.inventories.set(input.playerId, nextState);
    if (origin) {
      appliedOrigins.add(origin.uid);
      this.appliedOriginUidsByPlayer.set(input.playerId, appliedOrigins);
    }
    this.movementEvents.push(createMovementEvent({
      sequence: this.movementEvents.length,
      playerId: input.playerId,
      itemId: definition.id,
      quantity,
      movement: "add",
      beforeStateHash,
      afterStateHash: inventoryStateHash(nextState),
      ...(origin ? { origin } : {}),
    }));

    return { ok: true, playerId: input.playerId, itemId: definition.id, quantity, reason: "added", state: nextState };
  }

  replacePlayerInventory(
    playerId: string,
    state: PlayerInventoryState,
    appliedOriginUids: readonly string[] = [],
  ): void {
    this.inventories.set(playerId, normalizePlayerInventoryState(state, playerId));
    this.appliedOriginUidsByPlayer.set(playerId, new Set(normalizeOriginUids(appliedOriginUids)));
  }

  removeItem(input: {
    playerId: string;
    itemId: InventoryItemId | string;
    quantity: number;
  }): InventoryRemoveResult {
    if (!isInventoryItemId(input.itemId)) {
      return { ok: false, playerId: input.playerId, itemId: "wood_log", quantity: 0, reason: "invalid_item" };
    }

    const quantity = normalizeQuantity(input.quantity);
    if (quantity <= 0) {
      return { ok: false, playerId: input.playerId, itemId: input.itemId, quantity: 0, reason: "invalid_quantity" };
    }

    const state = this.getPlayerInventory(input.playerId);
    const existing = state.slots.find((slot) => slot.itemId === input.itemId);

    if (!existing || existing.quantity < quantity) {
      return { ok: false, playerId: input.playerId, itemId: input.itemId, quantity, reason: "not_enough_items", state };
    }

    const beforeStateHash = inventoryStateHash(state);
    const nextSlots = existing.quantity === quantity
      ? state.slots.filter((slot) => slot.itemId !== input.itemId)
      : state.slots.map((slot) => slot.itemId === input.itemId ? { ...slot, quantity: slot.quantity - quantity } : slot);

    const nextState = normalizePlayerInventoryState({ ...state, slots: nextSlots }, input.playerId);
    this.inventories.set(input.playerId, nextState);
    this.movementEvents.push(createMovementEvent({
      sequence: this.movementEvents.length,
      playerId: input.playerId,
      itemId: input.itemId,
      quantity,
      movement: "remove",
      beforeStateHash,
      afterStateHash: inventoryStateHash(nextState),
    }));

    return { ok: true, playerId: input.playerId, itemId: input.itemId, quantity, reason: "removed", state: nextState };
  }

  hasItems(input: {
    playerId: string;
    items: Array<{ itemId: InventoryItemId; quantity: number }>;
  }): boolean {
    const state = this.getPlayerInventory(input.playerId);
    return input.items.every((required) => {
      const slot = state.slots.find((candidate) => candidate.itemId === required.itemId);
      return Boolean(slot && slot.quantity >= required.quantity);
    });
  }

  getMovementEvents(playerId?: string): readonly InventoryMovementEvent[] {
    const events = playerId ? this.movementEvents.filter((event) => event.playerId === playerId) : this.movementEvents;
    return Object.freeze(events.map((event) => Object.freeze({ ...event, ...(event.origin ? { origin: Object.freeze({ ...event.origin }) } : {}) })));
  }

  clearForTests(): void {
    this.inventories.clear();
    this.appliedOriginUidsByPlayer.clear();
    this.movementEvents.length = 0;
  }
}
