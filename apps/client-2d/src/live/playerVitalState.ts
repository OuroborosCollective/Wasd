/**
 * PlayerVitalState - Deterministic Player State Management
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE RULES (Zero-Determinism Violations Are Fatal)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ✓ DETERMINISTIC:
 *   - Server-authoritative: All values come from server heartbeat/snapshot
 *   - Input sequence: acknowledgedInputSeq drives state machine
 *   - Tick-driven: serverTick provides deterministic time reference
 * 
 * ✗ FORBIDDEN:
 *   - Date.now() / performance.now() for state calculations
 *   - Math.random() for any gameplay state
 *   - setTimeout/setInterval for state updates
 *   - Client-side prediction for vitals (HP/Mana/XP come from server)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This module provides:
 * - Player vitals: hp, maxHp, mana, maxMana, stamina, maxStamina, xp, level
 * - Inventory: items array with slot management
 * - Equipment: equipped weapon, armor slots
 * - All updates are derived from server events only
 */

import type { InventoryItem } from "../ui/InventoryPanel";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PlayerVitals {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  xp: number;
  maxXp: number;
  level: number;
}

export interface InventorySlot {
  index: number;
  itemId: string | null;
  quantity: number;
  itemDef?: ItemDef;
}

export interface ItemDef {
  id: string;
  name: string;
  ico: string;
  maxStack: number;
  category: "weapon" | "armor" | "consumable" | "material" | "quest" | "unknown";
}

export interface EquipmentSlots {
  head: string | null;
  chest: string | null;
  weapon: string | null;
  offhand: string | null;
  legs: string | null;
  feet: string | null;
}

export interface PlayerVitalState {
  vitals: PlayerVitals;
  inventory: InventorySlot[];
  equipment: EquipmentSlots;
  inventoryCapacity: number;
}

export type PlayerVitalEvent =
  | { type: "heartbeat_vitals"; tick: number; acknowledgedSeq: number; vitals: Partial<PlayerVitals> }
  | { type: "inventory_snapshot"; tick: number; acknowledgedSeq: number; slots: InventorySlot[] }
  | { type: "equipment_update"; tick: number; acknowledgedSeq: number; equipment: Partial<EquipmentSlots> }
  | { type: "level_up"; tick: number; level: number; maxHp: number; maxMana: number }
  | { type: "reset" };

// -----------------------------------------------------------------------------
// Item Definitions (Static - from server content)
// -----------------------------------------------------------------------------

const ITEM_DEFINITIONS: Record<string, ItemDef> = {
  // Consumables
  p_hp: { id: "p_hp", name: "HP Potion", ico: "❤️", maxStack: 99, category: "consumable" },
  p_mp: { id: "p_mp", name: "MP Potion", ico: "💙", maxStack: 99, category: "consumable" },
  herb: { id: "herb", name: "Healing Herb", ico: "🌿", maxStack: 50, category: "consumable" },
  food: { id: "food", name: "Bread", ico: "🍞", maxStack: 20, category: "consumable" },
  // Materials
  wood: { id: "wood", name: "Wood", ico: "🪵", maxStack: 100, category: "material" },
  stone: { id: "stone", name: "Stone", ico: "🪨", maxStack: 100, category: "material" },
  iron: { id: "iron", name: "Iron Ore", ico: "⚙️", maxStack: 50, category: "material" },
  gold_ore: { id: "gold_ore", name: "Gold Ore", ico: "✨", maxStack: 20, category: "material" },
  // Currency
  coin: { id: "coin", name: "Gold", ico: "💰", maxStack: 99999, category: "material" },
  // Weapons
  s_wood: { id: "s_wood", name: "Wooden Sword", ico: "🗡️", maxStack: 1, category: "weapon" },
  s_iron: { id: "s_iron", name: "Iron Sword", ico: "⚔️", maxStack: 1, category: "weapon" },
  s_steel: { id: "s_steel", name: "Steel Sword", ico: "⚔️", maxStack: 1, category: "weapon" },
  staff: { id: "staff", name: "Magic Staff", ico: "🔮", maxStack: 1, category: "weapon" },
  bow_wood: { id: "bow_wood", name: "Wooden Bow", ico: "🏹", maxStack: 1, category: "weapon" },
  // Armor
  h_iron: { id: "h_iron", name: "Iron Helm", ico: "⛑️", maxStack: 1, category: "armor" },
  a_leath: { id: "a_leath", name: "Leather Armor", ico: "👕", maxStack: 1, category: "armor" },
  a_chain: { id: "a_chain", name: "Chainmail", ico: "🧥", maxStack: 1, category: "armor" },
  a_plate: { id: "a_plate", name: "Plate Armor", ico: "🏰", maxStack: 1, category: "armor" },
  // Quest
  quest_scroll: { id: "quest_scroll", name: "Quest Scroll", ico: "📜", maxStack: 10, category: "quest" },
};

export function getItemDefinition(itemId: string): ItemDef | null {
  return ITEM_DEFINITIONS[itemId] ?? null;
}

// -----------------------------------------------------------------------------
// Initial State (Deterministic Defaults)
// -----------------------------------------------------------------------------

const INITIAL_INVENTORY_CAPACITY = 24;

const INITIAL_VITALS: PlayerVitals = {
  hp: 100,
  maxHp: 100,
  mana: 50,
  maxMana: 50,
  stamina: 100,
  maxStamina: 100,
  xp: 0,
  maxXp: 100,
  level: 1,
};

const INITIAL_EQUIPMENT: EquipmentSlots = {
  head: null,
  chest: null,
  weapon: null,
  offhand: null,
  legs: null,
  feet: null,
};

function createEmptyInventory(capacity: number): InventorySlot[] {
  return Array.from({ length: capacity }, (_, index) => ({
    index,
    itemId: null,
    quantity: 0,
  }));
}

const INITIAL_STATE: PlayerVitalState = {
  vitals: { ...INITIAL_VITALS },
  inventory: createEmptyInventory(INITIAL_INVENTORY_CAPACITY),
  equipment: { ...INITIAL_EQUIPMENT },
  inventoryCapacity: INITIAL_INVENTORY_CAPACITY,
};

// -----------------------------------------------------------------------------
// State Manager (Deterministic Updates Only)
// -----------------------------------------------------------------------------

class PlayerVitalStateManager {
  private state: PlayerVitalState = { ...INITIAL_STATE, inventory: createEmptyInventory(INITIAL_INVENTORY_CAPACITY) };
  private lastAcknowledgedSeq: number = -1;
  private lastServerTick: number = 0;
  private listeners = new Set<() => void>();

  getState(): PlayerVitalState {
    return this.state;
  }

  getVitals(): PlayerVitals {
    return this.state.vitals;
  }

  getInventory(): InventorySlot[] {
    return this.state.inventory;
  }

  getEquipment(): EquipmentSlots {
    return this.state.equipment;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /**
   * Process heartbeat vitals update (Deterministic - server authoritative)
   */
  onHeartbeatVitals(
    tick: number,
    acknowledgedSeq: number,
    vitalsUpdate: Partial<PlayerVitals>
  ): void {
    // Strict ordering: only accept if sequence is newer
    if (acknowledgedSeq <= this.lastAcknowledgedSeq && tick <= this.lastServerTick) {
      return; // Stale update, ignore
    }

    this.lastAcknowledgedSeq = acknowledgedSeq;
    this.lastServerTick = tick;

    // Merge vitals deterministically
    const newVitals = { ...this.state.vitals, ...vitalsUpdate };

    // Clamp values to valid ranges
    newVitals.hp = Math.max(0, Math.min(newVitals.hp, newVitals.maxHp));
    newVitals.mana = Math.max(0, Math.min(newVitals.mana, newVitals.maxMana));
    newVitals.stamina = Math.max(0, Math.min(newVitals.stamina, newVitals.maxStamina));

    this.state = {
      ...this.state,
      vitals: newVitals,
    };

    this.notify();
  }

  /**
   * Process inventory snapshot (Deterministic - server authoritative)
   */
  onInventorySnapshot(
    tick: number,
    acknowledgedSeq: number,
    slots: InventorySlot[]
  ): void {
    if (acknowledgedSeq <= this.lastAcknowledgedSeq && tick <= this.lastServerTick) {
      return; // Stale update, ignore
    }

    this.lastAcknowledgedSeq = acknowledgedSeq;
    this.lastServerTick = tick;

    // Normalize slot indices and apply item definitions
    const normalizedSlots = slots.map((slot, i) => {
      const def = slot.itemId ? getItemDefinition(slot.itemId) : undefined;
      return {
        index: i,
        itemId: slot.itemId,
        quantity: slot.quantity,
        itemDef: def,
      };
    });

    this.state = {
      ...this.state,
      inventory: normalizedSlots,
    };

    this.notify();
  }

  /**
   * Process equipment update (Deterministic - server authoritative)
   */
  onEquipmentUpdate(
    tick: number,
    acknowledgedSeq: number,
    equipmentUpdate: Partial<EquipmentSlots>
  ): void {
    if (acknowledgedSeq <= this.lastAcknowledgedSeq && tick <= this.lastServerTick) {
      return; // Stale update, ignore
    }

    this.lastAcknowledgedSeq = acknowledgedSeq;
    this.lastServerTick = tick;

    this.state = {
      ...this.state,
      equipment: { ...this.state.equipment, ...equipmentUpdate },
    };

    this.notify();
  }

  /**
   * Process level up (Deterministic - server authoritative)
   */
  onLevelUp(tick: number, level: number, maxHp: number, maxMana: number): void {
    if (tick <= this.lastServerTick) return;

    this.lastServerTick = tick;

    this.state = {
      ...this.state,
      vitals: {
        ...this.state.vitals,
        level,
        maxHp,
        maxMana,
        hp: maxHp, // Full heal on level up
        mana: maxMana,
      },
    };

    this.notify();
  }

  /**
   * Reset state on disconnect (preserve identity)
   */
  reset(): void {
    this.state = {
      ...INITIAL_STATE,
      inventory: createEmptyInventory(INITIAL_INVENTORY_CAPACITY),
      equipment: { ...INITIAL_EQUIPMENT },
    };
    this.lastAcknowledgedSeq = -1;
    this.lastServerTick = 0;
    this.notify();
  }

  /**
   * Get last server tick (for deterministic debugging)
   */
  getLastServerTick(): number {
    return this.lastServerTick;
  }

  /**
   * Get last acknowledged sequence (for deterministic debugging)
   */
  getLastAcknowledgedSeq(): number {
    return this.lastAcknowledgedSeq;
  }
}

// -----------------------------------------------------------------------------
// Singleton Export
// -----------------------------------------------------------------------------

export const playerVitalState = new PlayerVitalStateManager();

// -----------------------------------------------------------------------------
// React Hook (Deterministic - uses useSyncExternalStore)
// -----------------------------------------------------------------------------

import { useSyncExternalStore } from "react";

export function usePlayerVitalState(): PlayerVitalState {
  return useSyncExternalStore(
    playerVitalState.subscribe,
    playerVitalState.getState,
    playerVitalState.getState,
  );
}

export function usePlayerVitals(): PlayerVitals {
  return useSyncExternalStore(
    playerVitalState.subscribe,
    playerVitalState.getVitals,
    playerVitalState.getVitals,
  );
}

export function useInventorySlots(): InventorySlot[] {
  return useSyncExternalStore(
    playerVitalState.subscribe,
    playerVitalState.getInventory,
    playerVitalState.getInventory,
  );
}

export function useEquipmentSlots(): EquipmentSlots {
  return useSyncExternalStore(
    playerVitalState.subscribe,
    playerVitalState.getEquipment,
    playerVitalState.getEquipment,
  );
}

// -----------------------------------------------------------------------------
// Helper: Convert InventorySlot to InventoryItem for HUD
// -----------------------------------------------------------------------------

export function toInventoryItem(slot: InventorySlot): InventoryItem | null {
  if (!slot.itemId || slot.quantity <= 0) return null;
  
  const def = slot.itemDef ?? getItemDefinition(slot.itemId);
  if (!def) return null;
  
  return {
    id: slot.itemId,
    name: def.name,
    quantity: slot.quantity,
    icon: def.ico,
    slotIndex: slot.index,
    category: def.category,
    stackable: def.maxStack > 1,
  };
}

export function toInventoryItems(slots: InventorySlot[]): InventoryItem[] {
  return slots
    .map(toInventoryItem)
    .filter((item): item is InventoryItem => item !== null);
}

// -----------------------------------------------------------------------------
// Helper: Extract vitals from heartbeat payload (Deterministic)
// -----------------------------------------------------------------------------

export interface VitalsExtraction {
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
  stamina?: number;
  maxStamina?: number;
  xp?: number;
  maxXp?: number;
  level?: number;
}

export function extractVitalsFromPayload(payload: any): VitalsExtraction {
  // Try various payload structures
  const self = payload?.self ?? payload;
  
  // Direct fields
  const result: VitalsExtraction = {};
  
  if (typeof self?.hp === "number") result.hp = self.hp;
  if (typeof self?.maxHp === "number") result.maxHp = self.maxHp;
  if (typeof self?.max_hp === "number") result.maxHp = self.max_hp;
  
  if (typeof self?.mana === "number") result.mana = self.mana;
  if (typeof self?.maxMana === "number") result.maxMana = self.maxMana;
  if (typeof self?.max_mana === "number") result.maxMana = self.max_mana;
  
  if (typeof self?.stamina === "number") result.stamina = self.stamina;
  if (typeof self?.maxStamina === "number") result.maxStamina = self.maxStamina;
  
  if (typeof self?.xp === "number") result.xp = self.xp;
  if (typeof self?.maxXp === "number") result.maxXp = self.maxXp;
  if (typeof self?.experience === "number") result.xp = self.experience;
  
  if (typeof self?.level === "number") result.level = self.level;
  
  // Nested stats object
  const stats = self?.stats ?? self?.attributes ?? self?.vitals;
  if (stats) {
    if (typeof stats.hp === "number" && result.hp === undefined) result.hp = stats.hp;
    if (typeof stats.maxHp === "number" && result.maxHp === undefined) result.maxHp = stats.maxHp;
    if (typeof stats.mana === "number" && result.mana === undefined) result.mana = stats.mana;
    if (typeof stats.maxMana === "number" && result.maxMana === undefined) result.maxMana = stats.maxMana;
    if (typeof stats.stamina === "number" && result.stamina === undefined) result.stamina = stats.stamina;
    if (typeof stats.xp === "number" && result.xp === undefined) result.xp = stats.xp;
    if (typeof stats.level === "number" && result.level === undefined) result.level = stats.level;
  }
  
  return result;
}