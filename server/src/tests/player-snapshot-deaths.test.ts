import { describe, it, expect } from "vitest";
import {
  serializePlayerForPersistence,
  mergePersistedPlayerInto,
  PLAYER_PERSIST_KEYS,
} from "../modules/persistence/playerSnapshot.js";

describe("Player snapshot — death/respawn fields", () => {
  it("PLAYER_PERSIST_KEYS includes totalDeaths", () => {
    expect(PLAYER_PERSIST_KEYS).toContain("totalDeaths");
  });

  it("serializes totalDeaths", () => {
    const player = { id: "p1", totalDeaths: 7 };
    const snap = serializePlayerForPersistence(player);
    expect(snap.totalDeaths).toBe(7);
  });

  it("merges totalDeaths onto a fresh player", () => {
    const player = {
      id: "p1",
      totalDeaths: 0,
      inventory: [],
      equipment: { weapon: null, armor: null },
      position: { x: 0, y: 0, z: 0 },
      skillCooldowns: {},
    };
    mergePersistedPlayerInto(player, { totalDeaths: 12 });
    expect(player.totalDeaths).toBe(12);
  });
});
