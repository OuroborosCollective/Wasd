import { describe, expect, it } from 'vitest';
import { AREPayloadFactory } from '../core/are/AREPayload';
import { ARETick } from '../core/are/ARETick';

const callForbiddenRandom = () => globalThis.Math['random']();

function createTestPayload() {
  return AREPayloadFactory.createNormalized(
    'entity_tick_001',
    { x: 10, y: 5, z: 0 },
    { x: 1, y: -0.5, z: 0 },
    { health: 100 },
  );
}

describe('ARE-Logic: ARETick isolated execution', () => {
  describe('fundamental physics', () => {
    it('calculates the new position using kappa math', () => {
      const initialState = createTestPayload();
      const nextState = ARETick.processEntity(initialState);

      expect(nextState.position.x).toBe(11000);
      expect(nextState.position.y).toBe(4500);
      expect(nextState.position.z).toBe(0);
      expect(nextState.health).toBe(100);
      expect(nextState.entityId).toBe('entity_tick_001');
    });
  });

  describe('determinism and immutability', () => {
    it('produces identical outputs for identical inputs', () => {
      const outputA = ARETick.processEntity(createTestPayload());
      const outputB = ARETick.processEntity(createTestPayload());
      expect(outputA).toEqual(outputB);
    });

    it('does not mutate the input payload', () => {
      const initialState = createTestPayload();
      const nextState = ARETick.processEntity(initialState);

      expect(initialState).not.toBe(nextState);
      expect(initialState.position).not.toBe(nextState.position);
      expect(initialState.position.x).toBe(10000);
      expect(Object.isFrozen(initialState)).toBe(true);
      expect(Object.isFrozen(nextState)).toBe(true);
      expect(Object.isFrozen(nextState.position)).toBe(true);
    });
  });

  describe('ARE Guard integration', () => {
    it('blocks non-deterministic APIs inside the protected physics frame', () => {
      const cleanPayload = createTestPayload();
      const maliciousPayload = {
        ...cleanPayload,
        get velocity() {
          callForbiddenRandom();
          return cleanPayload.velocity;
        },
      };

      expect(() => ARETick.processEntity(maliciousPayload as any)).toThrow(/strictly prohibited/);
    });

    it('rejects dirty payload floats before processing', () => {
      const cleanPayload = createTestPayload();
      const dirtyPayload = {
        ...cleanPayload,
        position: { x: 10000, y: 5000.25, z: 0 },
      };

      expect(() => ARETick.processEntity(dirtyPayload as any)).toThrow('[ARE-Guard]');
    });
  });
});
