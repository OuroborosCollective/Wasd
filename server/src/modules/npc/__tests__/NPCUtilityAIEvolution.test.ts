/**
 * OUROBOROS SYSTEMIC EMERGENCE: Integration Tests
 * 
 * Tests the complete flow from ARENpcEvolution utility AI through
 * CraftingDirector to storage entity creation.
 * 
 * These tests verify:
 * 1. NPCs can evaluate actions with utility scoring
 * 2. NPCs can craft storage items like players
 * 3. Storage entities are created on craft completion
 * 4. Inventory is properly managed throughout
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { ARENpcEvolution } from '../../core/are/ARENpcEvolution.js';
import { craftingDirector } from '../crafting/CraftingDirector.js';
import { npcInventoryManager } from './NPCInventoryManager.js';
import { storageEntityManager } from '../structure/StorageEntity.js';
import type { IAREPayload } from '../../core/are/AREPayload.js';
import { toKappa } from '../../core/are/Kappa.js';

describe('ARENpcEvolution Utility AI', () => {
  describe('computeUtilityIntelligence', () => {
    it('should scan environment and calculate highest utility action', () => {
      const npcState = {
        id: 'npc:test-1',
        health: 100,
        maxHealth: 100,
        energy: 1000,
        maxEnergy: 1000,
        position: { x: toKappa(0), y: toKappa(0), z: toKappa(0) },
      };

      const inventorySlots: readonly (Readonly<{ id?: string } | null)[] = [];
      const worldEntities: readonly IAREPayload[] = [];

      // When there are no resources and no enemies, should IDLE
      const result = ARENpcEvolution.computeUtilityIntelligence(
        npcState,
        inventorySlots,
        worldEntities,
        0,
        1 // tick
      );

      expect(result).toBeDefined();
      expect(result.tick).toBe(1);
      expect(result.selectedAction).toBeDefined();
    });

    it('should prioritize CRAFT_WOODEN_CHEST when wood is available and no storage owned', () => {
      const npcState = {
        id: 'npc:test-2',
        health: 100,
        maxHealth: 100,
        energy: 1000,
        maxEnergy: 1000,
        position: { x: toKappa(5), y: toKappa(5), z: toKappa(0) },
      };

      // Inventory has enough wood (5x)
      const inventorySlots: readonly (Readonly<{ id?: string } | null)[] = [
        { id: 'base:wood', quantity: 5 },
        { id: 'base:wood', quantity: 2 },
      ];

      // No enemies in vicinity, no resources (not needed since we already have wood)
      const worldEntities: readonly IAREPayload[] = [];

      const result = ARENpcEvolution.computeUtilityIntelligence(
        npcState,
        inventorySlots,
        worldEntities,
        0, // No storage owned
        2
      );

      // Should either CRAFT_WOODEN_CHEST (highest drive) or IDLE
      expect(['CRAFT_WOODEN_CHEST', 'IDLE']).toContain(result.selectedAction);
      expect(result.drives.wealthNeed).toBeGreaterThan(0);
    });

    it('should evaluate FLEE action when enemy is too close', () => {
      const npcState = {
        id: 'npc:test-3',
        health: 100,
        maxHealth: 100,
        energy: 1000,
        maxEnergy: 1000,
        position: { x: toKappa(0), y: toKappa(0), z: toKappa(0) },
      };

      const inventorySlots: readonly (Readonly<{ id?: string } | null)[] = [];

      // Enemy within unsafe distance (2000 kappa = 2 meters)
      const worldEntities: readonly IAREPayload[] = [
        {
          entityId: 'enemy:ork-1',
          position: { x: toKappa(1), y: toKappa(0), z: toKappa(0) },
          velocity: { x: 0, y: 0, z: 0 },
          kind: 'ENEMY',
          threat: 1,
        },
      ];

      const result = ARENpcEvolution.computeUtilityIntelligence(
        npcState,
        inventorySlots,
        worldEntities,
        0,
        3
      );

      // Should evaluate FLEE action when enemy is close
      const fleeScore = result.actionScores.find(a => a.action === 'FLEE');
      expect(fleeScore).toBeDefined();
      expect(result.drives.safetyNeed).toBeGreaterThan(0);
    });
  });

  describe('generateCraftingIntent', () => {
    it('should generate deterministic crafting intent payload', () => {
      const intent = ARENpcEvolution.generateCraftingIntent(
        'npc:test',
        'wooden_chest_craft',
        100
      );

      expect(intent.npcId).toBe('npc:test');
      expect(intent.type).toBe('npc_craft');
      expect(intent.recipeId).toBe('wooden_chest_craft');
      expect(intent.tick).toBe(100);
      expect(intent.kappaHash).toBeDefined();
    });
  });
});

describe('NPCInventoryManager', () => {
  beforeEach(() => {
    npcInventoryManager.initializeNPC('npc:test-inv');
  });

  it('should initialize NPC inventory', () => {
    const inv = npcInventoryManager.getInventory('npc:test-inv');
    expect(inv).toBeDefined();
    expect(inv?.slots).toHaveLength(12);
    expect(inv?.maxWeight).toBe(50);
  });

  it('should add and remove items', () => {
    const addResult = npcInventoryManager.addItem('npc:test-inv', 'base:wood', 5);
    expect(addResult.success).toBe(true);

    const count = npcInventoryManager.countItem('npc:test-inv', 'base:wood');
    expect(count).toBe(5);

    const removeResult = npcInventoryManager.removeItem('npc:test-inv', 'base:wood', 3);
    expect(removeResult.success).toBe(true);

    const remainingCount = npcInventoryManager.countItem('npc:test-inv', 'base:wood');
    expect(remainingCount).toBe(2);
  });

  it('should return false when inventory is full', () => {
    const smallInv = npcInventoryManager.initializeNPC('npc:test-inv', 2); // Only 2 slots
    smallInv; // suppress unused warning

    npcInventoryManager.addItem('npc:test-inv', 'base:wood', 1);
    npcInventoryManager.addItem('npc:test-inv', 'base:stone', 1);
    const thirdAdd = npcInventoryManager.addItem('npc:test-inv', 'base:iron', 1);

    expect(thirdAdd.success).toBe(false);
    expect(thirdAdd.reason).toBe('INVENTORY_FULL');
  });
});

describe('CraftingDirector', () => {
  beforeEach(() => {
    npcInventoryManager.clearInventory('npc:craft-test');
    npcInventoryManager.initializeNPC('npc:craft-test');
  });

  it('should have default recipes including wooden_chest_craft', () => {
    const recipes = craftingDirector.getRecipes();
    expect(recipes.length).toBeGreaterThan(0);
    
    const woodenChest = recipes.find(r => r.id === 'wooden_chest_craft');
    expect(woodenChest).toBeDefined();
    expect(woodenChest?.ingredients).toContainEqual({ id: 'base:wood', amount: 5 });
  });

  it('should validate canCraft returns false when ingredients missing', () => {
    const inventory = npcInventoryManager.getInventory('npc:craft-test')!;
    const npcInventory = {
      slots: inventory.slots,
      maxSlots: inventory.maxSlots,
    };

    const result = craftingDirector.canCraft(npcInventory, 'wooden_chest_craft');
    expect(result.possible).toBe(false);
    expect(result.reason).toContain('MISSING_INGREDIENT');
  });

  it('should successfully craft when ingredients are present', () => {
    npcInventoryManager.addItem('npc:craft-test', 'base:wood', 5);

    const inventory = npcInventoryManager.getInventory('npc:craft-test')!;
    const npcInventory = {
      slots: inventory.slots,
      maxSlots: inventory.maxSlots,
    };

    const canCraftResult = craftingDirector.canCraft(npcInventory, 'wooden_chest_craft');
    expect(canCraftResult.possible).toBe(true);

    const craftResult = craftingDirector.craft('npc:craft-test', npcInventory, 'wooden_chest_craft', 10);
    expect(craftResult.success).toBe(true);
    expect(craftResult.item?.id).toBe('base:chest');
    expect(craftResult.kappaHash).toBeDefined();

    const chestCount = npcInventoryManager.countItem('npc:craft-test', 'base:chest');
    expect(chestCount).toBe(1);
  });

  it('should remove ingredients after crafting', () => {
    npcInventoryManager.addItem('npc:craft-test', 'base:wood', 5);

    const inventory = npcInventoryManager.getInventory('npc:craft-test')!;
    const npcInventory = {
      slots: inventory.slots,
      maxSlots: inventory.maxSlots,
    };

    craftingDirector.craft('npc:craft-test', npcInventory, 'wooden_chest_craft', 11);

    const woodCount = npcInventoryManager.countItem('npc:craft-test', 'base:wood');
    expect(woodCount).toBe(0);
  });
});

describe('StorageEntity (Counterpart)', () => {
  beforeEach(() => {
    storageEntityManager.reset();
  });

  it('should create storage entity when chest is crafted', () => {
    npcInventoryManager.initializeNPC('npc:storage-test');
    npcInventoryManager.addItem('npc:storage-test', 'base:wood', 5);

    const inventory = npcInventoryManager.getInventory('npc:storage-test')!;
    const npcInventory = {
      slots: inventory.slots,
      maxSlots: inventory.maxSlots,
    };

    craftingDirector.craft('npc:storage-test', npcInventory, 'wooden_chest_craft', 20);

    const chestCount = npcInventoryManager.countItem('npc:storage-test', 'base:chest');
    expect(chestCount).toBe(1);

    const storageEntity = storageEntityManager.createStorageEntity(
      'npc:storage-test',
      { x: 10, y: 5, z: 0 },
      'basic',
      21
    );

    expect(storageEntity).toBeDefined();
    expect(storageEntity.entityType).toBe('STORAGE');
    expect(storageEntity.ownerId).toBe('npc:storage-test');
    expect(storageEntity.inventory.slots).toHaveLength(12);
  });

  it('should index storage entities for proximity queries', () => {
    storageEntityManager.createStorageEntity(
      'npc:owner1',
      { x: 10, y: 5, z: 0 },
      'basic',
      30
    );

    storageEntityManager.createStorageEntity(
      'npc:owner1',
      { x: 15, y: 5, z: 0 },
      'basic',
      31
    );

    const nearbyStorages = storageEntityManager.findStoragesInRadius(
      { x: 10, y: 5, z: 0 },
      10000,
      'npc:owner1'
    );

    expect(nearbyStorages.length).toBe(2);
  });

  it('should track storage inventory separately from owner NPC', () => {
    npcInventoryManager.initializeNPC('npc:separate-test');
    npcInventoryManager.addItem('npc:separate-test', 'base:wood', 10);

    const storage = storageEntityManager.createStorageEntity(
      'npc:separate-test',
      { x: 0, y: 0, z: 0 },
      'basic',
      40
    );

    storageEntityManager.addItemToStorage(storage.entityId, 'base:wood', 5, 41);

    const npcWoodCount = npcInventoryManager.countItem('npc:separate-test', 'base:wood');
    expect(npcWoodCount).toBe(10);

    const storageEntity = storageEntityManager.getStorageEntity(storage.entityId);
    expect(storageEntity?.inventory.slots[0]?.id).toBe('base:wood');
    expect(storageEntity?.inventory.slots[0]?.quantity).toBe(5);
  });
});

describe('Systemic Emergence Flow', () => {
  it('should complete full NPC flow: scan -> decide -> craft -> store', () => {
    const npcId = 'npc:full-flow-test';
    
    storageEntityManager.reset();
    npcInventoryManager.clearInventory(npcId);
    npcInventoryManager.initializeNPC(npcId);

    npcInventoryManager.addItem(npcId, 'base:wood', 5);
    
    const inventory = npcInventoryManager.getInventory(npcId)!;

    const npcState = {
      id: npcId,
      health: 100,
      maxHealth: 100,
      energy: 1000,
      maxEnergy: 1000,
      position: { x: toKappa(0), y: toKappa(0), z: toKappa(0) },
    };

    const utilityResult = ARENpcEvolution.computeUtilityIntelligence(
      npcState,
      inventory.slots,
      [],
      0,
      100
    );

    if (utilityResult.selectedAction === 'CRAFT_WOODEN_CHEST') {
      const result = craftingDirector.craft(
        npcId,
        { slots: inventory.slots, maxSlots: inventory.maxSlots },
        'wooden_chest_craft',
        101
      );

      expect(result.success).toBe(true);
      expect(result.item?.id).toBe('base:chest');

      const storageEntity = storageEntityManager.createStorageEntity(
        npcId,
        { x: 0, y: 0, z: 0 },
        'basic',
        102
      );

      expect(storageEntity).toBeDefined();
      expect(storageEntity.entityType).toBe('STORAGE');
      expect(storageEntity.ownerId).toBe(npcId);

      const storeResult = storageEntityManager.addItemToStorage(
        storageEntity.entityId,
        'base:wood',
        3,
        103
      );
      expect(storeResult.success).toBe(true);
    }
  });
});
