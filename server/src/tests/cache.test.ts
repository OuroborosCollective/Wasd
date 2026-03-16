import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cache } from "../core/Cache.js";

describe("Cache Module", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should set and get a value", async () => {
    cache.set("testKey1", "testValue");
    const value = await cache.get("testKey1");
    expect(value).toBe("testValue");
  });

  it("should return null for non-existent key", async () => {
    const value = await cache.get("nonExistent");
    expect(value).toBeNull();
  });

  it("should delete a value", async () => {
    cache.set("deleteKey", "toDelete");
    cache.del("deleteKey");
    const value = await cache.get("deleteKey");
    expect(value).toBeNull();
  });

  it("should expire a value with default TTL", async () => {
    cache.set("expireKey", "willExpire");
    // Default TTL is 60 seconds
    vi.advanceTimersByTime(60001); // 60.001 seconds
    const value = await cache.get("expireKey");
    expect(value).toBeNull();
  });

  it("should expire a value with custom TTL", async () => {
    cache.set("customExpire", "willExpireSoon", "EX", 10);
    // Custom TTL is 10 seconds
    vi.advanceTimersByTime(10001);
    const value = await cache.get("customExpire");
    expect(value).toBeNull();
  });

  it("should keep value before custom TTL expires", async () => {
    cache.set("customKeep", "willKeep", "EX", 10);
    vi.advanceTimersByTime(5000);
    const value = await cache.get("customKeep");
    expect(value).toBe("willKeep");
  });


  it("should keep value at exact TTL expiration boundary", async () => {
    cache.set("exactBoundary", "boundaryValue", "EX", 10);
    vi.advanceTimersByTime(10000); // exactly 10 seconds
    const value = await cache.get("exactBoundary");
    expect(value).toBe("boundaryValue");
  });

  it("should fallback to default TTL when ttl is 0", async () => {
    cache.set("ttlZero", "zeroValue", "EX", 0);
    // Default TTL is 60 seconds
    vi.advanceTimersByTime(60001);
    const value = await cache.get("ttlZero");
    expect(value).toBeNull();
  });
});
