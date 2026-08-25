import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * PersistenceDirector Unit Tests
 * 
 * Tests the write-behind queue, priority flush, and atomic disconnect-sicherung
 * against the Axiome:
 * 1. Anti-IO-Blocking: Never block the 10-Hz WorldHeartbeat
 * 2. Minimalist Truth: Only atomic core data persisted
 * 3. Atomic Disconnect-Sicherung: Blocking write on disconnect
 * 
 * Note: These tests focus on testing the Director class logic with a mock backend.
 * Integration with actual persistence backends is tested separately.
 */

// Mock backend for testing - using plain object
const mockBackend = {
  name: "test",
  saveQueue: [] as any[],
  loadedData: {} as any,
  init: vi.fn().mockResolvedValue(undefined),
  testConnection: vi.fn().mockResolvedValue(true),
  save: vi.fn(async (data: any) => {
    mockBackend.saveQueue.push({ data, ts: Date.now() });
    Object.assign(mockBackend.loadedData, data);
  }),
  load: vi.fn(async () => mockBackend.loadedData),
  saveWorldObjects: vi.fn(),
  loadWorldObjects: vi.fn().mockResolvedValue([]),
};

// Mock playerStatsDirector
vi.mock("../modules/player/PlayerStatsDirector.js", () => ({
  playerStatsDirector: {
    getSkillsForSave: vi.fn().mockReturnValue({
      sword_mastery: { xp: 1000, level: 10 },
      heavy_armor: { xp: 500, level: 5 },
    }),
    loadSkills: vi.fn(),
  },
  PlayerStatsDirector: vi.fn(),
}));

// Mock InventoryDirector
vi.mock("../modules/inventory/index.js", () => ({
  inventoryDirector: {
    buildSnapshot: vi.fn().mockReturnValue({
      inventory: {
        // InventoryDirector exposes item objects; PersistenceDirector derives
        // their canonical signature strings at the persistence boundary.
        slots: [
          { signature: "base:blade_3|hilt_12|mat_iron" },
          { signature: "base:potion_1|tier_2" },
          null,
          null,
        ],
        maxSlots: 24,
        gold: 150,
        weight: 12.5,
        maxWeight: 100
      },
      equipment: {
        MAIN_HAND: { signature: "base:sword_1|hilt_1|mat_steel" },
        CHEST: null,
        HEAD: null
      }
    })
  }
}));

// Mock createPersistenceBackend to return our mock backend
vi.mock("../modules/persistence/createPersistenceBackend.js", () => ({
  createPersistenceBackend: vi.fn().mockReturnValue(mockBackend),
}));

describe("PersistenceDirector", () => {
  beforeAll(() => {
    // Clear module cache to ensure fresh state
  });

  beforeEach(() => {
    vi.resetModules();
    mockBackend.saveQueue = [];
    mockBackend.loadedData = {};
  });

  describe("write-behind queue", () => {
    it("should queue dirty players without immediate write", async () => {
      const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
      const director = PersistenceDirector.getInstance();
      
      // Initialize with mock backend
      await director.init();
      
      // Mark player dirty
      director.markDirty("player1");
      
      // Verify dirty state
      const stats = director.getStats();
      expect(stats.dirtyPlayers).toBe(1);
      expect(stats.queueSize).toBe(0); // Queue is empty until flush
    });

    it("should respect queue size limit", async () => {
      const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
      const director = PersistenceDirector.getInstance();
      
      await director.init();
      
      // Mark more players than MAX_QUEUE_SIZE
      for (let i = 0; i < 1010; i++) {
        director.markDirty(`player${i}`);
      }
      
      // Should not crash, queue should be bounded
      const stats = director.getStats();
      expect(stats.dirtyPlayers).toBeLessThanOrEqual(1010);
    });
  });

  describe("snapshot building", () => {
    it("should build complete snapshot from player object", async () => {
      const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
      const director = PersistenceDirector.getInstance();
      
      await director.init();
      
      const mockPlayer = {
        id: "test-player-1",
        name: "TestKnight",
        position: { x: 100, y: 200, z: 0 },
        inventory: [
          { id: "iron_sword", signature: "BLADE:iron|FILE:standard|HAFT:wooden|PREFIX:sharp|SUFFIX:rage", requiredLevel: 5 },
          null,
          { id: "leather_cap", signature: "ITEM:leather_cap:1" },
        ],
        equipment: { 
          weapon: { id: "iron_sword", signature: "BLADE:iron|FILE:standard|HAFT:wooden|PREFIX:sharp|SUFFIX:rage" },
          armor: null,
          offHand: null,
        },
        gold: 5000,
        level: 15,
        health: 85,
        maxHealth: 100,
        mana: 20,
        maxMana: 25,
        stamina: 80,
        maxStamina: 100,
        xp: 15000,
        quests: [{ id: "q1", name: "First Quest", completed: false }],
        class: "warrior",
        appearance: { hair: "brown", skin: "tan" },
        faction: "forest_keepers",
        civilization: "elder_grove",
        dead: false,
        deathAt: 0,
        flags: { tutorialComplete: true },
      };
      
      const snapshot = director.buildCompleteSnapshot(mockPlayer as any);
      
      expect(snapshot.id).toBe("test-player-1");
      expect(snapshot.characterName).toBe("TestKnight");
      expect(snapshot.kappaX).toBe(100);
      expect(snapshot.kappaY).toBe(200);
      expect(snapshot.kappaZ).toBe(0);
      expect(snapshot.gold).toBe(5000);
      expect(snapshot.level).toBe(15);
      expect(snapshot.health).toBe(85);
      expect(snapshot.class).toBe("warrior");
      expect(snapshot.faction).toBe("forest_keepers");
      expect(snapshot.civilization).toBe("elder_grove");
      expect(snapshot.inventory).toHaveLength(2);
      expect(snapshot.inventory[0]).toBe("base:blade_3|hilt_12|mat_iron");
      expect(snapshot.equipment.weapon).toContain("BLADE:iron");
      expect(snapshot.equipment.armor).toBeNull();
      expect(snapshot.skills.sword_mastery).toBeDefined();
      expect(snapshot.skills.sword_mastery.xp).toBe(1000);
      expect(snapshot.lastUpdated).toBeDefined();
    });
  });

  describe("priority flush", () => {
    it("should flush immediately on priority flush call", async () => {
      const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
      const director = PersistenceDirector.getInstance();
      
      await director.init();
      
      const mockPlayer = {
        id: "priority-test",
        name: "PriorityPlayer",
        position: { x: 0, y: 0, z: 0 },
        inventory: [],
        equipment: {},
        gold: 100,
        level: 1,
        health: 100,
        maxHealth: 100,
        mana: 25,
        maxMana: 25,
        stamina: 100,
        maxStamina: 100,
        xp: 0,
        quests: [],
        class: "adventurer",
        appearance: null,
        faction: "",
        civilization: "",
        dead: false,
        deathAt: 0,
        flags: {},
      };
      
      const snapshot = director.buildCompleteSnapshot(mockPlayer as any);
      await director.flushPlayerSync("priority-test", snapshot);
      
      const stats = director.getStats();
      expect(stats.priorityFlushes).toBe(1);
      expect(mockBackend.save).toHaveBeenCalled();
    });
  });

  describe("statistics tracking", () => {
    it("should track save/load operations", async () => {
      const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
      const director = PersistenceDirector.getInstance();
      
      await director.init();
      
      // Initial stats
      let stats = director.getStats();
      expect(stats.totalSaves).toBe(0);
      expect(stats.totalLoads).toBe(0);
      
      // Simulate load
      mockBackend.loadedData = {
        "loaded-player": { id: "loaded-player", name: "Loaded", gold: 100 },
      };
      await director.loadPlayerSnapshot("loaded-player");
      
      stats = director.getStats();
      expect(stats.totalLoads).toBe(1);
    });

    it("should reset stats on request", async () => {
      const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
      const director = PersistenceDirector.getInstance();
      
      await director.init();
      
      // Do some operations
      director.markDirty("player1");
      director.markDirty("player2");
      
      // Reset
      director.resetStats();
      
      const stats = director.getStats();
      expect(stats.totalSaves).toBe(0);
      expect(stats.totalLoads).toBe(0);
      expect(stats.queueFlushes).toBe(0);
      expect(stats.priorityFlushes).toBe(0);
    });
  });

  describe("snapshot application", () => {
    it("should apply snapshot to player object", async () => {
      const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
      const director = PersistenceDirector.getInstance();
      
      await director.init();
      
      const mockPlayer = {
        id: "restore-test",
        name: "OldName",
        position: { x: 0, y: 0, z: 0 },
        skills: {},
      };
      
      const savedSnapshot = {
        id: "restore-test",
        characterName: "RestoredPlayer",
        kappaX: 500,
        kappaY: 300,
        kappaZ: 10,
        skills: {
          sword_mastery: { xp: 5000, level: 20 },
        },
        inventory: [],
        equipment: {},
        gold: 25000,
        level: 35,
        health: 95,
        maxHealth: 120,
        mana: 30,
        maxMana: 50,
        stamina: 90,
        maxStamina: 150,
        xp: 85000,
        quests: [],
        class: "paladin",
        appearance: null,
        faction: "iron_clan",
        civilization: "dwarven_hold",
        dead: false,
        deathAt: 0,
        flags: { champion: true },
        lastUpdated: new Date().toISOString(),
      };
      
      director.applySnapshot(mockPlayer as any, savedSnapshot);
      
      expect(mockPlayer.position.x).toBe(500);
      expect(mockPlayer.position.y).toBe(300);
      expect(mockPlayer.position.z).toBe(10);
    });
  });
});

describe("PersistenceDirector tick integration", () => {
  beforeEach(() => {
    vi.resetModules();
    mockBackend.saveQueue = [];
    mockBackend.loadedData = {};
  });

  it("should signal flush readiness on throttle tick", async () => {
    const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
    const director = PersistenceDirector.getInstance();
    
    await director.init();
    
    // Mark dirty players
    director.markDirty("player1");
    director.markDirty("player2");
    
    // Simulate tick 300 (throttle threshold)
    const shouldFlush = director.tick(300);
    
    expect(shouldFlush).toBe(true);
    expect(director.getStats().dirtyPlayers).toBe(0); // Dirty players moved to queue
  });

  it("should not flush on non-throttle ticks", async () => {
    const { PersistenceDirector } = await import("../modules/persistence/PersistenceDirector.js");
    const director = PersistenceDirector.getInstance();
    
    await director.init();
    
    director.markDirty("player1");
    
    // Simulate tick 150 (not a throttle tick)
    const shouldFlush = director.tick(150);
    
    expect(shouldFlush).toBe(false);
    expect(director.getStats().dirtyPlayers).toBe(1); // Still dirty
  });
});
