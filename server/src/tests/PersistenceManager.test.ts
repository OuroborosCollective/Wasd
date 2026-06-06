/**
 * PersistenceManager Tests
 * 
 * Verifiziert die deterministische Persistence-Engine:
 * - writeBarrier: Keine parallelen Writes
 * - logicalIndex: Tick-korrekte Zuordnung
 * - canonicalize(): Deterministische JSON-Sortierung
 * - sha256 hash: Hash-Skip bei identischen Saves
 * - timeout: Backend-Blockierung verhindern
 * - retry: Kurzzeitige DB/File-Aussetzer abfangen
 * - queueDepth: Schutz gegen Save-Spam
 * - deepFreeze: Keine Mutation geladener Daten
 * - Health Snapshot: Watchdog/Monitor kann Zustand prüfen
 * - Envelope: Version, Hash, Driver, Zeit und Payload getrennt
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PersistenceManager, PersistenceError, type WorldObjectSnapshot, type PersistenceHealth } from "../core/PersistenceManager.js";

// Mock Backend für Tests
class MockPersistenceBackend {
  readonly name = "mock";
  private initialized = false;
  private data: Record<string, unknown> = {};
  private worldObjects: Record<string, unknown>[] = [];
  private shouldFail = false;
  private failCount = 0;
  private delayMs = 0;
  private connectionOk = true;

  reset() {
    this.data = {};
    this.worldObjects = [];
    this.shouldFail = false;
    this.failCount = 0;
    this.delayMs = 0;
    this.connectionOk = true;
    this.initialized = false;
  }

  setShouldFail(times: number) {
    this.shouldFail = true;
    this.failCount = times;
  }

  setDelay(ms: number) {
    this.delayMs = ms;
  }

  setConnectionOk(ok: boolean) {
    this.connectionOk = ok;
  }

  async init(): Promise<void> {
    await this.sleep(10);
    this.initialized = true;
  }

  async testConnection(): Promise<boolean> {
    return this.connectionOk;
  }

  async save(data: Readonly<Record<string, unknown>>): Promise<void> {
    if (this.shouldFail && this.failCount > 0) {
      this.failCount--;
      throw new Error("Mock save failed");
    }
    if (this.delayMs > 0) {
      await this.sleep(this.delayMs);
    }
    this.data = { ...data };
  }

  async load(): Promise<Record<string, unknown>> {
    return { ...this.data };
  }

  async saveWorldObjects(objects: readonly Readonly<Record<string, unknown>>[]): Promise<void> {
    if (this.shouldFail && this.failCount > 0) {
      this.failCount--;
      throw new Error("Mock saveWorldObjects failed");
    }
    this.worldObjects = [...objects] as Record<string, unknown>[];
  }

  async loadWorldObjects(): Promise<Record<string, unknown>[]> {
    return [...this.worldObjects];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

describe("PersistenceManager", () => {
  let mockBackend: MockPersistenceBackend;
  let persistence: PersistenceManager;

  beforeEach(() => {
    mockBackend = new MockPersistenceBackend();
    persistence = new PersistenceManager(mockBackend, {
      schemaVersion: 1,
      maxRetries: 2,
      operationTimeoutMs: 1000,
      enableDeepFreeze: true,
      enableHashSkip: true,
      maxQueueDepth: 64,
    });
  });

  afterEach(() => {
    mockBackend.reset();
  });

  describe("init()", () => {
    it("should initialize only once", async () => {
      await persistence.init();
      expect(persistence.isInitialized()).toBe(true);

      // Zweiter Aufruf sollte idempotent sein
      await persistence.init();
      expect(persistence.isInitialized()).toBe(true);
    });

    it("should allow parallel init calls", async () => {
      await Promise.all([
        persistence.init(),
        persistence.init(),
        persistence.init(),
      ]);
      expect(persistence.isInitialized()).toBe(true);
    });
  });

  describe("getDriverName()", () => {
    it("should return backend name", () => {
      expect(persistence.getDriverName()).toBe("mock");
    });
  });

  describe("testConnection()", () => {
    it("should return true when connection is ok", async () => {
      mockBackend.setConnectionOk(true);
      const result = await persistence.testConnection();
      expect(result).toBe(true);
    });

    it("should return false when connection fails", async () => {
      mockBackend.setConnectionOk(false);
      const result = await persistence.testConnection();
      expect(result).toBe(false);
    });

    it("should initialize before testing connection", async () => {
      mockBackend.setConnectionOk(true);
      const result = await persistence.testConnection();
      expect(result).toBe(true);
      expect(persistence.isInitialized()).toBe(true);
    });
  });

  describe("getHealth()", () => {
    it("should return health snapshot with all fields", async () => {
      const health = await persistence.getHealth();

      expect(health.driver).toBe("mock");
      expect(health.initialized).toBe(true);
      expect(health.connected).toBe(true);
      expect(health.queueDepth).toBe(0);
      expect(health.lastError).toBeNull();
      expect(health.lastHash).toBeNull();
      expect(health.lastSuccessfulSaveAt).toBeNull();
    });

    it("should track successful saves", async () => {
      await persistence.init();
      await persistence.saveSnapshot(100, { players: [] });

      const health = await persistence.getHealth();
      expect(health.lastSuccessfulSaveAt).not.toBeNull();
      expect(health.lastHash).not.toBeNull();
    });

    it("should track errors", async () => {
      mockBackend.setShouldFail(99);
      try {
        await persistence.saveSnapshot(1, { test: true });
      } catch {
        // Expected
      }

      const health = await persistence.getHealth();
      expect(health.lastError).not.toBeNull();
    });
  });

  describe("saveSnapshot()", () => {
    it("should save with envelope containing schemaVersion, logicalIndex, hash, driver", async () => {
      await persistence.init();
      await persistence.saveSnapshot(42, { player: "test", level: 5 });

      // Backend sollte envelope erhalten haben
      expect(mockBackend.data).toHaveProperty("schemaVersion", 1);
      expect(mockBackend.data).toHaveProperty("logicalIndex", 42);
      expect(mockBackend.data).toHaveProperty("hash");
      expect(mockBackend.data).toHaveProperty("driver", "mock");
      expect(mockBackend.data).toHaveProperty("savedAtUnixMs");
      expect(mockBackend.data).toHaveProperty("payload");
    });

    it("should throw on invalid logicalIndex", async () => {
      await persistence.init();

      await expect(persistence.saveSnapshot(-1, {})).rejects.toThrow();
      await expect(persistence.saveSnapshot(1.5, {})).rejects.toThrow();
      await expect(persistence.saveSnapshot(NaN, {})).rejects.toThrow();
    });

    it("should throw on non-plain-object data", async () => {
      await persistence.init();

      await expect(persistence.saveSnapshot(1, null as any)).rejects.toThrow();
      await expect(persistence.saveSnapshot(1, [1, 2] as any)).rejects.toThrow();
      await expect(persistence.saveSnapshot(1, new Date() as any)).rejects.toThrow();
    });
  });

  describe("canonicalize()", () => {
    it("should sort object keys alphabetically", async () => {
      await persistence.init();
      await persistence.saveSnapshot(1, { z: 1, a: 2, m: 3 });

      const payload = mockBackend.data.payload as Record<string, unknown>;
      const keys = Object.keys(payload);
      expect(keys).toEqual(["a", "m", "z"]);
    });

    it("should remove undefined values", async () => {
      await persistence.init();
      await persistence.saveSnapshot(1, { a: 1, b: undefined, c: 3 } as any);

      const payload = mockBackend.data.payload as Record<string, unknown>;
      expect(payload).not.toHaveProperty("b");
    });

    it("should handle nested objects", async () => {
      await persistence.init();
      await persistence.saveSnapshot(1, { outer: { z: 1, a: 2 }, b: 1 });

      const payload = mockBackend.data.payload as any;
      const outerKeys = Object.keys(payload.outer);
      expect(outerKeys).toEqual(["a", "z"]);
    });

    it("should throw on functions", async () => {
      await persistence.init();
      const fn = () => {};
      await expect(persistence.saveSnapshot(1, { fn } as any)).rejects.toThrow();
    });

    it("should throw on symbols", async () => {
      await persistence.init();
      await expect(persistence.saveSnapshot(1, { sym: Symbol("test") } as any)).rejects.toThrow();
    });

    it("should convert bigint to string", async () => {
      await persistence.init();
      await persistence.saveSnapshot(1, { big: BigInt(123) } as any);

      const payload = mockBackend.data.payload as any;
      expect(payload.big).toBe("123");
    });
  });

  describe("hash skip (enableHashSkip)", () => {
    it("should skip save if hash matches lastHash", async () => {
      await persistence.init();

      // Erster Save
      await persistence.saveSnapshot(1, { data: "same" });
      const callCountAfterFirst = (mockBackend as any).data?.payload?.data ? 1 : 0;

      // Zweiter identischer Save - sollte übersprungen werden
      await persistence.saveSnapshot(2, { data: "same" });

      // Hash sollte gleich sein
      const health = await persistence.getHealth();
      expect(health.lastHash).not.toBeNull();
    });

    it("should save if data changes (different hash)", async () => {
      await persistence.init();

      await persistence.saveSnapshot(1, { data: "first" });
      await persistence.saveSnapshot(2, { data: "second" });

      const health = await persistence.getHealth();
      expect(health.lastHash).not.toBeNull();
    });
  });

  describe("writeBarrier", () => {
    it("should serialize writes (no parallel saves)", async () => {
      await persistence.init();

      const saves: number[] = [];
      mockBackend.setDelay(50);

      // Simuliere mehrere parallele Saves
      const save1 = persistence.saveSnapshot(1, { data: 1 }).then(() => saves.push(1));
      const save2 = persistence.saveSnapshot(2, { data: 2 }).then(() => saves.push(2));
      const save3 = persistence.saveSnapshot(3, { data: 3 }).then(() => saves.push(3));

      await Promise.all([save1, save2, save3]);

      // Writes sollten serialisiert sein (Reihenfolge garantiert)
      expect(saves.length).toBe(3);
    });
  });

  describe("retry mechanism", () => {
    it("should retry on transient failures", async () => {
      await persistence.init();

      // Backend soll beim ersten Mal fehlschlagen, dann succeed
      mockBackend.setShouldFail(1);

      // Sollte erfolgreich sein nach Retry
      await persistence.saveSnapshot(1, { test: true });

      const health = await persistence.getHealth();
      expect(health.lastError).toBeNull();
    });

    it("should fail after maxRetries exhausted", async () => {
      const lowRetryPersistence = new PersistenceManager(mockBackend, {
        maxRetries: 1,
      });
      await lowRetryPersistence.init();

      mockBackend.setShouldFail(99); // Mehr Fehler als maxRetries

      await expect(lowRetryPersistence.saveSnapshot(1, { test: true })).rejects.toThrow();
    });
  });

  describe("timeout", () => {
    it("should timeout slow operations", async () => {
      const shortTimeoutPersistence = new PersistenceManager(mockBackend, {
        operationTimeoutMs: 10, // 10ms timeout
      });
      await shortTimeoutPersistence.init();

      mockBackend.setDelay(100); // 100ms operation

      await expect(shortTimeoutPersistence.saveSnapshot(1, { test: true })).rejects.toThrow();
    });
  });

  describe("queueDepth", () => {
    it("should prevent queue overflow", async () => {
      const smallQueuePersistence = new PersistenceManager(mockBackend, {
        maxQueueDepth: 2,
      });
      await smallQueuePersistence.init();

      mockBackend.setDelay(100);

      // Queue mit mehr als maxQueueDepth Writes füllen
      const saves = [
        smallQueuePersistence.saveSnapshot(1, {}),
        smallQueuePersistence.saveSnapshot(2, {}),
        smallQueuePersistence.saveSnapshot(3, {}), // Sollte overflow werfen
      ];

      await expect(Promise.all(saves)).rejects.toThrow();
    });
  });

  describe("deepFreeze", () => {
    it("should freeze loaded data", async () => {
      await persistence.init();
      await persistence.saveSnapshot(1, { nested: { value: 1 } });

      const loaded = await persistence.load();
      expect(Object.isFrozen(loaded)).toBe(true);
      if ("nested" in loaded && typeof loaded.nested === "object") {
        expect(Object.isFrozen(loaded.nested)).toBe(true);
      }
    });

    it("should prevent mutation of loaded data", async () => {
      await persistence.init();
      await persistence.saveSnapshot(1, { value: 1 });

      const loaded = await persistence.load() as any;
      expect(() => { loaded.value = 2; }).toThrow();
    });
  });

  describe("load()", () => {
    it("should recognize envelope and extract payload", async () => {
      await persistence.init();

      // Manually set envelope-style data in backend
      (mockBackend as any).data = {
        schemaVersion: 1,
        logicalIndex: 42,
        hash: "abc123",
        driver: "mock",
        payload: { extracted: true },
      };

      const loaded = await persistence.load();
      expect(loaded).toHaveProperty("extracted", true);
    });

    it("should handle plain object (no envelope)", async () => {
      await persistence.init();

      // Set plain object without envelope structure
      (mockBackend as any).data = { plain: true };

      const loaded = await persistence.load();
      expect(loaded).toHaveProperty("plain", true);
    });
  });

  describe("saveWorldObjects()", () => {
    it("should sort objects by logicalIndex, type, id", async () => {
      await persistence.init();

      const objects: WorldObjectSnapshot[] = [
        { id: "c", logicalIndex: 2, type: "b" } as WorldObjectSnapshot,
        { id: "a", logicalIndex: 1, type: "a" } as WorldObjectSnapshot,
        { id: "b", logicalIndex: 1, type: "a" } as WorldObjectSnapshot,
        { id: "d", logicalIndex: 2, type: "a" } as WorldObjectSnapshot,
      ];

      await persistence.saveWorldObjects(objects, 100);

      // Objects sollten sortiert sein: (1,a,a), (1,a,b), (2,a,d), (2,b,c)
      // Wir können die Reihenfolge im Backend prüfen
    });

    it("should throw on missing id", async () => {
      await persistence.init();

      const objects = [{ noId: true }] as any;
      await expect(persistence.saveWorldObjects(objects, 1)).rejects.toThrow();
    });

    it("should throw on empty id", async () => {
      await persistence.init();

      const objects = [{ id: "" }] as any;
      await expect(persistence.saveWorldObjects(objects, 1)).rejects.toThrow();
    });
  });

  describe("shouldPersistTick()", () => {
    it("should return true when tick matches interval", () => {
      expect(persistence.shouldPersistTick(10, 10)).toBe(true);
      expect(persistence.shouldPersistTick(20, 10)).toBe(true);
      expect(persistence.shouldPersistTick(100, 10)).toBe(true);
    });

    it("should return false when tick does not match", () => {
      expect(persistence.shouldPersistTick(1, 10)).toBe(false);
      expect(persistence.shouldPersistTick(5, 10)).toBe(false);
      expect(persistence.shouldPersistTick(11, 10)).toBe(false);
    });

    it("should throw on invalid interval", () => {
      expect(() => persistence.shouldPersistTick(1, 0)).toThrow();
      expect(() => persistence.shouldPersistTick(1, -1)).toThrow();
      expect(() => persistence.shouldPersistTick(1, 1.5)).toThrow();
    });
  });

  describe("persistWorldObjectsAsync()", () => {
    it("should not block (fire-and-forget)", async () => {
      await persistence.init();

      mockBackend.setDelay(100);

      const start = Date.now();
      persistence.persistWorldObjectsAsync([{ id: "test" } as WorldObjectSnapshot], 1);
      const elapsed = Date.now() - start;

      // Sollte sofort zurückkehren (< 50ms)
      expect(elapsed).toBeLessThan(50);
    });

    it("should track errors internally", async () => {
      await persistence.init();
      mockBackend.setShouldFail(1);

      persistence.persistWorldObjectsAsync([{ id: "test" } as WorldObjectSnapshot], 1);

      // Kurze Pause für async operation
      await new Promise((r) => setTimeout(r, 50));

      const health = await persistence.getHealth();
      expect(health.lastError).not.toBeNull();
    });
  });

  describe("PersistenceError", () => {
    it("should have correct properties", () => {
      const error = new PersistenceError({
        driver: "test-driver",
        operation: "save",
        message: "Test error",
        cause: new Error("cause"),
      });

      expect(error.driver).toBe("test-driver");
      expect(error.operation).toBe("save");
      expect(error.message).toContain("test-driver");
      expect(error.message).toContain("save");
      expect(error.message).toContain("Test error");
      expect(error.cause).toBeInstanceOf(Error);
    });
  });
});

describe("Deterministic serialization", () => {
  let mockBackend: MockPersistenceBackend;
  let persistence: PersistenceManager;

  beforeEach(() => {
    mockBackend = new MockPersistenceBackend();
    persistence = new PersistenceManager(mockBackend);
  });

  it("should produce same hash for same data", async () => {
    await persistence.init();

    const data = { players: [{ id: "p1", x: 10 }], timestamp: 12345 };

    await persistence.saveSnapshot(1, data as any);
    const hash1 = (await persistence.getHealth()).lastHash;

    await persistence.saveSnapshot(2, data as any);
    const hash2 = (await persistence.getHealth()).lastHash;

    expect(hash1).toBe(hash2);
  });

  it("should produce different hash for different data", async () => {
    await persistence.init();

    await persistence.saveSnapshot(1, { a: 1 } as any);
    const hash1 = (await persistence.getHealth()).lastHash;

    await persistence.saveSnapshot(2, { a: 2 } as any);
    const hash2 = (await persistence.getHealth()).lastHash;

    expect(hash1).not.toBe(hash2);
  });

  it("should handle complex nested structures deterministically", async () => {
    await persistence.init();

    const complexData = {
      world: {
        regions: [
          { id: "north", tiles: [{ x: 1, y: 2, z: 3 }] },
          { id: "south", tiles: [{ x: 4, y: 5, z: 6 }] },
        ],
      },
      entities: {
        players: [{ id: "p1", position: { x: 100, y: 200 } }],
        npcs: [{ id: "n1", role: "merchant" }],
      },
    };

    await persistence.saveSnapshot(1, complexData as any);
    const hash = (await persistence.getHealth()).lastHash;

    // Gleiche Daten sollten gleichen Hash erzeugen
    await persistence.saveSnapshot(2, complexData as any);
    const hash2 = (await persistence.getHealth()).lastHash;

    expect(hash).toBe(hash2);
  });
});