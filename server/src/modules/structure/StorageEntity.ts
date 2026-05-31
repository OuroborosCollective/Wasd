/**
 * OUROBOROS SYSTEMIC EMERGENCE: StorageEntity System
 * 
 * Container Counterpart for KAPPA-Grid Entities
 * 
 * Axiom der Erhaltung (Conservation Axiom):
 * Storage entities are world objects with their own InventoryState.
 * They exist on the KAPPA-grid and can be interacted with by NPCs
 * and players. When an NPC crafts a chest, a STORAGE entity is created
 * at the NPC's location.
 * 
 * Storage entities are deterministic world objects that:
 * - Have their own inventory (InventoryState)
 * - Exist at a KAPPA-grid position
 * - Can be opened/closed by NPCs and players
 * - Track ownership for persistence
 */

import { AREGuard } from '../../core/are/AREGuard.js';
import { AREHash } from '../../core/are/AREHash.js';
import { toKappa } from '../../core/are/Kappa.js';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface InventorySlot {
  id: string;
  quantity: number;
  [key: string]: unknown;
}

export interface InventoryState {
  slots: (InventorySlot | null)[];
  maxSlots: number;
  currentWeight: number;
  maxWeight: number;
}

export type StorageTier = 'basic' | 'advanced' | 'reinforced';

export interface StorageEntityConfig {
  id: string;
  ownerId: string;
  position: Position;
  storageType: StorageTier;
  maxSlots: number;
  maxWeight: number;
  glbPath?: string;
}

export interface StorageEntity {
  entityId: string;
  entityType: 'STORAGE';
  ownerId: string;
  position: Position;
  storageType: StorageTier;
  inventory: InventoryState;
  createdTick: number;
  lastAccessedTick: number;
  glbPath?: string;
  locked: boolean;
}

// Storage tier configurations
const STORAGE_TIER_CONFIG: Record<StorageTier, { maxSlots: number; maxWeight: number }> = {
  basic: { maxSlots: 12, maxWeight: 50 },
  advanced: { maxSlots: 24, maxWeight: 100 },
  reinforced: { maxSlots: 48, maxWeight: 200 },
};

// Default GLB paths by storage type
const DEFAULT_GLB_PATHS: Record<StorageTier, string> = {
  basic: '/models/structures/chest_wooden.glb',
  advanced: '/models/structures/chest_iron.glb',
  reinforced: '/models/structures/chest_reinforced.glb',
};

export class StorageEntityManager {
  private static instance: StorageEntityManager;
  private storageEntities: Map<string, StorageEntity> = new Map();
  
  // Grid-based spatial index for proximity queries
  private gridIndex: Map<string, Set<string>> = new Map();

  private constructor() {}

  public static getInstance(): StorageEntityManager {
    if (!StorageEntityManager.instance) {
      StorageEntityManager.instance = new StorageEntityManager();
    }
    return StorageEntityManager.instance;
  }

  /**
   * Generate a deterministic entity ID.
   */
  private generateEntityId(ownerId: string, storageType: StorageTier, tick: number): string {
    const hash = AREHash.generate({ ownerId, storageType, tick });
    return `storage:${ownerId}:${hash.toString(16).substring(0, 8)}`;
  }

  /**
   * Get grid key for position (KAPPA-aligned).
   */
  private getGridKey(position: Position): string {
    const kx = toKappa(position.x);
    const ky = toKappa(position.y);
    return `${kx}:${ky}`;
  }

  /**
   * Index entity in spatial grid.
   */
  private indexEntity(entity: StorageEntity): void {
    const key = this.getGridKey(entity.position);
    let cell = this.gridIndex.get(key);
    if (!cell) {
      cell = new Set();
      this.gridIndex.set(key, cell);
    }
    cell.add(entity.entityId);
  }

  /**
   * Remove entity from spatial index.
   */
  private unindexEntity(entityId: string, position: Position): void {
    const key = this.getGridKey(position);
    const cell = this.gridIndex.get(key);
    if (cell) {
      cell.delete(entityId);
      if (cell.size === 0) {
        this.gridIndex.delete(key);
      }
    }
  }

  /**
   * Create a new storage entity.
   * Called after successful NPC crafting of a chest.
   */
  public createStorageEntity(
    ownerId: string,
    position: Position,
    storageType: StorageTier,
    tick: number
  ): StorageEntity {
    return AREGuard.executeProtected(() => {
      const config = STORAGE_TIER_CONFIG[storageType];
      const entityId = this.generateEntityId(ownerId, storageType, tick);

      if (this.storageEntities.has(entityId)) {
        const existing = this.storageEntities.get(entityId)!;
        return existing;
      }

      const entity: StorageEntity = {
        entityId,
        entityType: 'STORAGE',
        ownerId,
        position: { ...position },
        storageType,
        inventory: {
          slots: new Array(config.maxSlots).fill(null),
          maxSlots: config.maxSlots,
          currentWeight: 0,
          maxWeight: config.maxWeight,
        },
        createdTick: tick,
        lastAccessedTick: tick,
        glbPath: DEFAULT_GLB_PATHS[storageType],
        locked: false,
      };

      AREGuard.assertNoFloats(entity);
      this.storageEntities.set(entityId, entity);
      this.indexEntity(entity);

      return entity;
    });
  }

  /**
   * Get storage entity by ID.
   */
  public getStorageEntity(entityId: string): StorageEntity | null {
    return this.storageEntities.get(entityId) ?? null;
  }

  /**
   * Get all storage entities owned by an NPC/player.
   */
  public getStoragesByOwner(ownerId: string): StorageEntity[] {
    const result: StorageEntity[] = [];
    for (const entity of this.storageEntities.values()) {
      if (entity.ownerId === ownerId) {
        result.push(entity);
      }
    }
    return result;
  }

  /**
   * Find storage entities within KAPPA-distance radius.
   * Used for NPC storage actions.
   */
  public findStoragesInRadius(
    position: Position,
    radiusKappa: number,
    ownerId?: string
  ): StorageEntity[] {
    const kx = toKappa(position.x);
    const ky = toKappa(position.y);
    const kr = Math.abs(radiusKappa);

    const result: StorageEntity[] = [];

    for (const entity of this.storageEntities.values()) {
      if (ownerId && entity.ownerId !== ownerId) continue;
      
      const ex = toKappa(entity.position.x);
      const ey = toKappa(entity.position.y);
      
      const dx = Math.abs(ex - kx);
      const dy = Math.abs(ey - ky);
      
      if (dx <= kr && dy <= kr) {
        result.push(entity);
      }
    }

    return result;
  }

  /**
   * Add item to storage entity.
   */
  public addItemToStorage(
    entityId: string,
    itemId: string,
    quantity: number,
    tick: number
  ): { success: boolean; reason?: string } {
    return AREGuard.executeProtected(() => {
      const entity = this.storageEntities.get(entityId);
      if (!entity) {
        return { success: false, reason: 'STORAGE_NOT_FOUND' };
      }

      const slots = entity.inventory.slots;

      // Try to stack with existing item first
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot && slot.id === itemId) {
          slot.quantity += quantity;
          entity.lastAccessedTick = tick;
          return { success: true };
        }
      }

      // Find empty slot
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === null) {
          slots[i] = { id: itemId, quantity };
          entity.lastAccessedTick = tick;
          return { success: true };
        }
      }

      return { success: false, reason: 'STORAGE_FULL' };
    });
  }

  /**
   * Remove item from storage entity.
   */
  public removeItemFromStorage(
    entityId: string,
    itemId: string,
    quantity: number,
    tick: number
  ): { success: boolean; item?: InventorySlot; reason?: string } {
    return AREGuard.executeProtected(() => {
      const entity = this.storageEntities.get(entityId);
      if (!entity) {
        return { success: false, reason: 'STORAGE_NOT_FOUND' };
      }

      const slots = entity.inventory.slots;

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

          entity.lastAccessedTick = tick;
          return { success: true, item: { id: itemId, quantity } };
        }
      }

      return { success: false, reason: 'ITEM_NOT_FOUND' };
    });
  }

  /**
   * Open storage entity (update lastAccessedTick).
   */
  public openStorage(entityId: string, tick: number): boolean {
    const entity = this.storageEntities.get(entityId);
    if (!entity) return false;
    entity.lastAccessedTick = tick;
    return true;
  }

  /**
   * Lock/unlock storage entity.
   */
  public setStorageLocked(entityId: string, locked: boolean): boolean {
    const entity = this.storageEntities.get(entityId);
    if (!entity) return false;
    entity.locked = locked;
    return true;
  }

  /**
   * Destroy storage entity.
   */
  public destroyStorageEntity(entityId: string): boolean {
    const entity = this.storageEntities.get(entityId);
    if (!entity) return false;

    this.unindexEntity(entityId, entity.position);
    this.storageEntities.delete(entityId);
    return true;
  }

  /**
   * Get all storage entities as array (for serialization).
   */
  public getAllStorageEntities(): StorageEntity[] {
    return Array.from(this.storageEntities.values());
  }

  /**
   * Get count of storage entities.
   */
  public getStorageCount(): number {
    return this.storageEntities.size;
  }

  /**
   * Reset (for testing).
   */
  public reset(): void {
    this.storageEntities.clear();
    this.gridIndex.clear();
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────

export const storageEntityManager = StorageEntityManager.getInstance();
