/**
 * OUROBOROS SYSTEMIC EMERGENCE: NPC Inventory Manager
 * 
 * Provides deterministic inventory management for NPCs.
 * NPCs use the same inventory system as players - no special treatment.
 * 
 * Conservation Axiom: Every item in NPC inventory is a real, tracked item.
 * NPCs can gather, craft, store, and use items just like players.
 */

import { AREGuard } from '../../core/are/AREGuard.js';
import { ItemRegistry } from '../inventory/ItemRegistry.js';
import { normalizeInventoryStacks } from '../inventory/inventoryStacks.js';

export interface NPCInventorySlot {
  id: string;
  quantity: number;
  [key: string]: unknown;
}

export interface NPCInventoryState {
  slots: (NPCInventorySlot | null)[];
  maxSlots: number;
  currentWeight: number;
  maxWeight: number;
}

export interface NPCInventoryManager {
  getInventory(npcId: string): NPCInventoryState | undefined;
  addItem(npcId: string, itemId: string, quantity: number): { success: boolean; reason?: string };
  removeItem(npcId: string, itemId: string, quantity: number): { success: boolean; item?: NPCInventorySlot; reason?: string };
  hasItem(npcId: string, itemId: string, amount: number): boolean;
  countItem(npcId: string, itemId: string): number;
  getItemCount(npcId: string): number;
}

const DEFAULT_NPC_INVENTORY_SLOTS = 12;
const DEFAULT_NPC_INVENTORY_WEIGHT = 50;

export class NPCInventoryManager {
  private static instance: NPCInventoryManager;
  private inventories: Map<string, NPCInventoryState> = new Map();

  private constructor() {}

  public static getInstance(): NPCInventoryManager {
    if (!NPCInventoryManager.instance) {
      NPCInventoryManager.instance = new NPCInventoryManager();
    }
    return NPCInventoryManager.instance;
  }

  /**
   * Initialize inventory for a new NPC.
   */
  public initializeNPC(npcId: string, maxSlots: number = DEFAULT_NPC_INVENTORY_SLOTS): NPCInventoryState {
    return AREGuard.executeProtected(() => {
      if (this.inventories.has(npcId)) {
        return this.inventories.get(npcId)!;
      }

      const inventory: NPCInventoryState = {
        slots: new Array(maxSlots).fill(null),
        maxSlots,
        currentWeight: 0,
        maxWeight: DEFAULT_NPC_INVENTORY_WEIGHT,
      };

      this.inventories.set(npcId, inventory);
      return inventory;
    });
  }

  /**
   * Get NPC inventory.
   */
  public getInventory(npcId: string): NPCInventoryState | undefined {
    return this.inventories.get(npcId);
  }

  /**
   * Add item to NPC inventory.
   */
  public addItem(npcId: string, itemId: string, quantity: number): { success: boolean; reason?: string } {
    return AREGuard.executeProtected(() => {
      let inventory = this.inventories.get(npcId);
      if (!inventory) {
        inventory = this.initializeNPC(npcId);
      }

      const slots = inventory.slots;

      // Try to stack with existing item first
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot && slot.id === itemId) {
          slot.quantity += quantity;
          normalizeInventoryStacks({ inventory: slots } as unknown as { inventory: (NPCInventorySlot | null)[] });
          return { success: true };
        }
      }

      // Find empty slot
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === null) {
          const instance = ItemRegistry.createInstance(itemId, quantity);
          if (instance) {
            slots[i] = { id: instance.id, quantity: quantity, ...instance };
          } else {
            slots[i] = { id: itemId, quantity };
          }
          normalizeInventoryStacks({ inventory: slots } as unknown as { inventory: (NPCInventorySlot | null)[] });
          return { success: true };
        }
      }

      return { success: false, reason: 'INVENTORY_FULL' };
    });
  }

  /**
   * Remove item from NPC inventory.
   */
  public removeItem(
    npcId: string,
    itemId: string,
    quantity: number
  ): { success: boolean; item?: NPCInventorySlot; reason?: string } {
    return AREGuard.executeProtected(() => {
      const inventory = this.inventories.get(npcId);
      if (!inventory) {
        return { success: false, reason: 'INVENTORY_NOT_FOUND' };
      }

      const slots = inventory.slots;

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot && slot.id === itemId) {
          if (slot.quantity < quantity) {
            return { success: false, reason: 'INSUFFICIENT_QUANTITY' };
          }

          if (slot.quantity === quantity) {
            slots[i] = null;
          } else {
            slot.quantity -= quantity;
          }

          normalizeInventoryStacks({ inventory: slots } as unknown as { inventory: (NPCInventorySlot | null)[] });
          return { success: true, item: { id: itemId, quantity } };
        }
      }

      return { success: false, reason: 'ITEM_NOT_FOUND' };
    });
  }

  /**
   * Check if NPC has item in sufficient quantity.
   */
  public hasItem(npcId: string, itemId: string, amount: number): boolean {
    return this.countItem(npcId, itemId) >= amount;
  }

  /**
   * Count specific item in NPC inventory.
   */
  public countItem(npcId: string, itemId: string): number {
    const inventory = this.inventories.get(npcId);
    if (!inventory) return 0;

    let count = 0;
    for (const slot of inventory.slots) {
      if (slot && slot.id === itemId) {
        count += slot.quantity;
      }
    }
    return count;
  }

  /**
   * Get total item count in NPC inventory.
   */
  public getItemCount(npcId: string): number {
    const inventory = this.inventories.get(npcId);
    if (!inventory) return 0;

    let count = 0;
    for (const slot of inventory.slots) {
      if (slot) {
        count += slot.quantity;
      }
    }
    return count;
  }

  /**
   * Get all items in NPC inventory as array.
   */
  public getAllItems(npcId: string): NPCInventorySlot[] {
    const inventory = this.inventories.get(npcId);
    if (!inventory) return [];

    const items: NPCInventorySlot[] = [];
    for (const slot of inventory.slots) {
      if (slot) {
        items.push(slot);
      }
    }
    return items;
  }

  /**
   * Clear NPC inventory (for reset/decomposition).
   */
  public clearInventory(npcId: string): boolean {
    return this.inventories.delete(npcId);
  }

  /**
   * Get inventory count.
   */
  public getInventoryCount(): number {
    return this.inventories.size;
  }

  /**
   * Get all NPC IDs with initialized inventories.
   */
  public getAllNPCIds(): string[] {
    return Array.from(this.inventories.keys());
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────

export const npcInventoryManager = NPCInventoryManager.getInstance();
