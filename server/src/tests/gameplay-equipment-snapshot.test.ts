import { describe, expect, it } from "vitest";

import { createPaperdollSnapshot } from "../character/PaperdollTypes.js";
import {
  createEquippedSlotFromDefinition,
  EQUIPMENT_DEFINITIONS,
  EQUIPMENT_SLOT_IDS,
} from "../equipment/EquipmentTypes.js";
import { createGameplaySnapshot } from "../routes/gameplaySnapshotUtils.js";

describe("authoritative gameplay equipment snapshot", () => {
  it("represents every empty paperdoll slot deterministically", () => {
    const paperdoll = createPaperdollSnapshot({ character: null, equipment: null });
    const snapshot = createGameplaySnapshot({
      serverTick: 17,
      character: null,
      paperdoll,
      quests: [],
      skills: [],
      resources: [],
      inventory: null,
      crafting: null,
      equipment: null,
      guild: null,
      factions: [],
      map: {},
    });

    expect(snapshot.paperdoll.slots.map((slot) => slot.slotId)).toEqual([...EQUIPMENT_SLOT_IDS]);
    expect(snapshot.paperdoll.slots.every((slot) => slot.itemId === null)).toBe(true);
    expect(snapshot.paperdoll.slots.map((slot) => slot.title).every((title) => title.length > 0)).toBe(true);
  });

  it("derives paperdoll and equipment segments from server equipment state", () => {
    const equipment = {
      playerId: "player1",
      schemaVersion: 1 as const,
      slots: [createEquippedSlotFromDefinition(EQUIPMENT_DEFINITIONS.wooden_axe)],
    };
    const paperdoll = createPaperdollSnapshot({ character: null, equipment });
    const snapshot = createGameplaySnapshot({
      serverTick: 18,
      character: null,
      paperdoll,
      quests: [],
      skills: [],
      resources: [],
      inventory: null,
      crafting: null,
      equipment,
      guild: null,
      factions: [],
      map: {},
    });

    expect(snapshot.equipment?.slots).toEqual([
      expect.objectContaining({ slotId: "woodcutting_tool", itemId: "wooden_axe" }),
    ]);
    expect(snapshot.paperdoll.slots.find((slot) => slot.slotId === "woodcutting_tool")).toEqual(
      expect.objectContaining({ itemId: "wooden_axe", displayId: "equipment.wooden_axe" }),
    );
  });

  it("normalizes unsorted equipment state into stable slot order", () => {
    const equipment = {
      playerId: "player1",
      schemaVersion: 1 as const,
      slots: [
        createEquippedSlotFromDefinition(EQUIPMENT_DEFINITIONS.simple_fishing_rod),
        createEquippedSlotFromDefinition(EQUIPMENT_DEFINITIONS.wooden_axe),
        createEquippedSlotFromDefinition(EQUIPMENT_DEFINITIONS.copper_pickaxe),
      ],
    };
    const paperdoll = createPaperdollSnapshot({ character: null, equipment });
    const snapshotA = createGameplaySnapshot({ serverTick: 19, equipment, paperdoll });
    const snapshotB = createGameplaySnapshot({ serverTick: 19, equipment, paperdoll });

    expect(snapshotA.equipment?.slots.map((slot) => slot.slotId)).toEqual([
      "woodcutting_tool",
      "mining_tool",
      "fishing_tool",
    ]);
    expect(snapshotA.equipment).toEqual(snapshotB.equipment);
    expect(snapshotA.paperdoll.slots.map((slot) => slot.slotId)).toEqual([...EQUIPMENT_SLOT_IDS]);
  });

  it("includes authored tier requirements in equipped metadata", () => {
    const equipment = {
      playerId: "player1",
      schemaVersion: 1 as const,
      slots: [createEquippedSlotFromDefinition(EQUIPMENT_DEFINITIONS.copper_axe)],
    };
    const paperdoll = createPaperdollSnapshot({ character: null, equipment });
    const snapshot = createGameplaySnapshot({ serverTick: 20, equipment, paperdoll });

    expect(snapshot.equipment?.slots[0].requirements).toEqual([
      { key: "woodcutting_level", value: 2 },
    ]);
    expect(snapshot.paperdoll.slots.find((slot) => slot.slotId === "woodcutting_tool")?.requirements).toEqual([
      { key: "woodcutting_level", value: 2 },
    ]);
  });
});
