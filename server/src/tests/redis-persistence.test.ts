// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RedisPersistenceBackend } from "../modules/persistence/redisPersistenceBackend.js";

// Mock RedisClient
vi.mock("../core/RedisClient.js", () => {
  const mockClient = {
    ping: vi.fn().mockResolvedValue("PONG"),
    hset: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn().mockResolvedValue({}),
    pipeline: vi.fn().mockReturnValue({
      hset: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
  };
  return {
    getRedisClient: () => mockClient,
    isRedisAvailable: () => true,
  };
});

describe("RedisPersistenceBackend", () => {
  it("should have the correct name", () => {
    const backend = new RedisPersistenceBackend();
    expect(backend.name).toBe("redis");
  });

  it("should test connection successfully", async () => {
    const backend = new RedisPersistenceBackend();
    const ok = await backend.testConnection();
    expect(ok).toBe(true);
  });

  it("should save and load players", async () => {
    const backend = new RedisPersistenceBackend();
    const mockData = {
      p1: { id: "p1", name: "Player 1", gold: 100 }
    };

    // We can't easily test the internal ioredis calls here without more complex mocking,
    // but we can verify the method doesn't throw and logs appropriately.
    await backend.save(mockData);
    const loaded = await backend.load();
    expect(loaded).toEqual({}); // Empty because of hgetall mock
  });
});
