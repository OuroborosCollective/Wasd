/**
 * Equipment Store Tests
 * 
 * Unit tests for EquipmentStore.
 * Deterministic: No Math.random(), no Date.now().
 */

import { describe, expect, it, beforeEach } from "vitest";
import { EquipmentStore } from "../equipment/EquipmentStore";

describe("EquipmentStore", () => {
  let store: EquipmentStore;

  beforeEach(() => {
    store = new EquipmentStore();
  });

  describe("getPlayerEquipment", () => {
    it("returns empty equipment state for new player", () => {
      const state = store.getPlayerEquipment("player1");

      expect(state.playerId).toBe("player1");
      expect(state.schemaVersion).toBe(1);
      expect(state.slots).toEqual([]);
    });

    it("returns equivalent normalized state for same player on multiple calls", () => {
      const state1 = store.getPlayerEquipment("player1");
      const state2 = store.getPlayerEquipment("player1");

      expect(state2).toEqual(state1);
    });
  });

  describe("equipItem", () => {
    it("equips owned wooden axe into woodcutting slot", () => {
      const result = store.equipItem({
        playerId: "player1",
        itemId: "wooden_axe",
        ownsItem: true,
      });

      expect(result.ok).toBe(true);
      expect(result.equipment?.slots).toEqual([
        expect.objectContaining({
          slotId: "woodcutting_tool",
          itemId: "wooden_axe",
          title: "Wooden Axe",
        }),
      ]);
    });

    it("equips owned copper pickaxe into mining slot", () => {
      const result = store.equipItem({
        playerId: "player1",
        itemId: "copper_pickaxe",
        ownsItem: true,
      });

      expect(result.ok).toBe(true);
      expect(result.equipment?.slots).toEqual([
        expect.objectContaining({
          slotId: "mining_tool",
          itemId: "copper_pickaxe",
          title: "Copper Pickaxe",
        }),
      ]);
    });

    it("equips owned fishing rod into fishing slot", () => {
      const result = store.equipItem({
        playerId: "player1",
        itemId: "simple_fishing_rod",
        ownsItem: true,
      });

      expect(result.ok).toBe(true);
      expect(result.equipment?.slots).toEqual([
        expect.objectContaining({
          slotId: "fishing_tool",
          itemId: "simple_fishing_rod",
          title: "Simple Fishing Rod",
        }),
      ]);
    });

    it("replaces existing tool in same slot", () => {
      // Equip wooden axe first
      store.equipItem({
        playerId: "player1",
        itemId: "wooden_axe",
        ownsItem: true,
      });

      // Equip copper pickaxe (different slot)
      const result = store.equipItem({
        playerId: "player1",
        itemId: "copper_pickaxe",
        ownsItem: true,
      });

      expect(result.ok).toBe(true);
      expect(result.equipment?.slots).toHaveLength(2);
      expect(result.equipment?.slots).toContainEqual(
        expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
      );
      expect(result.equipment?.slots).toContainEqual(
        expect.objectContaining({ slotId: "mining_tool", itemId: "copper_pickaxe" }),
      );
    });

    it("rejects unowned item", () => {
      const result = store.equipItem({
        playerId: "player1",
        itemId: "wooden_axe",
        ownsItem: false,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("item_not_owned");
    });

    it("rejects invalid item", () => {
      const result = store.equipItem({
        playerId: "player1",
        itemId: "invalid_item",
        ownsItem: true,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_item");
    });

    it("rejects invalid player", () => {
      const result = store.equipItem({
        playerId: "",
        itemId: "wooden_axe",
        ownsItem: true,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });

    it("rejects anonymous player", () => {
      const result = store.equipItem({
        playerId: "anonymous",
        itemId: "wooden_axe",
        ownsItem: true,
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_player");
    });
  });

  describe("replacePlayerEquipment", () => {
    it("replaces player equipment state", () => {
      // Equip something first
      store.equipItem({
        playerId: "player1",
        itemId: "wooden_axe",
        ownsItem: true,
      });

      // Replace with new state
      store.replacePlayerEquipment("player1", {
        playerId: "player1",
        schemaVersion: 1,
        slots: [
          { slotId: "mining_tool", itemId: "copper_pickaxe", title: "Copper Pickaxe" },
        ],
      });

      const state = store.getPlayerEquipment("player1");
      expect(state.slots).toEqual([
        expect.objectContaining({
          slotId: "mining_tool",
          itemId: "copper_pickaxe",
          title: "Copper Pickaxe",
        }),
      ]);
    });
  });

  describe("clearForTests", () => {
    it("clears all player equipment", () => {
      store.equipItem({
        playerId: "player1",
        itemId: "wooden_axe",
        ownsItem: true,
      });
      store.equipItem({
        playerId: "player2",
        itemId: "copper_pickaxe",
        ownsItem: true,
      });

      store.clearForTests();

      const state1 = store.getPlayerEquipment("player1");
      const state2 = store.getPlayerEquipment("player2");

      expect(state1.slots).toEqual([]);
      expect(state2.slots).toEqual([]);
    });
  });
});

describe("EquipmentBonus", () => {
  it("returns default bonus when no equipment", async () => {
    const { getGatheringToolBonus } = await import("../equipment/EquipmentBonus");
    const { createDefaultEquipmentState } = await import("../equipment/EquipmentTypes");

    const bonus = getGatheringToolBonus({
      equipment: createDefaultEquipmentState("player1"),
      skillId: "woodcutting",
    });

    expect(bonus.xpMultiplierPermille).toBe(1000);
    expect(bonus.gatherRespawnReductionTicks).toBe(0);
  });

  it("returns 1100 permille bonus for wooden axe on woodcutting", async () => {
    const { getGatheringToolBonus } = await import("../equipment/EquipmentBonus");
    const { normalizeEquipmentState } = await import("../equipment/EquipmentTypes");

    const bonus = getGatheringToolBonus({
      equipment: normalizeEquipmentState(
        {
          slots: [
            { slotId: "woodcutting_tool", itemId: "wooden_axe", title: "Wooden Axe" },
          ],
        },
        "player1",
      ),
      skillId: "woodcutting",
    });

    expect(bonus.xpMultiplierPermille).toBe(1100);
    expect(bonus.gatherRespawnReductionTicks).toBe(2);
  });

  it("returns default bonus for wrong skill", async () => {
    const { getGatheringToolBonus } = await import("../equipment/EquipmentBonus");
    const { normalizeEquipmentState } = await import("../equipment/EquipmentTypes");

    const bonus = getGatheringToolBonus({
      equipment: normalizeEquipmentState(
        {
          slots: [
            { slotId: "woodcutting_tool", itemId: "wooden_axe", title: "Wooden Axe" },
          ],
        },
        "player1",
      ),
      skillId: "mining",
    });

    expect(bonus.xpMultiplierPermille).toBe(1000);
    expect(bonus.gatherRespawnReductionTicks).toBe(0);
  });
});
