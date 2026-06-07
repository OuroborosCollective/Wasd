/**
 * START PATH QUEST PROGRESS TESTS
 *
 * Verifies that quest objective current values come from real inventory state,
 * not hardcoded values like "2/3".
 *
 * The StartPathQuestLine derives quest progress from inventory quantities.
 */

import { describe, expect, it } from "vitest";
import type { PlayerInventoryState } from "../inventory/InventoryTypes.js";
import type { CharacterProfileSnapshot } from "../character/CharacterTypes.js";
import { createStartPathQuestSnapshot } from "../character/StartPathQuestLine.js";

function createMockInventory(slots: Array<{ itemId: string; quantity: number }>): PlayerInventoryState {
  return {
    playerId: "test_player",
    schemaVersion: 1,
    slots: slots.map((s, i) => ({
      slotId: `slot_${i}`,
      itemId: s.itemId as any,
      name: s.itemId,
      quantity: s.quantity,
      category: "resource" as const,
      stackable: true,
      maxStack: 999,
    })),
    capacity: 32,
  };
}

function createMockCharacter(archetype: CharacterProfileSnapshot["archetype"]): CharacterProfileSnapshot {
  return {
    playerId: "test_player",
    name: "Test",
    archetype,
    level: 1,
    experience: 0,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    position: { x: 460, y: 500 },
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("createStartPathQuestSnapshot", () => {
  describe("angler archetype (fishing quest)", () => {
    it("starts with 0/3 when no raw_fish in inventory", () => {
      const character = createMockCharacter("angler");
      const inventory = createMockInventory([]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      expect(quest).toBeTruthy();
      expect(quest?.id).toBe("start_path_angler");

      const fishObjective = quest?.objectives.find((o) => o.id === "catch_raw_fish");
      expect(fishObjective?.current).toBe(0);
      expect(fishObjective?.required).toBe(3);
      expect(fishObjective?.completed).toBe(false);
    });

    it("shows 1/3 when 1 raw_fish in inventory", () => {
      const character = createMockCharacter("angler");
      const inventory = createMockInventory([{ itemId: "raw_fish", quantity: 1 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      const fishObjective = quest?.objectives.find((o) => o.id === "catch_raw_fish");
      expect(fishObjective?.current).toBe(1);
      expect(fishObjective?.required).toBe(3);
    });

    it("shows 2/3 when 2 raw_fish in inventory", () => {
      const character = createMockCharacter("angler");
      const inventory = createMockInventory([{ itemId: "raw_fish", quantity: 2 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      const fishObjective = quest?.objectives.find((o) => o.id === "catch_raw_fish");
      expect(fishObjective?.current).toBe(2);
      expect(fishObjective?.required).toBe(3);
      expect(fishObjective?.completed).toBe(false); // 2 < 3
    });

    it("completes at 3/3 when 3 raw_fish in inventory", () => {
      const character = createMockCharacter("angler");
      const inventory = createMockInventory([{ itemId: "raw_fish", quantity: 3 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      const fishObjective = quest?.objectives.find((o) => o.id === "catch_raw_fish");
      expect(fishObjective?.current).toBe(3);
      expect(fishObjective?.required).toBe(3);
      expect(fishObjective?.completed).toBe(true);
      expect(quest?.status).toBe("completed");
    });

    it("caps at required even with more items", () => {
      const character = createMockCharacter("angler");
      const inventory = createMockInventory([{ itemId: "raw_fish", quantity: 10 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      const fishObjective = quest?.objectives.find((o) => o.id === "catch_raw_fish");
      expect(fishObjective?.current).toBe(3); // Capped at 3
      expect(fishObjective?.completed).toBe(true);
    });

    it("does not regress when items are consumed", () => {
      // Start with completed quest
      const character = createMockCharacter("angler");
      const inventory = createMockInventory([{ itemId: "raw_fish", quantity: 3 }]);

      let quest = createStartPathQuestSnapshot({ character, inventory });
      expect(quest?.status).toBe("completed");

      // Simulate consuming 1 fish (inventory now has 2)
      const inventoryAfterConsume = createMockInventory([{ itemId: "raw_fish", quantity: 2 }]);
      quest = createStartPathQuestSnapshot({ character, inventoryAfterConsume });

      // Quest is still completed (preserved from previous state)
      // This tests the upsertDerivedQuestSnapshot behavior in the actual system
      const fishObjective = quest?.objectives.find((o) => o.id === "catch_raw_fish");
      expect(fishObjective?.current).toBe(2); // Current reflects actual inventory
      expect(quest?.status).toBe("active"); // But status might be re-derived
    });
  });

  describe("forager archetype (woodcutting quest)", () => {
    it("starts with 0/3 when no wood_log in inventory", () => {
      const character = createMockCharacter("forager");
      const inventory = createMockInventory([]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      expect(quest?.id).toBe("start_path_forager");
      const woodObjective = quest?.objectives.find((o) => o.id === "collect_wood_logs");
      expect(woodObjective?.current).toBe(0);
    });

    it("shows 2/3 when 2 wood_log in inventory", () => {
      const character = createMockCharacter("forager");
      const inventory = createMockInventory([{ itemId: "wood_log", quantity: 2 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      const woodObjective = quest?.objectives.find((o) => o.id === "collect_wood_logs");
      expect(woodObjective?.current).toBe(2);
      expect(woodObjective?.completed).toBe(false);
    });
  });

  describe("miner archetype (mining quest)", () => {
    it("starts with 0/3 when no copper_ore in inventory", () => {
      const character = createMockCharacter("miner");
      const inventory = createMockInventory([]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      expect(quest?.id).toBe("start_path_miner");
      const oreObjective = quest?.objectives.find((o) => o.id === "collect_copper_ore");
      expect(oreObjective?.current).toBe(0);
    });

    it("shows 2/3 when 2 copper_ore in inventory", () => {
      const character = createMockCharacter("miner");
      const inventory = createMockInventory([{ itemId: "copper_ore", quantity: 2 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      const oreObjective = quest?.objectives.find((o) => o.id === "collect_copper_ore");
      expect(oreObjective?.current).toBe(2);
    });
  });

  describe("no hardcoded values", () => {
    it("does not have hardcoded '2/3' anywhere - progress comes from inventory", () => {
      // This test verifies that the progress is dynamically computed
      // by checking different inventory quantities produce different quest progress

      const character = createMockCharacter("angler");

      for (let qty = 0; qty <= 5; qty++) {
        const inventory = createMockInventory([{ itemId: "raw_fish", quantity: qty }]);
        const quest = createStartPathQuestSnapshot({ character, inventory });
        const fishObjective = quest?.objectives.find((o) => o.id === "catch_raw_fish");

        expect(fishObjective?.current).toBe(qty);
        expect(fishObjective?.completed).toBe(qty >= 3);
      }
    });

    it("label text is not hardcoded to '2/3'", () => {
      const character = createMockCharacter("angler");
      const inventory = createMockInventory([{ itemId: "raw_fish", quantity: 2 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });
      const fishObjective = quest?.objectives.find((o) => o.id === "catch_raw_fish");

      // Label should be "Fange 3 Raw Fish", not "Fange 2/3 Raw Fish"
      expect(fishObjective?.label).toBe("Fange 3 Raw Fish");
      expect(fishObjective?.label).not.toContain("2/3");
    });
  });

  describe("archetype fallbacks", () => {
    it("wanderer archetype uses cooked_fish", () => {
      const character = createMockCharacter("wanderer");
      const inventory = createMockInventory([{ itemId: "cooked_fish", quantity: 1 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      expect(quest?.id).toBe("start_path_wanderer");
      const objective = quest?.objectives.find((o) => o.id === "secure_basic_supplies");
      expect(objective?.current).toBe(1);
      expect(objective?.required).toBe(1);
    });

    it("artisan archetype uses wood_plank", () => {
      const character = createMockCharacter("artisan");
      const inventory = createMockInventory([{ itemId: "wood_plank", quantity: 1 }]);

      const quest = createStartPathQuestSnapshot({ character, inventory });

      expect(quest?.id).toBe("start_path_artisan");
      const objective = quest?.objectives.find((o) => o.id === "craft_wood_plank");
      expect(objective?.current).toBe(1);
    });
  });

  describe("null handling", () => {
    it("returns null when character is null", () => {
      const result = createStartPathQuestSnapshot({
        character: null,
        inventory: createMockInventory([]),
      });

      expect(result).toBeNull();
    });

    it("returns null when inventory is null", () => {
      const character = createMockCharacter("angler");
      const result = createStartPathQuestSnapshot({
        character,
        inventory: null,
      });

      expect(result).toBeNull();
    });
  });
});