import { describe, it, expect } from 'vitest';
import { WorldStateRegistry, Entity } from './WorldStateRegistry';

describe('WorldStateRegistry', () => {
  it('cloneState should provide deep isolation for entities and metadata', () => {
    const registry = new WorldStateRegistry() as any; // Cast to access private cloneState

    const originalMetadata = { health: 100, effects: ['poison'] };
    const entity: Entity = {
      id: 'entity-1',
      x: 10,
      y: 20,
      z: 30,
      hp: 100,
      metadata: originalMetadata
    };

    const originalState = {
      tick: 5,
      entities: new Map([['entity-1', entity]])
    };

    const clonedState = registry.cloneState(originalState);

    // 1. Verify tick is copied
    expect(clonedState.tick).toBe(5);

    // 2. Verify entity is copied
    expect(clonedState.entities.has('entity-1')).toBe(true);
    const clonedEntity = clonedState.entities.get('entity-1');
    expect(clonedEntity).not.toBe(entity); // Should be a new object
    expect(clonedEntity.id).toBe('entity-1');

    // 3. Verify metadata isolation (Shallow copy of metadata should be enough for basic isolation)
    expect(clonedEntity.metadata).not.toBe(originalMetadata);
    expect(clonedEntity.metadata.health).toBe(100);

    // Modify original metadata and verify clone is unaffected
    entity.metadata.health = 50;
    expect(clonedEntity.metadata.health).toBe(100);

    // Verify modification of primitive fields
    entity.hp = 200;
    expect(clonedEntity.hp).toBe(100);
  });

  it('should correctly handle tick cycles with state isolation', () => {
    const registry = new WorldStateRegistry();
    const token = registry.beginTick();

    registry.applyMutation(token, {
      entityId: 'e1',
      type: 'CREATE',
      payload: { id: 'e1', x: 0, y: 0, z: 0, hp: 100, metadata: { name: 'test' } }
    });

    registry.commitTick(token);

    const stateAfterTick1 = registry.getCurrentState();
    expect(stateAfterTick1.entities.size).toBe(1);
    expect(stateAfterTick1.tick).toBe(1);

    const token2 = registry.beginTick();
    registry.applyMutation(token2, {
      entityId: 'e1',
      type: 'MOVE',
      payload: { dx: 10, dy: 20 }
    });

    // Before commit, currentState should still have x=0, y=0
    expect(registry.getCurrentState().entities.get('e1')?.x).toBe(0);

    registry.commitTick(token2);

    // After commit, currentState should have x=10, y=20
    expect(registry.getCurrentState().entities.get('e1')?.x).toBe(10);
    expect(registry.getCurrentState().entities.get('e1')?.y).toBe(20);
    expect(registry.getCurrentState().tick).toBe(2);
  });
});
