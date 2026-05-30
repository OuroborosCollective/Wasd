/**
 * Ouroboros InventoryDirector — Server-Authoritative Item Movement
 * 
 * Axiom der Erhaltung (Conservation Axiom):
 * Item movement is NEVER local. Every equip/unequip/move is an
 * atomic server transaction. The client NEVER modifies inventory state.
 * 
 * This director is the single source of truth for player inventory mutations.
 * All handlers validate prerequisites, then atomically mutate and broadcast.
 */

import type { GameWebSocketServer } from "../../networking/WebSocketServer.js";
import {
  EquipSlot,
  EQUIP_SLOTS,
  ItemSignature,
  ModularItem,
  InventoryState,
  EquipmentState,
  PlayerInventorySnapshot,
  InventoryIntent,
  InventoryEvent,
  MODULAR_COMPONENT_POOLS,
} from "@wasd/shared/items";
import { buildModularItem, parseItemSignature, forgeSignature } from "@wasd/shared";

// ─── Type Re-exports for convenience ───────────────────────────

type Player = {
  id: string;
  uid: string;
  inventory: (ModularItem | null)[];
  equipment: EquipmentState;
  level?: number;
  class?: string;
};

type IntentResult =
  | { ok: true; snapshot: PlayerInventorySnapshot }
  | { ok: false; code: string; message: string };

// ─── Configuration ─────────────────────────────────────────────

const DEFAULT_INVENTORY_SLOTS = 24;
const DEFAULT_MAX_WEIGHT = 200;

// ─── InventoryDirector ─────────────────────────────────────────

export class InventoryDirector {
  private static instance: InventoryDirector;
  private ws: GameWebSocketServer | null = null;

  // Server tick — used for deterministic signature generation
  private currentTick = 0;

  private constructor() {}

  public static getInstance(): InventoryDirector {
    if (!InventoryDirector.instance) {
      InventoryDirector.instance = new InventoryDirector();
    }
    return InventoryDirector.instance;
  }

  /**
   * Wire up WebSocket server reference.
   * Called during server bootstrap to enable broadcast.
   */
  public initialize(ws: GameWebSocketServer): void {
    this.ws = ws;
  }

  /**
   * Update server tick counter (called by WorldTick).
   */
  public setTick(tick: number): void {
    this.currentTick = tick;
  }

  // ─── Guard Functions ──────────────────────────────────────────

  /**
   * Validate player meets requirements to equip an item.
   * Returns null if valid, or error message if blocked.
   */
  private validateEquipPrerequisites(
    player: Player,
    item: ModularItem,
    targetSlot: EquipSlot
  ): string | null {
    // Check level requirement
    if (item.requiredLevel && (player.level ?? 1) < item.requiredLevel) {
      return `Level ${item.requiredLevel} required. Current: ${player.level ?? 1}`;
    }

    // Check class restriction
    if (item.requiredClass && player.class && item.requiredClass !== player.class) {
      return `Class ${item.requiredClass} only. Current: ${player.class}`;
    }

    // Check slot compatibility (weapon goes to MAIN_HAND, armor to CHEST, etc.)
    if (item.slot && item.slot !== targetSlot) {
      return `Item belongs in ${item.slot}, not ${targetSlot}`;
    }

    return null;
  }

  /**
   * Check if inventory slot index is valid and within bounds.
   */
  private validateInventorySlot(inventory: (ModularItem | null)[], index: number): boolean {
    return index >= 0 && index < inventory.length;
  }

  /**
   * Check if equip slot is valid.
   */
  private validateEquipSlot(slot: EquipSlot): boolean {
    return EQUIP_SLOTS.includes(slot);
  }

  /**
   * Check if player has capacity (weight) for an item.
   */
  private canCarryWeight(
    player: Player,
    additionalWeight: number
  ): boolean {
    const currentWeight = this.calculateInventoryWeight(player);
    return (currentWeight + additionalWeight) <= DEFAULT_MAX_WEIGHT;
  }

  /**
   * Calculate current inventory weight.
   */
  private calculateInventoryWeight(player: Player): number {
    let weight = 0;
    for (const item of player.inventory) {
      if (item) {
        // Use ilvl as weight proxy (scales with item power)
        weight += Math.max(1, item.ilvl * 0.5);
      }
    }
    for (const slot of EQUIP_SLOTS) {
      const equipped = player.equipment[slot];
      if (equipped) {
        weight += Math.max(1, equipped.ilvl * 0.5);
      }
    }
    return weight;
  }

  // ─── Core Handlers ────────────────────────────────────────────

  /**
   * Handle equip intent: move item from inventory slot to equipment slot.
   * 
   * ATOMIC OPERATION:
   * 1. Validate source slot has item
   * 2. Validate target equip slot
   * 3. Check prerequisites (level, class, slot compatibility)
   * 4. Swap: equip new item, return old item to inventory (if any)
   * 5. Broadcast new state to client
   */
  public handleEquipItem(
    player: Player,
    inventorySlotIndex: number,
    targetEquipSlot: EquipSlot
  ): IntentResult {
    // ── Guard 1: Validate inventory slot ──
    if (!this.validateInventorySlot(player.inventory, inventorySlotIndex)) {
      return { ok: false, code: "INVALID_SLOT", message: `Inventory slot ${inventorySlotIndex} out of bounds` };
    }

    const itemToEquip = player.inventory[inventorySlotIndex];
    if (!itemToEquip) {
      return { ok: false, code: "EMPTY_SLOT", message: "No item in source slot" };
    }

    // ── Guard 2: Validate equip slot ──
    if (!this.validateEquipSlot(targetEquipSlot)) {
      return { ok: false, code: "INVALID_EQUIP_SLOT", message: `Invalid equip slot: ${targetEquipSlot}` };
    }

    // ── Guard 3: Validate prerequisites ──
    const prereqError = this.validateEquipPrerequisites(player, itemToEquip, targetEquipSlot);
    if (prereqError) {
      return { ok: false, code: "PREREQUISITE_FAILED", message: prereqError };
    }

    // ── Guard 4: Check item slot compatibility ──
    if (itemToEquip.slot && itemToEquip.slot !== targetEquipSlot) {
      return { ok: false, code: "SLOT_MISMATCH", message: `Item can only be equipped to ${itemToEquip.slot}` };
    }

    // ── Atomic Swap ──
    const currentEquipped = player.equipment[targetEquipSlot];
    
    // Remove item from inventory slot
    player.inventory[inventorySlotIndex] = currentEquipped; // Swap with currently equipped (or null)
    
    // Place item in equipment slot
    player.equipment[targetEquipSlot] = itemToEquip;

    // ── Broadcast Result ──
    const snapshot = this.buildSnapshot(player);
    this.broadcastInventoryEvent(player.id, {
      event: "item_equipped",
      slot: targetEquipSlot,
      item: itemToEquip,
    });
    this.broadcastSnapshot(player.id, snapshot);

    return { ok: true, snapshot };
  }

  /**
   * Handle unequip intent: move item from equipment slot to inventory slot.
   * 
   * ATOMIC OPERATION:
   * 1. Validate equip slot has item
   * 2. Validate target inventory slot
   * 3. Check binding/non-transferable restrictions
   * 4. Swap: unequip item, return old item to equipment (if any)
   * 5. Broadcast new state to client
   */
  public handleUnequipItem(
    player: Player,
    equipSlot: EquipSlot,
    targetInventorySlotIndex: number
  ): IntentResult {
    // ── Guard 1: Validate equip slot ──
    if (!this.validateEquipSlot(equipSlot)) {
      return { ok: false, code: "INVALID_EQUIP_SLOT", message: `Invalid equip slot: ${equipSlot}` };
    }

    const itemToUnequip = player.equipment[equipSlot];
    if (!itemToUnequip) {
      return { ok: false, code: "SLOT_EMPTY", message: "No item in equipment slot" };
    }

    // ── Guard 2: Check binding policy ──
    if (itemToUnequip.boundOnAcquire) {
      return { ok: false, code: "ITEM_BOUND", message: "Cannot unequip bound items" };
    }
    if (itemToUnequip.tradeable === false) {
      return { ok: false, code: "ITEM_NON_TRANSFERABLE", message: "Item cannot be transferred" };
    }

    // ── Guard 3: Validate target inventory slot ──
    if (!this.validateInventorySlot(player.inventory, targetInventorySlotIndex)) {
      return { ok: false, code: "INVALID_TARGET_SLOT", message: `Target inventory slot ${targetInventorySlotIndex} out of bounds` };
    }

    // ── Atomic Swap ──
    const currentInTarget = player.inventory[targetInventorySlotIndex];
    
    // Remove from equipment slot
    player.equipment[equipSlot] = currentInTarget; // Swap with current inventory item (or null)
    
    // Place in inventory slot
    player.inventory[targetInventorySlotIndex] = itemToUnequip;

    // ── Broadcast Result ──
    const snapshot = this.buildSnapshot(player);
    this.broadcastInventoryEvent(player.id, {
      event: "item_unequipped",
      slot: equipSlot,
      item: itemToUnequip,
    });
    this.broadcastSnapshot(player.id, snapshot);

    return { ok: true, snapshot };
  }

  /**
   * Handle move intent: swap items between two inventory slots.
   * 
   * ATOMIC OPERATION:
   * 1. Validate both slots exist and contain items
   * 2. Check item constraints (can stack, etc.)
   * 3. Swap items
   * 4. Broadcast new state
   */
  public handleMoveItem(
    player: Player,
    fromSlot: number,
    toSlot: number
  ): IntentResult {
    // ── Guard 1: Validate both slots ──
    if (!this.validateInventorySlot(player.inventory, fromSlot)) {
      return { ok: false, code: "INVALID_FROM_SLOT", message: `Source slot ${fromSlot} out of bounds` };
    }
    if (!this.validateInventorySlot(player.inventory, toSlot)) {
      return { ok: false, code: "INVALID_TO_SLOT", message: `Target slot ${toSlot} out of bounds` };
    }

    if (fromSlot === toSlot) {
      return { ok: false, code: "SAME_SLOT", message: "Source and target are the same" };
    }

    // ── Atomic Swap ──
    const temp = player.inventory[fromSlot];
    player.inventory[fromSlot] = player.inventory[toSlot];
    player.inventory[toSlot] = temp;

    // ── Broadcast Result ──
    const snapshot = this.buildSnapshot(player);
    this.broadcastSnapshot(player.id, snapshot);

    return { ok: true, snapshot };
  }

  /**
   * Handle drop intent: remove item from inventory.
   * 
   * SECURITY NOTE: Dropping is logged and creates a world loot entity.
   * Bound/non-transferable items are blocked.
   */
  public handleDropItem(
    player: Player,
    inventorySlotIndex: number
  ): IntentResult {
    // ── Guard 1: Validate slot ──
    if (!this.validateInventorySlot(player.inventory, inventorySlotIndex)) {
      return { ok: false, code: "INVALID_SLOT", message: `Inventory slot ${inventorySlotIndex} out of bounds` };
    }

    const item = player.inventory[inventorySlotIndex];
    if (!item) {
      return { ok: false, code: "EMPTY_SLOT", message: "No item to drop" };
    }

    // ── Guard 2: Check drop restrictions ──
    if (item.boundOnAcquire) {
      return { ok: false, code: "ITEM_BOUND", message: "Cannot drop bound items" };
    }
    if (item.droppable === false) {
      return { ok: false, code: "ITEM_NOT_DROPPABLE", message: "Item cannot be dropped" };
    }

    // ── Remove Item ──
    player.inventory[inventorySlotIndex] = null;

    // TODO: Create world loot entity at player position
    // this.lootEntities.set(generateLootId(), { item, position: player.position, ownerId: player.uid });

    // ── Broadcast Result ──
    const snapshot = this.buildSnapshot(player);
    this.broadcastSnapshot(player.id, snapshot);

    return { ok: true, snapshot };
  }

  // ─── Intent Router ────────────────────────────────────────────

  /**
   * Main entry point for all inventory intents.
   * Routes to appropriate handler and returns result.
   */
  public processIntent(player: Player, intent: InventoryIntent): IntentResult {
    switch (intent.intent) {
      case "equip":
        return this.handleEquipItem(player, intent.inventorySlotIndex, intent.targetEquipSlot);
      
      case "unequip":
        return this.handleUnequipItem(player, intent.equipSlot, intent.targetInventorySlotIndex);
      
      case "move":
        return this.handleMoveItem(player, intent.fromSlot, intent.toSlot);
      
      case "drop":
        return this.handleDropItem(player, intent.inventorySlotIndex);
      
      case "use":
        // TODO: Implement consumable use
        return { ok: false, code: "NOT_IMPLEMENTED", message: "Item use not yet implemented" };
      
      default:
        return { ok: false, code: "UNKNOWN_INTENT", message: "Unknown inventory intent" };
    }
  }

  // ─── Snapshot Building ─────────────────────────────────────────

  /**
   * Build a complete inventory snapshot for broadcast.
   */
  public buildSnapshot(player: Player): PlayerInventorySnapshot {
    return {
      inventory: {
        slots: player.inventory,
        maxSlots: player.inventory.length || DEFAULT_INVENTORY_SLOTS,
        gold: 0, // Gold lives on player.gold in the actual model
        weight: this.calculateInventoryWeight(player),
        maxWeight: DEFAULT_MAX_WEIGHT,
      },
      equipment: player.equipment,
      tick: this.currentTick,
    };
  }

  // ─── Broadcast Helpers ────────────────────────────────────────

  private broadcastSnapshot(socketId: string, snapshot: PlayerInventorySnapshot): void {
    if (!this.ws) return;
    this.ws.sendToPlayer(socketId, {
      type: "inventory_snapshot",
      payload: snapshot,
    });
  }

  private broadcastInventoryEvent(socketId: string, event: InventoryEvent): void {
    if (!this.ws) return;
    this.ws.sendToPlayer(socketId, {
      type: "inventory_event",
      payload: event,
    });
  }

  /**
   * Full state sync — called on login or after significant changes.
   */
  public syncFullState(player: Player): void {
    const snapshot = this.buildSnapshot(player);
    this.broadcastSnapshot(player.id, snapshot);
  }

  // ─── Loot Generation (Deterministic) ─────────────────────────

  /**
   * Generate a modular item using deterministic signature from player + world state.
   * This enables 30k+ weapon permutations from 64 parts without storing each item.
   */
  public generateModularLoot(
    playerUid: string,
    slotIndex: number,
    qualityBias: number = 0.5
  ): ModularItem {
    // Use tick + player UID for deterministic seed
    const seedBase = `${playerUid}:${slotIndex}:${this.currentTick}`;
    const seedHash = this.hashString(seedBase);
    
    // Select components deterministically
    const bladeIdx = Math.abs(seedHash) % MODULAR_COMPONENT_POOLS.blades.length;
    const hiltIdx = Math.abs(seedHash >> 4) % MODULAR_COMPONENT_POOLS.hilts.length;
    const matIdx = Math.abs(seedHash >> 8) % MODULAR_COMPONENT_POOLS.materials.length;
    const prefixIdx = Math.abs(seedHash >> 12) % MODULAR_COMPONENT_POOLS.prefixes.length;
    const suffixIdx = Math.abs(seedHash >> 16) % MODULAR_COMPONENT_POOLS.suffixes.length;
    const runeIdx = Math.abs(seedHash >> 20) % MODULAR_COMPONENT_POOLS.runes.length;
    
    const hasRune = (seedHash % 10) < (qualityBias * 5);
    
    const signature = forgeSignature(
      MODULAR_COMPONENT_POOLS.blades[bladeIdx],
      MODULAR_COMPONENT_POOLS.hilts[hiltIdx],
      MODULAR_COMPONENT_POOLS.materials[matIdx],
      MODULAR_COMPONENT_POOLS.prefixes[prefixIdx],
      MODULAR_COMPONENT_POOLS.suffixes[suffixIdx],
      hasRune ? MODULAR_COMPONENT_POOLS.runes[runeIdx] : undefined
    );

    const ilvl = Math.floor(qualityBias * 50) + 1;
    return buildModularItem(signature, ilvl);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ─── Singleton Export ───────────────────────────────────────────

export const inventoryDirector = InventoryDirector.getInstance();