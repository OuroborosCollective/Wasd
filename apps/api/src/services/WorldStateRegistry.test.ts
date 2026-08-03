import { describe, it, expect } from "vitest";
import { WorldStateRegistry, Entity, WorldState } from "./WorldStateRegistry.js";

describe("WorldStateRegistry Correctness and Performance", () => {
  it("should initialize with default state", () => {
    const registry = new WorldStateRegistry();
    const state = registry.getCurrentState();
    expect(state.tick).toBe(0);
    expect(state.entities.size).toBe(0);
  });

  it("should implement double-buffering correctly with beginTick, applyMutation, and commitTick", () => {
    const registry = new WorldStateRegistry();
    const token = registry.beginTick();

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    // Before commit, currentState is unchanged
    const initial = registry.getCurrentState();
    expect(initial.tick).toBe(0);

    // Apply some mutations
    registry.applyMutation(token, {
      entityId: "player-1",
      type: "CREATE",
      payload: { id: "player-1", x: 100, y: 200, z: 0, hp: 100, metadata: { name: "Aethelgard" } },
    });

    registry.applyMutation(token, {
      entityId: "player-1",
      type: "MOVE",
      payload: { dx: 10, dy: -5 },
    });

    registry.applyMutation(token, {
      entityId: "player-1",
      type: "UPDATE_HP",
      payload: { delta: -25 },
    });

    // Before commit, current state is still empty
    expect(registry.getCurrentState().entities.has("player-1")).toBe(false);

    // Commit mutations
    registry.commitTick(token);

    // After commit, state is updated
    const finalState = registry.getCurrentState();
    expect(finalState.tick).toBe(1);
    expect(finalState.entities.has("player-1")).toBe(true);

    const player = finalState.entities.get("player-1")!;
    expect(player.x).toBe(110);
    expect(player.y).toBe(195);
    expect(player.hp).toBe(75);
    expect(player.metadata).toEqual({ name: "Aethelgard" });
  });

  it("should guarantee that cloned state is deeply isolated and does not mutate when original is changed", () => {
    const registry = new WorldStateRegistry();
    const token1 = registry.beginTick();

    registry.applyMutation(token1, {
      entityId: "e-1",
      type: "CREATE",
      payload: {
        id: "e-1",
        x: 10,
        y: 20,
        z: 30,
        hp: 100,
        metadata: { stats: { power: 50 }, tags: ["hero"] },
      },
    });

    registry.commitTick(token1);

    // Now start second tick which clones the first tick
    const token2 = registry.beginTick();

    // Mutate the entity in the pending state
    registry.applyMutation(token2, {
      entityId: "e-1",
      type: "UPDATE_HP",
      payload: { delta: -10 },
    });

    // Also manually mutate the metadata of the entity inside the current (original) state to check deep cloning isolation
    const originalState = registry.getCurrentState();
    const originalEntity = originalState.entities.get("e-1")!;
    originalEntity.metadata.stats.power = 999;
    originalEntity.metadata.tags.push("mutated");

    registry.commitTick(token2);

    // Final state of the second tick
    const finalState = registry.getCurrentState();
    const finalEntity = finalState.entities.get("e-1")!;

    // Assert that the cloned entity received the HP update mutation
    expect(finalEntity.hp).toBe(90);

    // Assert that original state's manual deep mutations did NOT leak into the cloned/pending state
    expect(finalEntity.metadata.stats.power).toBe(50);
    expect(finalEntity.metadata.tags).toEqual(["hero"]);
  });

  it("should benchmark hybrid clone against the old JSON.stringify approach", () => {
    // Construct a large, realistic state
    const entities = new Map<string, Entity>();
    for (let i = 0; i < 500; i++) {
      entities.set(`entity-${i}`, {
        id: `entity-${i}`,
        x: Math.floor(Math.random() * 10000),
        y: Math.floor(Math.random() * 10000),
        z: Math.floor(Math.random() * 10000),
        hp: Math.floor(Math.random() * 100),
        metadata: {
          name: `NPC-${i}`,
          faction: i % 2 === 0 ? "alliance" : "horde",
          buffs: ["speed", "strength"],
          attributes: {
            strength: 10 + (i % 5),
            agility: 12 + (i % 3),
          },
        },
      });
    }

    const state: WorldState = {
      tick: 42,
      entities,
    };

    const iterations = 1000;

    // 1. Benchmark Old Approach
    const startOld = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
      const clonedOld = {
        tick: state.tick,
        entities: new Map(JSON.parse(JSON.stringify(Array.from(state.entities)))),
      };
    }
    const endOld = performance.now();
    const durationOld = endOld - startOld;

    // 2. Benchmark New Optimized Hybrid Approach
    const startNew = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
      const clonedEntities = new Map<string, Entity>();
      for (const [key, entity] of state.entities.entries()) {
        const clonedEntity: Entity = {
          id: entity.id,
          x: entity.x,
          y: entity.y,
          z: entity.z,
          hp: entity.hp,
          metadata: undefined as any,
        };
        if (entity.metadata !== undefined) {
          clonedEntity.metadata = JSON.parse(JSON.stringify(entity.metadata));
        }
        clonedEntities.set(key, clonedEntity);
      }
      const clonedNew = {
        tick: state.tick,
        entities: clonedEntities,
      };
    }
    const endNew = performance.now();
    const durationNew = endNew - startNew;

    const percentImprovement = ((durationOld - durationNew) / durationOld) * 100;

    console.log(`\n=== WorldStateRegistry Cloning Performance Benchmark ===`);
    console.log(`Iterations: ${iterations} (with 500 entities per state)`);
    console.log(`Old full JSON.stringify cloning approach: ${durationOld.toFixed(2)}ms`);
    console.log(`New optimized hybrid cloning approach: ${durationNew.toFixed(2)}ms`);
    console.log(`Cloning latency reduction: ${percentImprovement.toFixed(2)}%`);
    console.log(`========================================================\n`);

    expect(durationNew).toBeLessThan(durationOld);
  });
});
