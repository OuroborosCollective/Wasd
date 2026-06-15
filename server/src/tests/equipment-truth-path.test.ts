/**
 * EQUIPMENT TRUTH PATH TESTS
 *
 * Verifies the server-backed truth path for equipment in gameplay snapshots:
 * - Equipment is server-backed, not client-reconstructed
 * - Client-provided titles are overwritten by canonical game-data
 * - Equipment slots are sorted deterministically by canonical order
 * - Invalid equipment states are rejected during normalization
 * - Identical inputs produce identical outputs (determinism)
 *
 * Rules (ARE compliance):
 * - No Date.now() or Math.random()
 * - No client-side truth reconstruction
 * - No fake/mock paperdoll data
 * - Stable slot IDs and ordering
 */

import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_SLOT_IDS,
  createDefaultEquipmentState,
  normalizeEquipmentState,
  type PlayerEquipmentState,
} from "../equipment/EquipmentTypes.js";
import { createGameplaySnapshot } from "../routes/gameplaySnapshotUtils.js";

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
