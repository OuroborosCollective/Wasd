import { describe, it, expect } from 'vitest';
import { WorldStateRegistry, type Entity, type WorldState } from './WorldStateRegistry.js';

describe('WorldStateRegistry Correction and Performance Tests', () => {
  it('clones state correctly and ensures full structural parity including Map structure', () => {
    const registry = new WorldStateRegistry();

    const testEntity: Entity = {
      id: 'warrior-1',
      x: 100,
      y: 200,
      z: 300,
      hp: 100,
      metadata: { class: 'Warrior', level: 15, equipment: { weapon: 'sword' } },
    };

    const originalState: WorldState = {
      tick: 5,
      entities: new Map([['warrior-1', testEntity]]),
    };

    // Call the private cloneState method
    const clonedState = (registry as any).cloneState(originalState);

    expect(clonedState.tick).toBe(5);
    expect(clonedState.entities.size).toBe(1);

    const clonedEntity = clonedState.entities.get('warrior-1')!;
    expect(clonedEntity).toEqual(testEntity);
    expect(clonedEntity).not.toBe(testEntity); // Check references are different
    expect(clonedEntity.metadata).not.toBe(testEntity.metadata); // Deep clone check
    expect(clonedEntity.metadata.equipment).not.toBe(testEntity.metadata.equipment); // Nested deep clone check
  });

  it('runs benchmark comparing old full JSON cloning to optimized hybrid path', () => {
    const registry = new WorldStateRegistry();

    // Setup 250 test entities to represent a heavy tick load
    const entities = new Map<string, Entity>();
    for (let i = 0; i < 250; i++) {
      entities.set(`entity-${i}`, {
        id: `entity-${i}`,
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000),
        z: Math.floor(Math.random() * 1000),
        hp: 100,
        metadata: { faction: 'alliance', buffs: ['speed', 'haste'], count: i },
      });
    }

    const testState: WorldState = {
      tick: 42,
      entities,
    };

    const iterations = 1000;

    // Benchmark the old cloning strategy
    const startOld = performance.now();
    for (let i = 0; i < iterations; i++) {
      const cloned = {
        tick: testState.tick,
        entities: new Map(JSON.parse(JSON.stringify(Array.from(testState.entities)))),
      };
    }
    const durationOld = performance.now() - startOld;

    // Benchmark the new optimized cloning strategy
    const startNew = performance.now();
    for (let i = 0; i < iterations; i++) {
      const clonedEntities = new Map<string, Entity>();
      for (const [key, entity] of testState.entities) {
        clonedEntities.set(key, {
          id: entity.id,
          x: entity.x,
          y: entity.y,
          z: entity.z,
          hp: entity.hp,
          metadata: entity.metadata ? JSON.parse(JSON.stringify(entity.metadata)) : {},
        });
      }
      const cloned = {
        tick: testState.tick,
        entities: clonedEntities,
      };
    }
    const durationNew = performance.now() - startNew;

    const speedup = durationOld / durationNew;
    console.log(`\n=== WorldStateRegistry Clone Benchmark (${iterations} iterations with 250 entities) ===`);
    console.log(`Old JSON stringify/parse path: ${durationOld.toFixed(2)}ms`);
    console.log(`Optimized Hybrid path: ${durationNew.toFixed(2)}ms`);
    console.log(`Performance Speedup: ${speedup.toFixed(2)}x faster\n`);

    expect(durationNew).toBeLessThan(durationOld);
  });
});
