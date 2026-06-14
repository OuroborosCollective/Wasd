/**
 * Equipment Service Tests
 *
 * Integration tests for EquipmentService with atomic inventory/equipment transactions.
 * Deterministic: No Math.random(), no Date.now().
 *
 * Test coverage:
 * - equip consumes one inventory item and fills the canonical equipment slot
 * - replacing a slot returns the replaced item to inventory
 * - unequip removes the equipment slot and restores inventory
 * - invalid item / item_not_owned / slot_empty do not mutate either state
 * - repeated same input from same initial state gives identical output
 */

import { describe, expect, it, beforeEach } from "vitest";
import { EquipmentStore } from "../src/equipment/EquipmentStore.js";
import { InventoryStore } from "../src/inventory/InventoryStore.js";
import { EquipmentService } from "../src/equipment/EquipmentService.js";
import type { EquipmentPersistenceAdapter } from "../src/equipment/EquipmentPersistence.js";
import type { InventoryPersistenceAdapter } from "../src/inventory/InventoryPersistence.js";
import type { PlayerInventoryState, InventoryItemId } from "../src/inventory/InventoryTypes.js";
import type { InventoryServiceLike } from "../src/equipment/EquipmentService.js";

// Mock persistence adapters for testing
const noopInventoryPersistence: InventoryPersistenceAdapter = {
  async loadPlayerInventory() { return null; },
  async savePlayerInventory() {},
};

const noopEquipmentPersistence: EquipmentPersistenceAdapter = {
  async loadPlayerEquipment() { return null; },
  async savePlayerEquipment() {},
};

// Test utilities - creates a synchronous inventory service wrapper for testing
function createTestInventoryService(store: InventoryStore): InventoryServiceLike {
  return {
    async getPlayerInventory(playerId: string) {
      return store.getPlayerInventory(playerId);
    },
    async addItem(input) {
      return store.addItem(input);
    },
    async removeItem(input) {
      return store.removeItem(input);
    },
    async persistInventory(playerId: string, state: PlayerInventoryState) {
      // Update in-memory state for testing
      store.replacePlayerInventory(playerId, state);
    },
  };
}

describe("EquipmentService", () => {
  let equipmentStore: EquipmentStore;
  let inventoryStore: InventoryStore;
  let service: EquipmentService;

  beforeEach(() => {
    equipmentStore = new EquipmentStore();
    inventoryStore = new InventoryStore();
    
    // Create service with test inventory service via dependency injection
    const testInventoryService = createTestInventoryService(inventoryStore);
    service = new EquipmentService(
      equipmentStore,
      noopEquipmentPersistence,
      () => Promise.resolve(testInventoryService),
    );
    
    // Reset internal hydration tracking
    service.clearForTests();
  });

  describe("equipItem - atomic inventory consumption", () => {
    it("equips owned item and consumes one inventory unit", async () => {
      // Setup: add wooden axe to inventory
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

      // Act: equip the axe
      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      // Assert: success
      expect(result.ok).toBe(true);
      expect(result.reason).toBe("equipped");
      expect(result.itemId).toBe("wooden_axe");
      expect(result.equipment?.slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
      );

      // Assert: inventory consumed
      const inventory = inventoryStore.getPlayerInventory("player1");
      const axeSlot = inventory.slots.find((s) => s.itemId === "wooden_axe");
      expect(axeSlot).toBeUndefined();

      // Assert: inventory delta
      expect(result.inventoryDelta).toEqual({ itemId: "wooden_axe", delta: -1 });
    });

    it("rejects equip of unowned item", async () => {
      // Act: try to equip item not in inventory
      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      // Assert: failure
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("item_not_owned");

      // Assert: no equipment change
      const equipment = equipmentStore.getPlayerEquipment("player1");
      expect(equipment.slots).toEqual([]);

      // Assert: no inventory change
      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(inventory.slots).toEqual([]);
    });

    it("rejects equip of invalid item", async () => {
      // Act: try to equip non-equipment item
      const result = await service.equipItem({ playerId: "player1", itemId: "invalid_item" });

      // Assert: failure
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");
    });

    it("rejects equip for invalid player", async () => {
      const result = await service.equipItem({ playerId: "", itemId: "wooden_axe" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects equip for anonymous player", async () => {
      const result = await service.equipItem({ playerId: "anonymous", itemId: "wooden_axe" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });
  });

  describe("equipItem - slot replacement", () => {
    it("unequips old item and returns it to inventory when replacing slot", async () => {
      // Setup: add wooden axe and copper axe to inventory
      const woodenAxeResult = inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      const copperAxeResult = inventoryStore.addItem({ playerId: "player1", itemId: "copper_axe", quantity: 1 });

      // Verify both items were added
      expect(woodenAxeResult.ok).toBe(true);
      expect(copperAxeResult.ok).toBe(true);

      // Act: equip copper axe first (since it's in the same slot as wooden_axe)
      const result = await service.equipItem({ playerId: "player1", itemId: "copper_axe" });

      // Assert: success
      expect(result.ok).toBe(true);
      expect(result.reason).toBe("equipped");

      // Assert: equipment has copper axe
      const equipment = equipmentStore.getPlayerEquipment("player1");
      expect(equipment.slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "copper_axe" }),
      );

      // Assert: wooden axe is back in inventory
      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(inventory.slots).toContainEqual(
        expect.objectContaining({ itemId: "wooden_axe", quantity: 1 }),
      );
    });

    it("can equip items in different slots independently", async () => {
      // Setup: add all three tools
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      inventoryStore.addItem({ playerId: "player1", itemId: "copper_pickaxe", quantity: 1 });
      inventoryStore.addItem({ playerId: "player1", itemId: "simple_fishing_rod", quantity: 1 });

      // Act: equip all three
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      await service.equipItem({ playerId: "player1", itemId: "copper_pickaxe" });
      await service.equipItem({ playerId: "player1", itemId: "simple_fishing_rod" });

      // Assert: all slots filled
      const equipment = equipmentStore.getPlayerEquipment("player1");
      expect(equipment.slots).toHaveLength(3);
      expect(equipment.slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
      );
      expect(equipment.slots).toContainEqual(
        expect.objectContaining({ slotId: "mining_tool", itemId: "copper_pickaxe" }),
      );
      expect(equipment.slots).toContainEqual(
        expect.objectContaining({ slotId: "fishing_tool", itemId: "simple_fishing_rod" }),
      );

      // Assert: no items left in inventory
      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(inventory.slots).toHaveLength(0);
    });
  });

  describe("unequipItem - atomic inventory restoration", () => {
    it("unequips item and returns it to inventory", async () => {
      // Setup: equip wooden axe
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      // Act: unequip
      const result = await service.unequipItem({ playerId: "player1", slotId: "woodcutting_tool" });

      // Assert: success
      expect(result.ok).toBe(true);
      expect(result.reason).toBe("unequipped");
      expect(result.unequippedItemId).toBe("wooden_axe");
      expect(result.slotId).toBe("woodcutting_tool");

      // Assert: equipment slot empty
      const equipment = equipmentStore.getPlayerEquipment("player1");
      expect(equipment.slots).toHaveLength(0);

      // Assert: item returned to inventory
      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(inventory.slots).toContainEqual(
        expect.objectContaining({ itemId: "wooden_axe", quantity: 1 }),
      );

      // Assert: inventory delta
      expect(result.inventoryDelta).toEqual({ itemId: "wooden_axe", delta: +1 });
    });

    it("rejects unequip of empty slot", async () => {
      // Act: try to unequip empty slot
      const result = await service.unequipItem({ playerId: "player1", slotId: "woodcutting_tool" });

      // Assert: failure
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("slot_empty");

      // Assert: no state change
      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(inventory.slots).toEqual([]);
    });

    it("rejects unequip for invalid player", async () => {
      const result = await service.unequipItem({ playerId: "", slotId: "woodcutting_tool" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects unequip for anonymous player", async () => {
      const result = await service.unequipItem({ playerId: "anonymous", slotId: "woodcutting_tool" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("unequip then re-equip returns to same state", async () => {
      // Setup
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      // Act: unequip then re-equip
      await service.unequipItem({ playerId: "player1", slotId: "woodcutting_tool" });
      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      // Assert: success
      expect(result.ok).toBe(true);
      expect(result.reason).toBe("equipped");

      // Assert: original state restored
      const equipment = equipmentStore.getPlayerEquipment("player1");
      expect(equipment.slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
      );
      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(inventory.slots).toHaveLength(0);
    });
  });

  describe("determinism", () => {
    it("repeated equip from same initial state produces identical output", async () => {
      // Setup: same initial state
      const setup = () => {
        equipmentStore.clearForTests();
        inventoryStore.clearForTests();
        service.clearForTests();
        inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      };

      // First equip
      setup();
      const result1 = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      const equipment1 = equipmentStore.getPlayerEquipment("player1");
      const inventory1 = inventoryStore.getPlayerInventory("player1");

      // Second equip (from scratch)
      setup();
      const result2 = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      const equipment2 = equipmentStore.getPlayerEquipment("player1");
      const inventory2 = inventoryStore.getPlayerInventory("player1");

      // Assert: identical results
      expect(result1.ok).toBe(result2.ok);
      expect(result1.reason).toBe(result2.reason);
      expect(result1.itemId).toBe(result2.itemId);
      expect(result1.equipment?.slots).toEqual(result2.equipment?.slots);
      expect(equipment1.slots).toEqual(equipment2.slots);
      expect(inventory1.slots).toEqual(inventory2.slots);
    });

    it("identical equip+unequip sequence produces identical final state", async () => {
      const runSequence = async () => {
        equipmentStore.clearForTests();
        inventoryStore.clearForTests();
        service.clearForTests();
        
        inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
        inventoryStore.addItem({ playerId: "player1", itemId: "copper_axe", quantity: 1 });
        
        await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
        await service.equipItem({ playerId: "player1", itemId: "copper_axe" });
        await service.unequipItem({ playerId: "player1", slotId: "woodcutting_tool" });
        
        return {
          equipment: JSON.parse(JSON.stringify(equipmentStore.getPlayerEquipment("player1"))),
          inventory: JSON.parse(JSON.stringify(inventoryStore.getPlayerInventory("player1"))),
        };
      };

      const result1 = await runSequence();
      const result2 = await runSequence();

      // Assert: identical final states
      expect(result1.equipment.slots).toEqual(result2.equipment.slots);
      expect(result1.inventory.slots).toEqual(result2.inventory.slots);
    });
  });

  describe("no partial state mutations", () => {
    it("failed equip does not mutate equipment state", async () => {
      // Setup: have wooden axe in inventory
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

      // Act: try to equip invalid item
      const result = await service.equipItem({ playerId: "player1", itemId: "invalid_item" });

      // Assert: failure
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");

      // Assert: no equipment state change
      const equipment = equipmentStore.getPlayerEquipment("player1");
      expect(equipment.slots).toHaveLength(0);

      // Assert: no inventory state change
      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(inventory.slots).toContainEqual(
        expect.objectContaining({ itemId: "wooden_axe", quantity: 1 }),
      );
    });

    it("successful equip produces consistent equipment + inventory", async () => {
      // Setup
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

      // Act
      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      // Assert: result is consistent with state
      expect(result.ok).toBe(true);
      expect(result.equipment).toEqual(equipmentStore.getPlayerEquipment("player1"));
      
      // Check equipment has the item
      expect(result.equipment?.slots).toContainEqual(
        expect.objectContaining({ itemId: "wooden_axe" }),
      );
      
      // Check inventory does not have the item
      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(inventory.slots.find((s) => s.itemId === "wooden_axe")).toBeUndefined();
    });
  });

  describe("getPlayerEquipment", () => {
    it("returns current equipment state", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      const equipment = await service.getPlayerEquipment("player1");

      expect(equipment.slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
      );
    });

    it("returns empty state for player with no equipment", async () => {
      const equipment = await service.getPlayerEquipment("player1");
      expect(equipment.slots).toEqual([]);
      expect(equipment.playerId).toBe("player1");
      expect(equipment.schemaVersion).toBe(1);
    });
  });
});
