/**
 * Equipment Service Tests
 *
 * Integration tests for EquipmentService with staged inventory/equipment transactions.
 * Deterministic: No Math.random(), no Date.now().
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { EquipmentPersistenceAdapter } from "../src/equipment/EquipmentPersistence.js";
import { EquipmentService, type InventoryServiceLike } from "../src/equipment/EquipmentService.js";
import { EquipmentStore } from "../src/equipment/EquipmentStore.js";
import { InventoryStore } from "../src/inventory/InventoryStore.js";
import type { InventoryItemId, PlayerInventoryState } from "../src/inventory/InventoryTypes.js";

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createEquipmentPersistence(options: { failSave?: boolean } = {}): EquipmentPersistenceAdapter {
  return {
    async loadPlayerEquipment() { return null; },
    async savePlayerEquipment() {
      if (options.failSave) throw new Error("equipment_persist_failed");
    },
  };
}

function createTestInventoryService(
  store: InventoryStore,
  options: { failPersist?: boolean; persistedStates?: PlayerInventoryState[] } = {},
): InventoryServiceLike {
  return {
    async getPlayerInventory(playerId: string) {
      return store.getPlayerInventory(playerId);
    },
    async persistInventory(_playerId: string, state: PlayerInventoryState) {
      if (options.failPersist) throw new Error("inventory_persist_failed");
      options.persistedStates?.push(cloneState(state));
    },
    replacePlayerInventory(playerId: string, state: PlayerInventoryState) {
      store.replacePlayerInventory(playerId, state);
    },
  };
}

function findInventoryQuantity(state: PlayerInventoryState, itemId: InventoryItemId): number {
  return state.slots.find((slot) => slot.itemId === itemId)?.quantity ?? 0;
}

describe("EquipmentService", () => {
  let equipmentStore: EquipmentStore;
  let inventoryStore: InventoryStore;
  let service: EquipmentService;

  beforeEach(() => {
    equipmentStore = new EquipmentStore();
    inventoryStore = new InventoryStore();
    const inventoryService = createTestInventoryService(inventoryStore);
    service = new EquipmentService(
      equipmentStore,
      createEquipmentPersistence(),
      () => Promise.resolve(inventoryService),
    );
    service.clearForTests();
  });

  describe("equipItem - staged inventory consumption", () => {
    it("equips owned item and consumes one inventory unit", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("equipped");
      expect(result.itemId).toBe("wooden_axe");
      expect(result.equipment?.slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
      );
      expect(inventoryStore.getPlayerInventory("player1").slots.find((slot) => slot.itemId === "wooden_axe")).toBeUndefined();
      expect(result.inventoryDelta).toEqual({ itemId: "wooden_axe", delta: -1 });
    });

    it("rejects equip of unowned item", async () => {
      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("item_not_owned");
      expect(equipmentStore.getPlayerEquipment("player1").slots).toEqual([]);
      expect(inventoryStore.getPlayerInventory("player1").slots).toEqual([]);
    });

    it("rejects equip of invalid item", async () => {
      const result = await service.equipItem({ playerId: "player1", itemId: "invalid_item" });
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
    it("replaces occupied slot and returns replaced item to inventory", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      inventoryStore.addItem({ playerId: "player1", itemId: "copper_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      const result = await service.equipItem({ playerId: "player1", itemId: "copper_axe" });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("equipped");
      expect(result.unequippedItemId).toBe("wooden_axe");
      expect(equipmentStore.getPlayerEquipment("player1").slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "copper_axe" }),
      );

      const inventory = inventoryStore.getPlayerInventory("player1");
      expect(findInventoryQuantity(inventory, "wooden_axe")).toBe(1);
      expect(findInventoryQuantity(inventory, "copper_axe")).toBe(0);
    });

    it("can equip items in different slots independently", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      inventoryStore.addItem({ playerId: "player1", itemId: "copper_pickaxe", quantity: 1 });
      inventoryStore.addItem({ playerId: "player1", itemId: "simple_fishing_rod", quantity: 1 });

      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      await service.equipItem({ playerId: "player1", itemId: "copper_pickaxe" });
      await service.equipItem({ playerId: "player1", itemId: "simple_fishing_rod" });

      const equipment = equipmentStore.getPlayerEquipment("player1");
      expect(equipment.slots).toHaveLength(3);
      expect(equipment.slots).toContainEqual(expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }));
      expect(equipment.slots).toContainEqual(expect.objectContaining({ slotId: "mining_tool", itemId: "copper_pickaxe" }));
      expect(equipment.slots).toContainEqual(expect.objectContaining({ slotId: "fishing_tool", itemId: "simple_fishing_rod" }));
      expect(inventoryStore.getPlayerInventory("player1").slots).toHaveLength(0);
    });
  });

  describe("unequipItem - staged inventory restoration", () => {
    it("unequips item and returns it to inventory", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      const result = await service.unequipItem({ playerId: "player1", slotId: "woodcutting_tool" });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("unequipped");
      expect(result.unequippedItemId).toBe("wooden_axe");
      expect(result.slotId).toBe("woodcutting_tool");
      expect(equipmentStore.getPlayerEquipment("player1").slots).toHaveLength(0);
      expect(inventoryStore.getPlayerInventory("player1").slots).toContainEqual(
        expect.objectContaining({ itemId: "wooden_axe", quantity: 1 }),
      );
      expect(result.inventoryDelta).toEqual({ itemId: "wooden_axe", delta: +1 });
    });

    it("rejects unequip of empty slot", async () => {
      const result = await service.unequipItem({ playerId: "player1", slotId: "woodcutting_tool" });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("slot_empty");
      expect(inventoryStore.getPlayerInventory("player1").slots).toEqual([]);
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
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      await service.unequipItem({ playerId: "player1", slotId: "woodcutting_tool" });

      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe("equipped");
      expect(equipmentStore.getPlayerEquipment("player1").slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
      );
      expect(inventoryStore.getPlayerInventory("player1").slots).toHaveLength(0);
    });
  });

  describe("determinism", () => {
    it("repeated equip from same initial state produces identical output", async () => {
      const setup = () => {
        equipmentStore.clearForTests();
        inventoryStore.clearForTests();
        service.clearForTests();
        inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      };

      setup();
      const result1 = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      const equipment1 = equipmentStore.getPlayerEquipment("player1");
      const inventory1 = inventoryStore.getPlayerInventory("player1");

      setup();
      const result2 = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      const equipment2 = equipmentStore.getPlayerEquipment("player1");
      const inventory2 = inventoryStore.getPlayerInventory("player1");

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
          equipment: cloneState(equipmentStore.getPlayerEquipment("player1")),
          inventory: cloneState(inventoryStore.getPlayerInventory("player1")),
        };
      };

      const result1 = await runSequence();
      const result2 = await runSequence();
      expect(result1.equipment.slots).toEqual(result2.equipment.slots);
      expect(result1.inventory.slots).toEqual(result2.inventory.slots);
    });
  });

  describe("no partial state mutations", () => {
    it("failed equip does not mutate equipment or inventory state", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

      const result = await service.equipItem({ playerId: "player1", itemId: "invalid_item" });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");
      expect(equipmentStore.getPlayerEquipment("player1").slots).toHaveLength(0);
      expect(inventoryStore.getPlayerInventory("player1").slots).toContainEqual(
        expect.objectContaining({ itemId: "wooden_axe", quantity: 1 }),
      );
    });

    it("does not mutate stores when inventory persistence fails during equip", async () => {
      const failingInventory = createTestInventoryService(inventoryStore, { failPersist: true });
      service = new EquipmentService(equipmentStore, createEquipmentPersistence(), () => Promise.resolve(failingInventory));
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      const beforeEquipment = cloneState(equipmentStore.getPlayerEquipment("player1"));
      const beforeInventory = cloneState(inventoryStore.getPlayerInventory("player1"));

      await expect(service.equipItem({ playerId: "player1", itemId: "wooden_axe" })).rejects.toThrow("inventory_persist_failed");

      expect(equipmentStore.getPlayerEquipment("player1")).toEqual(beforeEquipment);
      expect(inventoryStore.getPlayerInventory("player1")).toEqual(beforeInventory);
    });

    it("does not mutate stores when equipment persistence fails during equip", async () => {
      service = new EquipmentService(
        equipmentStore,
        createEquipmentPersistence({ failSave: true }),
        () => Promise.resolve(createTestInventoryService(inventoryStore)),
      );
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      const beforeEquipment = cloneState(equipmentStore.getPlayerEquipment("player1"));
      const beforeInventory = cloneState(inventoryStore.getPlayerInventory("player1"));

      await expect(service.equipItem({ playerId: "player1", itemId: "wooden_axe" })).rejects.toThrow("equipment_persist_failed");

      expect(equipmentStore.getPlayerEquipment("player1")).toEqual(beforeEquipment);
      expect(inventoryStore.getPlayerInventory("player1")).toEqual(beforeInventory);
    });

    it("does not mutate stores when replacing slot and equipment persistence fails", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      inventoryStore.addItem({ playerId: "player1", itemId: "copper_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      const beforeEquipment = cloneState(equipmentStore.getPlayerEquipment("player1"));
      const beforeInventory = cloneState(inventoryStore.getPlayerInventory("player1"));
      service = new EquipmentService(
        equipmentStore,
        createEquipmentPersistence({ failSave: true }),
        () => Promise.resolve(createTestInventoryService(inventoryStore)),
      );

      await expect(service.equipItem({ playerId: "player1", itemId: "copper_axe" })).rejects.toThrow("equipment_persist_failed");

      expect(equipmentStore.getPlayerEquipment("player1")).toEqual(beforeEquipment);
      expect(inventoryStore.getPlayerInventory("player1")).toEqual(beforeInventory);
    });

    it("does not mutate stores when inventory persistence fails during unequip", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      const beforeEquipment = cloneState(equipmentStore.getPlayerEquipment("player1"));
      const beforeInventory = cloneState(inventoryStore.getPlayerInventory("player1"));
      const failingInventory = createTestInventoryService(inventoryStore, { failPersist: true });
      service = new EquipmentService(equipmentStore, createEquipmentPersistence(), () => Promise.resolve(failingInventory));

      await expect(service.unequipItem({ playerId: "player1", slotId: "woodcutting_tool" })).rejects.toThrow("inventory_persist_failed");

      expect(equipmentStore.getPlayerEquipment("player1")).toEqual(beforeEquipment);
      expect(inventoryStore.getPlayerInventory("player1")).toEqual(beforeInventory);
    });

    it("successful equip produces consistent equipment and inventory", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      expect(result.ok).toBe(true);
      expect(result.equipment).toEqual(equipmentStore.getPlayerEquipment("player1"));
      expect(result.equipment?.slots).toContainEqual(expect.objectContaining({ itemId: "wooden_axe" }));
      expect(inventoryStore.getPlayerInventory("player1").slots.find((slot) => slot.itemId === "wooden_axe")).toBeUndefined();
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
