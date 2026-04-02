import { describe, it, expect } from "vitest";
import {
  mergePersistedPlayerInto,
  serializePlayerForPersistence,
} from "../modules/persistence/playerSnapshot.js";

describe("playerSnapshot", () => {
  it("serializePlayerForPersistence omits transient fields", () => {
    const p: any = {
      id: "u1",
      name: "Hero",
      gold: 10,
      inventory: [{ id: "a" }],
      equipment: { weapon: { id: "w" }, armor: null },
      isOffline: false,
      state: "walking",
      targetPosition: { x: 1, y: 2 },
    };
    const s = serializePlayerForPersistence(p);
    expect(s.isOffline).toBeUndefined();
    expect(s.state).toBeUndefined();
    expect(s.gold).toBe(10);
    expect(s.inventory).toEqual([{ id: "a" }]);
  });

  it("mergePersistedPlayerInto applies saved data and marks offline", () => {
    const fresh: any = {
      id: "dev_x",
      name: "DevPlayer",
      gold: 0,
      inventory: [],
      equipment: { weapon: null, armor: null },
      position: { x: 0, y: 0, z: 0 },
      isOffline: false,
      state: "idle",
      stateTimer: 0,
      targetPosition: null,
    };
    mergePersistedPlayerInto(fresh, {
      name: "SavedName",
      gold: 99,
      sceneId: "hub",
      spawnKey: "sp_player_default",
      inventory: [{ id: "iron_scrap" }],
    });
    expect(fresh.name).toBe("SavedName");
    expect(fresh.gold).toBe(99);
    expect(fresh.sceneId).toBe("hub");
    expect(fresh.inventory).toEqual([{ id: "iron_scrap" }]);
    expect(fresh.isOffline).toBe(true);
    expect(fresh.targetPosition).toBeNull();
  });
});
