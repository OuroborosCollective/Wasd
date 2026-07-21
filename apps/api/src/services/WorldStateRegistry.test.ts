import { describe, it, expect } from 'vitest';
import { WorldStateRegistry, type Entity } from './WorldStateRegistry.js';

describe('WorldStateRegistry Performance & Correctness', () => {
  it('should correctly handle state operations and double buffering', () => {
    const registry = new WorldStateRegistry();

    // Initial state should be empty
    expect(registry.getCurrentState().entities.size).toBe(0);

    // Begin a tick
    const token = registry.beginTick();
    expect(token).toBeDefined();

    // Apply a CREATE mutation
    const entity: Entity = {
      id: 'player-1',
      x: 1000,
      y: 2000,
      z: 3000,
      hp: 100,
      metadata: { name: 'Arelor', guild: 'Order' }
    };

    registry.applyMutation(token, {
      entityId: 'player-1',
      type: 'CREATE',
      payload: entity
    });

    // Before commit, current state should still be empty
    expect(registry.getCurrentState().entities.size).toBe(0);

    // Commit the tick
    registry.commitTick(token);

    // After commit, current state should have the entity
    const currentState = registry.getCurrentState();
    expect(currentState.entities.size).toBe(1);
    const storedEntity = currentState.entities.get('player-1');
    expect(storedEntity).toBeDefined();
    expect(storedEntity?.x).toBe(1000);
    expect(storedEntity?.metadata.name).toBe('Arelor');
  });

  it('should benchmark beginTick and commitTick operations', () => {
    const registry = new WorldStateRegistry();

    // Setup 1000 entities in the registry
    const token = registry.beginTick();
    for (let i = 0; i < 1000; i++) {
      const entity: Entity = {
        id: `entity-${i}`,
        x: i * 1000,
        y: i * 2000,
        z: i * 3000,
        hp: 100,
        metadata: {
          index: i,
          nested: {
            tags: ['active', 'npc', `region-${i % 5}`],
            attributes: { level: 10, speed: 200 }
          }
        }
      };
      registry.applyMutation(token, {
        entityId: entity.id,
        type: 'CREATE',
        payload: entity
      });
    }
    registry.commitTick(token);

    // Warmup
    for (let i = 0; i < 10; i++) {
      const t = registry.beginTick();
      registry.commitTick(t);
    }

    // Benchmark 100 iterations of cloning/ticking 1000 entities
    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const t = registry.beginTick();
      registry.commitTick(t);
    }
    const end = performance.now();
    const duration = end - start;
    console.log(`[Benchmark] Ticking 1000 entities ${iterations} times took ${duration.toFixed(2)}ms (${(duration / iterations).toFixed(3)}ms/tick)`);

    expect(registry.getCurrentState().entities.size).toBe(1000);
  });
});
