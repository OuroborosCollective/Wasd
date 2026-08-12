/**
 * WORLD DISCOVERY TESTS
 *
 * Tests for POI discovery and map fog progression.
 * Deterministic: No Math.random(), stable ordering, no Date.now().
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  type WorldDiscoveryState,
  type ChunkKey,
  createDefaultDiscoveryState,
  createStarterDiscoveryState,
  addDiscoveredPoi,
  addDiscoveredChunk,
  addDiscoveredPois,
  addDiscoveredChunks,
  isPoiDiscovered,
  isChunkDiscovered,
  createChunkKey,
  parseChunkKey,
  STARTER_VILLAGE_POI_IDS,
} from "../world/WorldDiscoveryTypes.js";
import { WorldDiscoveryStore, worldDiscoveryStore } from "../world/WorldDiscoveryStore.js";
import {
  WorldDiscoveryService,
  worldDiscoveryService,
  DEFAULT_DISCOVERY_RADIUS,
  getChunkKeyFromPosition,
  getVisibleChunkKeys,
} from "../world/WorldDiscoveryService.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";

describe("WorldDiscoveryTypes", () => {
  describe("createDefaultDiscoveryState", () => {
    it("should create empty discovery state", () => {
      const state = createDefaultDiscoveryState("player1");
      expect(state.playerId).toBe("player1");
      expect(state.schemaVersion).toBe(1);
      expect(state.discoveredPoiIds).toEqual([]);
      expect(state.discoveredChunks).toEqual([]);
    });
  });

  describe("createStarterDiscoveryState", () => {
    it("should create state with starter POIs pre-discovered", () => {
      const state = createStarterDiscoveryState("player1");
      expect(state.playerId).toBe("player1");
      expect(state.discoveredPoiIds).toContain("village_trader_001");
      expect(state.discoveredPoiIds).toContain("campfire_001");
      expect(state.discoveredPoiIds).toContain("furnace_001");
      expect(state.discoveredPoiIds).toContain("workbench_001");
      expect(state.discoveredPoiIds.length).toBe(4);
    });
  });

  describe("addDiscoveredPoi", () => {
    it("should add new POI to state", () => {
      const state = createDefaultDiscoveryState("player1");
      const next = addDiscoveredPoi(state, "poi:1:1:logging_camp:0");
      expect(next.discoveredPoiIds).toContain("poi:1:1:logging_camp:0");
    });

    it("should not add duplicate POI", () => {
      const state = addDiscoveredPoi(createDefaultDiscoveryState("player1"), "poi:1");
      const next = addDiscoveredPoi(state, "poi:1");
      expect(next).toBe(state);
    });

    it("should maintain sorted order", () => {
      const state = createDefaultDiscoveryState("player1");
      const next = addDiscoveredPois(state, ["poi:b", "poi:a", "poi:c"]);
      expect(next.discoveredPoiIds).toEqual(["poi:a", "poi:b", "poi:c"]);
    });
  });

  describe("addDiscoveredChunk", () => {
    it("should add new chunk to state", () => {
      const state = createDefaultDiscoveryState("player1");
      const next = addDiscoveredChunk(state, "1:2");
      expect(next.discoveredChunks).toContain("1:2");
    });

    it("should not add duplicate chunk", () => {
      const state = addDiscoveredChunk(createDefaultDiscoveryState("player1"), "1:2");
      const next = addDiscoveredChunk(state, "1:2");
      expect(next).toBe(state);
    });
  });

  describe("isPoiDiscovered", () => {
    it("should return true for discovered POI", () => {
      const state = addDiscoveredPoi(createDefaultDiscoveryState("player1"), "poi:1");
      expect(isPoiDiscovered(state, "poi:1")).toBe(true);
    });

    it("should return false for undiscovered POI", () => {
      const state = createDefaultDiscoveryState("player1");
      expect(isPoiDiscovered(state, "poi:1")).toBe(false);
    });
  });

  describe("createChunkKey / parseChunkKey", () => {
    it("should create and parse chunk keys", () => {
      const key = createChunkKey(1, 2);
      expect(key).toBe("1:2");
      const parsed = parseChunkKey(key);
      expect(parsed.chunkX).toBe(1);
      expect(parsed.chunkZ).toBe(2);
    });
  });
});

describe("WorldDiscoveryStore", () => {
  let store: WorldDiscoveryStore;

  beforeEach(() => {
    store = new WorldDiscoveryStore({ autoSeedStarterPois: true });
  });

  describe("getState", () => {
    it("should return default state for new player", () => {
      const state = store.getState("player1");
      expect(state.playerId).toBe("player1");
    });

    it("should return same state on subsequent calls", () => {
      const state1 = store.getState("player1");
      const state2 = store.getState("player1");
      expect(state1).toBe(state2);
    });
  });

  describe("discoverPoi", () => {
    it("should discover new POI", () => {
      store.discoverPoi("player1", "poi:1:1:logging_camp:0");
      expect(store.isDiscovered("player1", "poi:1:1:logging_camp:0")).toBe(true);
    });

    it("should be idempotent", () => {
      store.discoverPoi("player1", "poi:1");
      store.discoverPoi("player1", "poi:1");
      const state = store.getState("player1");
      expect(state.discoveredPoiIds.filter((id) => id === "poi:1").length).toBe(1);
    });
  });

  describe("discoverPois", () => {
    it("should discover multiple POIs", () => {
      store.discoverPois("player1", ["poi:a", "poi:b", "poi:c"]);
      expect(store.isDiscovered("player1", "poi:a")).toBe(true);
      expect(store.isDiscovered("player1", "poi:b")).toBe(true);
      expect(store.isDiscovered("player1", "poi:c")).toBe(true);
    });

    it("should not duplicate existing discoveries while retaining the starter state", () => {
      store.discoverPois("player1", ["poi:a", "poi:b"]);
      store.discoverPois("player1", ["poi:b", "poi:c"]);
      const ids = store.getDiscoveredPoiIds("player1");
      expect(ids).toEqual([
        "campfire_001",
        "furnace_001",
        "poi:a",
        "poi:b",
        "poi:c",
        "village_trader_001",
        "workbench_001",
      ]);
    });
  });

  describe("per-player isolation", () => {
    it("should isolate discoveries between players", () => {
      store.discoverPoi("player1", "poi:1");
      expect(store.isDiscovered("player1", "poi:1")).toBe(true);
      expect(store.isDiscovered("player2", "poi:1")).toBe(false);
    });
  });

  describe("starter POI auto-seeding", () => {
    it("should auto-seed starter POIs for new players", () => {
      const state = store.getState("newPlayer");
      expect(state.discoveredPoiIds).toContain("village_trader_001");
      expect(state.discoveredPoiIds).toContain("campfire_001");
    });

    it("should not auto-seed when disabled", () => {
      const storeNoSeed = new WorldDiscoveryStore({ autoSeedStarterPois: false });
      const state = storeNoSeed.getState("newPlayer");
      expect(state.discoveredPoiIds).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("should return correct discovery counts", () => {
      store.discoverPois("player1", ["poi:a", "poi:b"]);
      store.discoverChunks("player1", ["1:2", "3:4"]);
      const stats = store.getStats("player1");
      expect(stats.discoveredPoiCount).toBe(6); // 4 starter + 2
      expect(stats.discoveredChunkCount).toBe(2);
    });
  });
});

describe("WorldDiscoveryService", () => {
  let service: WorldDiscoveryService;
  let store: WorldDiscoveryStore;

  beforeEach(() => {
    store = new WorldDiscoveryStore({ autoSeedStarterPois: true });
    service = new WorldDiscoveryService(store);
  });

  describe("getChunkKeyFromPosition", () => {
    it("should convert kappa position to chunk key", () => {
      // At kappa (0, 0), chunk should be (0, 0)
      expect(getChunkKeyFromPosition(0, 0)).toBe("0:0");
      // At kappa (64000, 0) - one authoritative 64-tile chunk over in X
      expect(getChunkKeyFromPosition(64000, 0)).toBe("1:0");
      // At kappa (0, 64000) - one authoritative 64-tile chunk over in Z
      expect(getChunkKeyFromPosition(0, 64000)).toBe("0:1");
    });
  });

  describe("getVisibleChunkKeys", () => {
    it("should return 3x3 grid of chunks", () => {
      const keys = getVisibleChunkKeys(8000, 8000); // center of chunk 0,0
      expect(keys.length).toBe(9);
      expect(keys).toContain("0:0");
      expect(keys).toContain("-1:-1");
      expect(keys).toContain("1:1");
    });
  });

  describe("processDiscovery", () => {
    it("should discover POIs within radius", () => {
      const pois: WorldPoiSnapshot[] = [
        {
          id: "poi:near",
          type: "logging_camp",
          title: "Near Camp",
          position: { x: 100, y: 100 },
          chunk: { x: 0, z: 0 },
          interactionRadius: 32,
          tags: [],
        },
      ];

      // Player at (100, 100) - same position as POI
      const newDiscoveries = service.processDiscovery("player1", { x: 100, y: 100 }, pois);
      expect(newDiscoveries).toContain("poi:near");
      expect(service.isPoiDiscovered("player1", "poi:near")).toBe(true);
    });

    it("should not discover POIs outside radius", () => {
      const pois: WorldPoiSnapshot[] = [
        {
          id: "poi:far",
          type: "mining_camp",
          title: "Far Camp",
          position: { x: 96001, y: 0 }, // 96,001 kappa away from player
          chunk: { x: 0, z: 0 },
          interactionRadius: 32,
          tags: [],
        },
      ];

      // Player at (0, 0)
      const newDiscoveries = service.processDiscovery("player1", { x: 0, y: 0 }, pois);
      expect(newDiscoveries).toHaveLength(0);
      expect(service.isPoiDiscovered("player1", "poi:far")).toBe(false);
    });

    it("uses a 96-tile discovery radius expressed in kappa", () => {
      expect(DEFAULT_DISCOVERY_RADIUS).toBe(96000);
      const pois: WorldPoiSnapshot[] = [
        {
          id: "poi:radius_boundary",
          type: "logging_camp",
          title: "Radius Boundary Camp",
          position: { x: 96000, y: 0 },
          chunk: { x: 1, z: 0 },
          interactionRadius: 32,
          tags: [],
        },
      ];

      expect(service.processDiscovery("player1", { x: 0, y: 0 }, pois)).toEqual(["poi:radius_boundary"]);
    });

    it("should be idempotent - second scan no duplicates", () => {
      const pois: WorldPoiSnapshot[] = [
        {
          id: "poi:test",
          type: "logging_camp",
          title: "Test Camp",
          position: { x: 50, y: 50 },
          chunk: { x: 0, z: 0 },
          interactionRadius: 32,
          tags: [],
        },
      ];

      service.processDiscovery("player1", { x: 50, y: 50 }, pois);
      service.processDiscovery("player1", { x: 50, y: 50 }, pois);

      const ids = service.getDiscoveredPoiIds("player1");
      expect(ids.filter((id) => id === "poi:test").length).toBe(1);
    });

    it("should discover chunk when POI is discovered", () => {
      const pois: WorldPoiSnapshot[] = [
        {
          id: "poi:chunk_test",
          type: "fishing_camp",
          title: "Fishing Camp",
          position: { x: 8000, y: 8000 }, // in chunk 0,0
          chunk: { x: 0, z: 0 },
          interactionRadius: 32,
          tags: [],
        },
      ];

      service.processDiscovery("player1", { x: 8000, y: 8000 }, pois);

      const chunks = service.getDiscoveredChunkKeys("player1");
      expect(chunks).toContain("0:0");
    });
  });

  describe("getStats", () => {
    it("should return discovery statistics", () => {
      store.discoverPois("player1", ["poi:a", "poi:b"]);
      store.discoverChunks("player1", ["1:2", "3:4", "5:6"]);

      const stats = service.getStats("player1");
      expect(stats.discoveredPoiCount).toBeGreaterThanOrEqual(2);
      expect(stats.discoveredChunkCount).toBe(3);
    });
  });
});

describe("Discovery Integration", () => {
  let service: WorldDiscoveryService;
  let store: WorldDiscoveryStore;

  beforeEach(() => {
    store = new WorldDiscoveryStore({ autoSeedStarterPois: true });
    service = new WorldDiscoveryService(store);
  });

  it("should have starter POIs visible by default", () => {
    const state = service.getState("player1");
    expect(state.discoveredPoiIds).toContain("village_trader_001");
    expect(state.discoveredPoiIds).toContain("campfire_001");
    expect(state.discoveredPoiIds).toContain("furnace_001");
    expect(state.discoveredPoiIds).toContain("workbench_001");
  });

  it("should persist discovery state correctly", () => {
    service.processDiscovery("player1", { x: 100, y: 100 }, [
      {
        id: "poi:new",
        type: "logging_camp",
        title: "New Camp",
        position: { x: 100, y: 100 },
        chunk: { x: 0, z: 0 },
        interactionRadius: 32,
        tags: [],
      },
    ]);

    const state = service.getState("player1");
    expect(state.discoveredPoiIds).toContain("poi:new");
  });
});
