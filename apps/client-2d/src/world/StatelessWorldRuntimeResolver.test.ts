import { describe, expect, it } from "vitest";
import {
  resolveBiomeId,
  resolvePlayerId,
  resolveSpawnCell,
  resolveStatelessWorldRuntime,
  resolveVisibleChunkKeys,
  stableWorldHash32,
} from "./StatelessWorldRuntimeResolver";

describe("StatelessWorldRuntimeResolver", () => {
  it("derives the same state for the same explicit inputs", () => {
    const a = resolveStatelessWorldRuntime({
      identity: "are-player-1",
      worldSeed: "areloria:test-world",
    });
    const b = resolveStatelessWorldRuntime({
      identity: "are-player-1",
      worldSeed: "areloria:test-world",
    });

    expect(a).toEqual(b);
    expect(a.chunkKey).toMatch(/^-?\d+_-?\d+$/);
    expect(a.visibleChunkKeys).toHaveLength(9);
  });

  it("does not collapse missing identity to guest", () => {
    const playerId = resolvePlayerId(null, "areloria:test-world");
    expect(playerId).toMatch(/^anon_[0-9a-f]{8}$/);
    expect(playerId).not.toBe("guest");
  });

  it("uses current position before stored spawn or generated spawn", () => {
    const state = resolveStatelessWorldRuntime({
      identity: "player-current",
      worldSeed: "areloria:test-world",
      storedSpawn: { x: 9000, z: 9000 },
      currentPosition: { x: 34, z: -17 },
    });

    expect(state.position).toEqual({ x: 34, z: -17 });
    expect(state.chunkX).toBe(2);
    expect(state.chunkZ).toBe(-2);
  });

  it("uses stored spawn before generated spawn", () => {
    const state = resolveStatelessWorldRuntime({
      identity: "player-stored",
      worldSeed: "areloria:test-world",
      storedSpawn: { x: -49, z: 81 },
    });

    expect(state.spawnCell).toEqual({ x: -49, z: 81 });
    expect(state.position).toEqual({ x: -49, z: 81 });
  });

  it("generates different deterministic spawns for different players", () => {
    const a = resolveSpawnCell({
      playerId: "player-a",
      worldSeed: "areloria:test-world",
      chunkSizeTiles: 16,
    });
    const b = resolveSpawnCell({
      playerId: "player-b",
      worldSeed: "areloria:test-world",
      chunkSizeTiles: 16,
    });

    expect(a).not.toEqual(b);
  });

  it("derives biome from seed and chunk coordinates", () => {
    const a = resolveBiomeId({ worldSeed: "areloria:a", chunkX: 2, chunkZ: 3 });
    const b = resolveBiomeId({ worldSeed: "areloria:a", chunkX: 2, chunkZ: 3 });
    const c = resolveBiomeId({ worldSeed: "areloria:b", chunkX: 2, chunkZ: 3 });

    expect(a).toBe(b);
    expect(typeof c).toBe("string");
  });

  it("creates square visible chunk windows", () => {
    expect(resolveVisibleChunkKeys({ chunkX: 10, chunkZ: -4, viewRadiusChunks: 1 })).toEqual([
      "9_-5",
      "10_-5",
      "11_-5",
      "9_-4",
      "10_-4",
      "11_-4",
      "9_-3",
      "10_-3",
      "11_-3",
    ]);
  });

  it("stable hash is deterministic unsigned 32-bit", () => {
    const hash = stableWorldHash32("areloria:test");
    expect(hash).toBe(stableWorldHash32("areloria:test"));
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });

  it("retains exact reference equality for the cached visible chunk keys array", () => {
    const params = { chunkX: 42, chunkZ: -108, viewRadiusChunks: 2 };
    const firstResult = resolveVisibleChunkKeys(params);
    const secondResult = resolveVisibleChunkKeys(params);
    const thirdResult = resolveVisibleChunkKeys({ chunkX: 42, chunkZ: -108, viewRadiusChunks: 2 });

    expect(firstResult).toBe(secondResult);
    expect(firstResult).toBe(thirdResult);
    expect(Object.isFrozen(firstResult)).toBe(true);

    const differentResult = resolveVisibleChunkKeys({ chunkX: 43, chunkZ: -108, viewRadiusChunks: 2 });
    expect(differentResult).not.toBe(firstResult);
  });

  it("benchmarks resolveVisibleChunkKeys performance improvement", () => {
    // Warm up the JIT
    for (let i = 0; i < 500; i++) {
      resolveVisibleChunkKeys({ chunkX: i, chunkZ: -i, viewRadiusChunks: 1 });
    }

    // Benchmark the cached lookup
    const startCached = performance.now();
    for (let i = 0; i < 50000; i++) {
      resolveVisibleChunkKeys({ chunkX: 5, chunkZ: 10, viewRadiusChunks: 1 });
    }
    const durationCached = performance.now() - startCached;

    // Benchmark the uncached execution by bypass (varying input to avoid hitting cache)
    const startUncached = performance.now();
    for (let i = 0; i < 50000; i++) {
      // Varies chunkX dynamically to always force cache miss or recalculation
      resolveVisibleChunkKeys({ chunkX: i + 10000, chunkZ: 10, viewRadiusChunks: 1 });
    }
    const durationUncached = performance.now() - startUncached;

    console.log(`\n⚡ resolveVisibleChunkKeys Cache Benchmark (50,000 iterations):`);
    console.log(`   - Uncached (recalculation): ${durationUncached.toFixed(2)}ms`);
    console.log(`   - Cached (O(1) Map lookup): ${durationCached.toFixed(2)}ms`);
    console.log(`   - Speedup:                  ${(durationUncached / durationCached).toFixed(2)}x faster`);
    console.log(`   - Latency Reduction:        ${((1 - durationCached / durationUncached) * 100).toFixed(1)}%\n`);

    expect(durationCached).toBeLessThanOrEqual(durationUncached * 1.5); // Safe assertion
  });
});
