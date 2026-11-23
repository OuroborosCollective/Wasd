/**
 * Equipment Persistence Unit and Benchmark Tests
 *
 * Deterministic tests for JsonEquipmentPersistenceAdapter.
 * Verifies save/load behavior, atomic file writes, deterministic sorting,
 * and benchmarks direct relational string comparison vs localeCompare.
 */

import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it, afterEach } from "vitest";
import { JsonEquipmentPersistenceAdapter } from "../equipment/JsonEquipmentPersistenceAdapter.js";
import { createPersistedPlayerEquipmentState } from "../equipment/EquipmentPersistence.js";
import { createEquippedSlotFromDefinition, EQUIPMENT_DEFINITIONS } from "../equipment/EquipmentTypes.js";

const cleanupPaths: string[] = [];

async function createTestFile(testName: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `wasd-equipment-${testName}-`));
  cleanupPaths.push(dir);
  return path.join(dir, "equipment-state.json");
}

afterEach(async () => {
  while (cleanupPaths.length) {
    const target = cleanupPaths.pop()!;
    await rm(target, { recursive: true, force: true });
  }
});

describe("JsonEquipmentPersistenceAdapter", () => {
  it("returns null for non-existent player", async () => {
    const file = await createTestFile("missing");
    const adapter = new JsonEquipmentPersistenceAdapter(file);
    const result = await adapter.loadPlayerEquipment("player_unknown");
    expect(result).toBeNull();
  });

  it("saves and loads player equipment state accurately", async () => {
    const file = await createTestFile("save-load");
    const adapter = new JsonEquipmentPersistenceAdapter(file);

    const initial = createPersistedPlayerEquipmentState("p1", {
      playerId: "p1",
      schemaVersion: 1,
      slots: [createEquippedSlotFromDefinition(EQUIPMENT_DEFINITIONS.wooden_axe)],
    });

    await adapter.savePlayerEquipment(initial);
    const loaded = await adapter.loadPlayerEquipment("p1");

    expect(loaded).not.toBeNull();
    expect(loaded?.playerId).toBe("p1");
    expect(loaded?.slots).toHaveLength(1);
    expect(loaded?.slots[0]?.itemId).toBe("wooden_axe");
    expect(loaded?.slots[0]?.slotId).toBe("woodcutting_tool");
  });

  it("sorts players deterministically by playerId on save", async () => {
    const file = await createTestFile("sort-order");
    const adapter = new JsonEquipmentPersistenceAdapter(file);

    // Save in non-alphabetical order
    await adapter.savePlayerEquipment(createPersistedPlayerEquipmentState("z_player", {
      playerId: "z_player",
      schemaVersion: 1,
      slots: [],
    }));
    await adapter.savePlayerEquipment(createPersistedPlayerEquipmentState("a_player", {
      playerId: "a_player",
      schemaVersion: 1,
      slots: [],
    }));
    await adapter.savePlayerEquipment(createPersistedPlayerEquipmentState("m_player", {
      playerId: "m_player",
      schemaVersion: 1,
      slots: [],
    }));

    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    const playerIds = parsed.players.map((p: { playerId: string }) => p.playerId);

    expect(playerIds).toEqual(["a_player", "m_player", "z_player"]);
  });

  it("reports healthy status for valid path", async () => {
    const file = await createTestFile("health");
    const adapter = new JsonEquipmentPersistenceAdapter(file);
    const status = await adapter.health();

    expect(status.ok).toBe(true);
    expect(status.driver).toBe("json");
  });

  describe("sorting benchmark", () => {
    it("benchmarks fast relational string comparison vs localeCompare for equipment state sorting", () => {
      const samplePlayers = Array.from({ length: 250 }, (_, i) => ({
        playerId: `player_${(i * 37) % 250}`,
        schemaVersion: 1 as const,
        slots: [],
      }));

      const iterations = 500;

      // 1. Benchmark localeCompare sorting
      const startLocale = performance.now();
      for (let i = 0; i < iterations; i++) {
        [...samplePlayers].sort((a, b) => a.playerId.localeCompare(b.playerId));
      }
      const durationLocale = performance.now() - startLocale;

      // 2. Benchmark direct relational operator sorting
      const startRelational = performance.now();
      for (let i = 0; i < iterations; i++) {
        [...samplePlayers].sort((a, b) => (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0));
      }
      const durationRelational = performance.now() - startRelational;

      const speedup = durationLocale / (durationRelational || 0.001);

      console.log(`Equipment Persistence Sorting Benchmark (${iterations} runs, 250 players):`);
      console.log(`  - localeCompare sort:    ${durationLocale.toFixed(4)}ms`);
      console.log(`  - relational sort:       ${durationRelational.toFixed(4)}ms`);
      console.log(`  - Performance speedup:   ${speedup.toFixed(2)}x faster`);

      expect(speedup).toBeGreaterThan(0.8);
    });
  });
});
