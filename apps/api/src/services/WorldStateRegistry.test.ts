import { describe, it, expect } from "vitest";
import { WorldStateRegistry, Entity, WorldState } from "./WorldStateRegistry";

describe("WorldStateRegistry Optimization & Correctness", () => {
  it("should correctly clone WorldState and deep-clone entity metadata", () => {
    const registry = new WorldStateRegistry();
    const token = registry.beginTick();

    const testEntity: Entity = {
      id: "ent-1",
      x: 1000,
      y: 2000,
      z: 3000,
      hp: 100,
      metadata: {
        nested: {
          key: "value",
        },
        array: [1, 2, 3],
      },
    };

    registry.applyMutation(token, {
      entityId: "ent-1",
      type: "CREATE",
      payload: testEntity,
    });

    registry.commitTick(token);

    const currentState = registry.getCurrentState();
    expect(currentState.entities.has("ent-1")).toBe(true);

    // Now, let's begin another tick, which will clone currentState into pendingState
    const token2 = registry.beginTick();

    // Modify a property in pendingState through a mutation
    registry.applyMutation(token2, {
      entityId: "ent-1",
      type: "UPDATE_HP",
      payload: { delta: -10 },
    });

    // Verify the original currentState wasn't affected (Correctness of deep clone of primitive fields)
    const entInCurrent = currentState.entities.get("ent-1")!;
    expect(entInCurrent.hp).toBe(100);

    // Verify that nested metadata is correctly deep cloned and isolated
    const entInPending = (registry as any).pendingState.entities.get("ent-1")!;
    expect(entInPending.metadata.nested.key).toBe("value");

    // Mutate the pendingState metadata directly to verify structural isolation
    entInPending.metadata.nested.key = "changed";
    expect(entInCurrent.metadata.nested.key).toBe("value");

    registry.commitTick(token2);
  });

  it("should run a performance benchmark comparing hybrid cloning with slow JSON serialization", () => {
    const originalState: WorldState = {
      tick: 42,
      entities: new Map<string, Entity>(),
    };

    // Populate with 1000 entities representing a typical game server population
    for (let i = 0; i < 1000; i++) {
      originalState.entities.set(`entity-${i}`, {
        id: `entity-${i}`,
        x: Math.floor(Math.random() * 10000),
        y: Math.floor(Math.random() * 10000),
        z: Math.floor(Math.random() * 10000),
        hp: 100,
        metadata: {
          faction: "Arelor",
          level: i % 60,
          stats: { strength: 10 + (i % 5), agility: 8 + (i % 3) },
        },
      });
    }

    // Benchmark Reference (Slow JSON Stringify/Parse from the original codebase)
    const slowClone = (state: WorldState): WorldState => {
      return {
        tick: state.tick,
        entities: new Map(JSON.parse(JSON.stringify(Array.from(state.entities)))),
      };
    };

    // Benchmark optimized implementation (which we added directly in WorldStateRegistry)
    const registryInstance = new WorldStateRegistry();
    const fastClone = (registryInstance as any).cloneState.bind(registryInstance);

    const iterations = 500;

    // Run slow clone benchmark
    const startSlow = performance.now();
    for (let i = 0; i < iterations; i++) {
      const cloned = slowClone(originalState);
      if (cloned.tick !== 42) throw new Error();
    }
    const endSlow = performance.now();
    const slowTime = endSlow - startSlow;

    // Run fast clone benchmark
    const startFast = performance.now();
    for (let i = 0; i < iterations; i++) {
      const cloned = fastClone(originalState);
      if (cloned.tick !== 42) throw new Error();
    }
    const endFast = performance.now();
    const fastTime = endFast - startFast;

    const improvement = (slowTime / fastTime).toFixed(2);
    const reductionPercent = (((slowTime - fastTime) / slowTime) * 100).toFixed(1);

    console.log(`\n⚡ WorldStateRegistry.cloneState Benchmark (500 iterations, 1000 entities):`);
    console.log(`   - Reference JSON serialization: ${slowTime.toFixed(2)}ms`);
    console.log(`   - Optimized Hybrid cloning:    ${fastTime.toFixed(2)}ms`);
    console.log(`   - Speedup:                      ${improvement}x faster`);
    console.log(`   - Latency Reduction:            ${reductionPercent}%\n`);

    expect(fastTime).toBeLessThan(slowTime);
  });
});
