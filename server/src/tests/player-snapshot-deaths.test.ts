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

  it("PLAYER_PERSIST_KEYS includes warfrontProgress", () => {
    expect(PLAYER_PERSIST_KEYS).toContain("warfrontProgress");
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
      equipment: { weapon: null, armor: null, offHand: null },
      position: { x: 0, y: 0, z: 0 },
      skillCooldowns: {},
    };
    mergePersistedPlayerInto(player, { totalDeaths: 12 });
    expect(player.totalDeaths).toBe(12);
  });

  it("hydrates default warfrontProgress on merge", () => {
    const player = {
      id: "p2",
      totalDeaths: 0,
      inventory: [],
      equipment: { weapon: null, armor: null, offHand: null },
      position: { x: 0, y: 0, z: 0 },
      skillCooldowns: {},
    };
    mergePersistedPlayerInto(player, {});
    expect(player.warfrontProgress).toBeTruthy();
    expect(player.warfrontProgress.seasonId).toBe("");
    expect(player.warfrontProgress.seasonPoints).toBe(0);
    expect(Array.isArray(player.warfrontProgress.claimedTierIds)).toBe(true);
  });
});
