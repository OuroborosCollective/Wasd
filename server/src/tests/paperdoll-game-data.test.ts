import { describe, expect, it } from "vitest";
import { createPaperdollSnapshot } from "../character/PaperdollTypes.js";
import {
  EQUIPMENT_DEFINITIONS,
  EQUIPMENT_SLOT_IDS,
  type PlayerEquipmentState,
} from "../equipment/EquipmentTypes.js";
import { createGameplaySnapshot, type PaperdollSnapshot } from "../routes/gameplaySnapshotUtils.js";

describe("Paperdoll game-data truth path", () => {
  it("loads canonical slot order from game-data", () => {
    expect([...EQUIPMENT_SLOT_IDS]).toEqual([
      "weapon",
      "helmet",
      "armor",
      "boots",
      "ring",
      "amulet",
      "woodcutting_tool",
      "mining_tool",
      "fishing_tool",
    ]);
  });

  it("creates explicit empty slots and enriches equipped slots from authored game-data", () => {
    const equipment: PlayerEquipmentState = {
      playerId: "player-paperdoll",
      schemaVersion: 1,
      slots: [
        {
          slotId: "fishing_tool",
          itemId: "simple_fishing_rod",
          title: "Client Cannot Override This",
          tier: 1,
        },
      ],
    };

    const snapshot = createPaperdollSnapshot({ character: null, equipment });

    expect(snapshot.slots.map((slot) => slot.slotId)).toEqual([...EQUIPMENT_SLOT_IDS]);
    expect(snapshot.slots.find((slot) => slot.slotId === "weapon")).toEqual({
      slotId: "weapon",
      itemId: null,
      title: "Empty Weapon Slot",
    });

    const fishingSlot = snapshot.slots.find((slot) => slot.slotId === "fishing_tool");
    expect(fishingSlot).toMatchObject({
      slotId: "fishing_tool",
      itemId: "simple_fishing_rod",
      title: "Simple Fishing Rod",
      displayId: "equipment.simple_fishing_rod",
      iconId: "item.simple_fishing_rod",
    });
    expect(fishingSlot?.stats?.some((entry) => entry.key === "fishing_xp_permille" && entry.value === 1100)).toBe(true);
  });

  it("normalizes paperdoll slots inside gameplay snapshots instead of returning unsorted input", () => {
    const inputPaperdoll: PaperdollSnapshot = {
      character: null,
      slots: [
        {
          slotId: "fishing_tool",
          itemId: "simple_fishing_rod",
          title: "Input Title Should Not Win",
        },
        {
          slotId: "weapon",
          itemId: null,
          title: "Input Empty Weapon Label Should Not Win",
        },
      ],
    };

    const snapshot = createGameplaySnapshot({
      serverTick: 100,
      paperdoll: inputPaperdoll,
      quests: [],
      guild: null,
      factions: [],
      map: {},
    });

    expect(snapshot.paperdoll).not.toBe(inputPaperdoll);
    expect(snapshot.paperdoll.slots.map((slot) => slot.slotId)).toEqual([...EQUIPMENT_SLOT_IDS]);
    expect(snapshot.paperdoll.slots.find((slot) => slot.slotId === "weapon")).toEqual({
      slotId: "weapon",
      itemId: null,
      title: "Empty Weapon Slot",
    });
    expect(snapshot.paperdoll.slots.find((slot) => slot.slotId === "fishing_tool")).toMatchObject({
      itemId: "simple_fishing_rod",
      title: "Simple Fishing Rod",
      displayId: "equipment.simple_fishing_rod",
      iconId: "item.simple_fishing_rod",
    });
  });

  it("sorts equipment slots by canonical slot order and keeps authored metadata", () => {
    const snapshot = createGameplaySnapshot({
      serverTick: 100,
      equipment: {
        playerId: "player-equipment",
        schemaVersion: 1,
        slots: [
          {
            slotId: "fishing_tool",
            itemId: "simple_fishing_rod",
            title: "Simple Fishing Rod",
          },
          {
            slotId: "woodcutting_tool",
            itemId: "wooden_axe",
            title: "Wooden Axe",
          },
        ],
      },
      quests: [],
      guild: null,
      factions: [],
      map: {},
    });

    expect(snapshot.equipment?.slots.map((slot) => slot.slotId)).toEqual([
      "woodcutting_tool",
      "fishing_tool",
    ]);
    expect(snapshot.equipment?.slots[0]).toMatchObject({
      itemId: "wooden_axe",
      title: EQUIPMENT_DEFINITIONS.wooden_axe.title,
      displayId: "equipment.wooden_axe",
      iconId: "item.wooden_axe",
      tier: 1,
    });
  });
});
