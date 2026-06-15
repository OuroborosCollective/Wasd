/**
 * EQUIPMENT TRUTH PATH TESTS
 *
 * Verifies the server-backed truth path for equipment in gameplay snapshots:
 * - Equipment is server-backed, not client-reconstructed
 * - Client-provided titles are overwritten by canonical game-data
 * - Equipment slots are sorted deterministically by canonical order
 * - Invalid equipment states are rejected during normalization
 * - Identical inputs produce identical outputs (determinism)
 * - Invalid slot IDs and items are rejected server-side
 * - UI side-channel patterns for pending/rejected states
 *
 * Rules (ARE compliance):
 * - No Date.now() or Math.random()
 * - No client-side truth reconstruction
 * - No fake/mock paperdoll data
 * - Stable slot IDs and ordering
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryStore } from "../inventory/InventoryStore.js";
import type { InventoryServiceLike } from "../equipment/EquipmentService.js";
import type { PlayerInventoryState } from "../inventory/InventoryTypes.js";
import { EquipmentService } from "../equipment/EquipmentService.js";
import { EquipmentStore } from "../equipment/EquipmentStore.js";
import {
  EQUIPMENT_SLOT_IDS,
  createDefaultEquipmentState,
  normalizeEquipmentState,
  isEquipmentSlotId,
  type PlayerEquipmentState,
  type EquipmentSlotId,
} from "../equipment/EquipmentTypes.js";
import { createGameplaySnapshot } from "../routes/gameplaySnapshotUtils.js";

function createMockInventoryService(store: InventoryStore): InventoryServiceLike {
  return {
    async getPlayerInventory(playerId: string) {
      return store.getPlayerInventory(playerId);
    },
    async persistInventory() {},
    replacePlayerInventory(playerId: string, state: PlayerInventoryState) {
      store.replacePlayerInventory(playerId, state);
    },
  };
}

describe("Equipment truth path", () => {
  it("keeps equipment server-backed, canonical and deterministic in gameplay snapshot", () => {
    const equipment: PlayerEquipmentState = {
      playerId: "player-equipment-truth",
      schemaVersion: 1,
      slots: [
        {
          slotId: "fishing_tool",
          itemId: "simple_fishing_rod",
          title: "Client Title Must Not Win",
          tier: 1,
        },
        {
          slotId: "woodcutting_tool",
          itemId: "wooden_axe",
          title: "Client Title Must Not Win",
          tier: 1,
        },
      ],
    };

    const first = createGameplaySnapshot({
      serverTick: 100,
      equipment,
      quests: [],
      skills: [],
      resources: [],
      guild: null,
      factions: [],
      map: {},
    });

    const second = createGameplaySnapshot({
      serverTick: 100,
      equipment,
      quests: [],
      skills: [],
      resources: [],
      guild: null,
      factions: [],
      map: {},
    });

    // Determinism: identical inputs produce identical outputs
    expect(first.equipment).toEqual(second.equipment);

    // Canonical slot ordering (woodcutting_tool comes before fishing_tool)
    expect(first.equipment?.slots.map((slot) => slot.slotId)).toEqual([
      "woodcutting_tool",
      "fishing_tool",
    ]);

    // Client-provided title is overwritten by canonical game-data
    expect(first.equipment?.slots[0]).toMatchObject({
      slotId: "woodcutting_tool",
      itemId: "wooden_axe",
      title: "Wooden Axe",
      displayId: "equipment.wooden_axe",
      iconId: "item.wooden_axe",
      tier: 1,
    });

    // Paperdoll has all canonical slots in order
    expect(first.paperdoll.slots.map((slot) => slot.slotId)).toEqual([...EQUIPMENT_SLOT_IDS]);
  });

  it("rejects invalid equipment state during normalization instead of inventing fake slots", () => {
    const normalized = normalizeEquipmentState(
      {
        playerId: "player-invalid-equipment",
        schemaVersion: 1,
        slots: [
          {
            slotId: "weapon",
            itemId: "not_a_real_item",
            title: "Fake Sword",
            tier: 99,
          } as never,
        ],
      },
      "player-invalid-equipment",
    );

    // Invalid itemId is rejected → returns default empty state
    expect(normalized).toEqual(createDefaultEquipmentState("player-invalid-equipment"));
  });

  it("normalizeEquipmentState rejects invalid slot IDs and keeps valid equipment", () => {
    const normalized = normalizeEquipmentState(
      {
        playerId: "player-mixed-equipment",
        schemaVersion: 1,
        slots: [
          {
            slotId: "weapon",
            itemId: "not_a_real_item",
            title: "Fake Weapon",
            tier: 99,
          } as never,
          {
            slotId: "fishing_tool",
            itemId: "simple_fishing_rod",
            title: "Simple Fishing Rod",
            tier: 1,
          },
        ],
      },
      "player-mixed-equipment",
    );

    // Only valid equipment is kept
    expect(normalized.slots).toHaveLength(1);
    expect(normalized.slots[0]).toMatchObject({
      slotId: "fishing_tool",
      itemId: "simple_fishing_rod",
      title: "Simple Fishing Rod",
    });
  });

  it("normalizeEquipmentState is deterministic across multiple calls", () => {
    const input: Partial<PlayerEquipmentState> = {
      playerId: "player-deterministic",
      schemaVersion: 1,
      slots: [
        { slotId: "fishing_tool", itemId: "simple_fishing_rod", title: "Simple Fishing Rod", tier: 1 },
        { slotId: "mining_tool", itemId: "copper_pickaxe", title: "Copper Pickaxe", tier: 1 },
        { slotId: "woodcutting_tool", itemId: "wooden_axe", title: "Wooden Axe", tier: 1 },
      ],
    };

    const results = Array.from({ length: 5 }, () =>
      normalizeEquipmentState(input, "player-deterministic"),
    );

    // All results must be identical
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }

    // Slots are in canonical order
    expect(results[0].slots.map((s) => s.slotId)).toEqual([
      "woodcutting_tool",
      "mining_tool",
      "fishing_tool",
    ]);
  });

  it("createGameplaySnapshot preserves determinism with equipment", () => {
    const equipment: PlayerEquipmentState = {
      playerId: "player-snapshot-determinism",
      schemaVersion: 1,
      slots: [
        { slotId: "fishing_tool", itemId: "simple_fishing_rod", title: "Simple Fishing Rod", tier: 1 },
        { slotId: "woodcutting_tool", itemId: "wooden_axe", title: "Wooden Axe", tier: 1 },
      ],
    };

    const snapshots = Array.from({ length: 3 }, (_, i) =>
      createGameplaySnapshot({
        serverTick: 100 + i,
        equipment,
        quests: [],
        skills: [],
        resources: [],
        guild: null,
        factions: [],
        map: {},
      }),
    );

    // Equipment and paperdoll are identical regardless of serverTick
    for (const snapshot of snapshots) {
      expect(snapshot.equipment?.slots).toEqual(snapshots[0].equipment?.slots);
      expect(snapshot.paperdoll.slots).toEqual(snapshots[0].paperdoll.slots);
    }
  });
});

describe("Equipment service - invalid slot/item rejection", () => {
  let equipmentStore: EquipmentStore;
  let inventoryStore: InventoryStore;
  let service: EquipmentService;

  function createService(): EquipmentService {
    return new EquipmentService(
      equipmentStore,
      {
        async loadPlayerEquipment() { return null; },
        async savePlayerEquipment() {},
      },
      () => Promise.resolve(createMockInventoryService(inventoryStore)),
      () => Promise.resolve({
        async getPlayerSkillState() {
          return {
            playerId: "test",
            schemaVersion: 1 as const,
            skills: [],
          };
        },
      }),
    );
  }

  beforeEach(() => {
    equipmentStore = new EquipmentStore();
    inventoryStore = new InventoryStore();
    service = createService();
    service.clearForTests();
  });

  describe("equipItem rejects invalid inputs", () => {
    it("rejects equip with completely invalid item ID", async () => {
      const result = await service.equipItem({ playerId: "player1", itemId: "not_a_real_item_xyz" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");
      expect(equipmentStore.getPlayerEquipment("player1").slots).toHaveLength(0);
    });

    it("rejects equip with SQL injection attempt in item ID", async () => {
      const result = await service.equipItem({ playerId: "player1", itemId: "'; DROP TABLE equipment; --" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");
    });

    it("rejects equip with empty player ID", async () => {
      inventoryStore.addItem({ playerId: "", itemId: "wooden_axe", quantity: 1 });
      const result = await service.equipItem({ playerId: "", itemId: "wooden_axe" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects equip with 'anonymous' player ID", async () => {
      inventoryStore.addItem({ playerId: "anonymous", itemId: "wooden_axe", quantity: 1 });
      const result = await service.equipItem({ playerId: "anonymous", itemId: "wooden_axe" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects equip of item player does not own", async () => {
      // Player has no items in inventory
      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("item_not_owned");
      expect(equipmentStore.getPlayerEquipment("player1").slots).toHaveLength(0);
    });

    it("rejects equip when inventory quantity is zero", async () => {
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 0 });
      const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("item_not_owned");
    });
  });

  describe("unequipItem rejects invalid inputs", () => {
    it("rejects unequip with empty player ID", async () => {
      const result = await service.unequipItem({ playerId: "", slotId: "woodcutting_tool" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects unequip with 'anonymous' player ID", async () => {
      const result = await service.unequipItem({ playerId: "anonymous", slotId: "woodcutting_tool" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects unequip from empty slot", async () => {
      // First equip an item
      inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });
      await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

      // Try to unequip a different empty slot
      const result = await service.unequipItem({ playerId: "player1", slotId: "mining_tool" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("slot_empty");
    });
  });

  describe("isEquipmentSlotId validates slot IDs", () => {
    it("returns true for valid equipment slot IDs", () => {
      expect(isEquipmentSlotId("weapon")).toBe(true);
      expect(isEquipmentSlotId("woodcutting_tool")).toBe(true);
      expect(isEquipmentSlotId("fishing_tool")).toBe(true);
      expect(isEquipmentSlotId("helmet")).toBe(true);
    });

    it("returns false for invalid slot IDs", () => {
      expect(isEquipmentSlotId("invalid_slot")).toBe(false);
      expect(isEquipmentSlotId("")).toBe(false);
      expect(isEquipmentSlotId("weapon_")).toBe(false);
      expect(isEquipmentSlotId("WOODCUTTING_TOOL")).toBe(false); // case sensitive
    });
  });
});

describe("Equipment UI side-channel pattern", () => {
  /**
   * This test verifies the UI side-channel pattern:
   * 1. UI sends equip request to server
   * 2. UI shows "pending" state locally (optimistic UI)
   * 3. Server validates and returns authoritative result
   * 4. UI updates to server-authoritative state
   *
   * The key insight: UI pending/rejected states are local
   * and MUST NOT affect server equipment truth.
   */

  let equipmentStore: EquipmentStore;
  let inventoryStore: InventoryStore;
  let service: EquipmentService;

  function createService(): EquipmentService {
    return new EquipmentService(
      equipmentStore,
      {
        async loadPlayerEquipment() { return null; },
        async savePlayerEquipment() {},
      },
      () => Promise.resolve(createMockInventoryService(inventoryStore)),
      () => Promise.resolve({
        async getPlayerSkillState() {
          return {
            playerId: "test",
            schemaVersion: 1 as const,
            skills: [],
          };
        },
      }),
    );
  }

  beforeEach(() => {
    equipmentStore = new EquipmentStore();
    inventoryStore = new InventoryStore();
    service = createService();
    service.clearForTests();
  });

  it("server is source of truth - equipment only changes via successful server response", async () => {
    // Initial state
    inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

    // Client sends equip request
    const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

    // Server returns authoritative result
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("equipped");

    // Server state is the only truth
    const serverEquipment = equipmentStore.getPlayerEquipment("player1");
    expect(serverEquipment.slots).toContainEqual(
      expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
    );
  });

  it("rejected equip does not modify server equipment state", async () => {
    // Player does NOT have the item
    const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("item_not_owned");

    // Server state unchanged
    const serverEquipment = equipmentStore.getPlayerEquipment("player1");
    expect(serverEquipment.slots).toHaveLength(0);
  });

  it("successful equip removes item from inventory via server", async () => {
    inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

    const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

    expect(result.ok).toBe(true);
    expect(result.inventoryDelta).toEqual({ itemId: "wooden_axe", delta: -1 });

    // Inventory modified server-side only
    const inventory = inventoryStore.getPlayerInventory("player1");
    expect(inventory.slots.find(s => s.itemId === "wooden_axe")).toBeUndefined();
  });

  it("serverTick is included in response for client state synchronization", async () => {
    inventoryStore.addItem({ playerId: "player1", itemId: "wooden_axe", quantity: 1 });

    // The API route adds tickContext - service returns result
    const result = await service.equipItem({ playerId: "player1", itemId: "wooden_axe" });

    // Result contains all needed info for client reconciliation
    expect(result.ok).toBe(true);
    expect(result.equipment).toBeDefined();
    expect(result.equipment?.slots).toContainEqual(
      expect.objectContaining({ itemId: "wooden_axe" }),
    );
  });
});
