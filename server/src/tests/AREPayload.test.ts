import { describe, expect, it } from 'vitest';
import { AREGuard } from '../core/are/AREGuard';
import { AREPayloadFactory } from '../core/are/AREPayload';

describe('ARE-Logic: ARE Payload normalization', () => {
  describe('payload creation and kappa normalization', () => {
    it('converts raw position and velocity floats into strict kappa integer vectors', () => {
      const payload = AREPayloadFactory.createNormalized(
        'entity_001',
        { x: 1.25, y: -0.5, z: 0 },
        { x: 10.123, y: 0, z: 2.5 },
      );

      expect(payload.position.x).toBe(1250);
      expect(payload.position.y).toBe(-500);
      expect(payload.position.z).toBe(0);
      expect(payload.velocity.x).toBe(10123);
      expect(payload.velocity.z).toBe(2500);
    });

    it('keeps additional integer state unscaled by default', () => {
      const payload = AREPayloadFactory.createNormalized(
        'entity_002',
        {},
        {},
        { health: 100, level: 7, tags: ['player', 'active'] },
      );

      expect(payload.health).toBe(100);
      expect(payload.level).toBe(7);
      expect(payload.tags).toEqual(['player', 'active']);
    });

    it('scales only whitelisted additional state number paths through kappa', () => {
      const payload = AREPayloadFactory.createNormalized(
        'entity_003',
        {},
        {},
        { stats: { manaRegen: 1.5, armor: 25 }, rates: [1, 2.25] },
        { kappaFields: ['stats.manaRegen', 'rates.1'] },
      );

      expect((payload.stats as any).manaRegen).toBe(1500);
      expect((payload.stats as any).armor).toBe(25);
      expect(payload.rates).toEqual([1, 2250]);
    });
  });

  describe('guard integration', () => {
    it('passes AREGuard float detection after normalization', () => {
      const payload = AREPayloadFactory.createNormalized('entity_004', { x: 1.25, y: 3.333 }, {});
      expect(() => AREGuard.assertNoFloats(payload)).not.toThrow();
    });

    it('returns a deeply frozen payload ready for WorldTick', () => {
      const payload = AREPayloadFactory.createNormalized('entity_005', { x: 1 }, { y: 2 }, { stats: { hp: 100 } });

      expect(Object.isFrozen(payload)).toBe(true);
      expect(Object.isFrozen(payload.position)).toBe(true);
      expect(Object.isFrozen(payload.velocity)).toBe(true);
      expect(Object.isFrozen(payload.stats)).toBe(true);

      expect(() => {
        (payload.position as { x: number }).x = 9999;
      }).toThrow(TypeError);
    });
  });

  describe('edge cases and contract protection', () => {
    it('handles null or missing vectors gracefully', () => {
      const payload = AREPayloadFactory.createNormalized('entity_006', null, undefined);
      expect(payload.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(payload.velocity).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('rejects float values in additional state unless whitelisted', () => {
      expect(() => AREPayloadFactory.createNormalized('entity_007', {}, {}, { health: 99.5 })).toThrow('[ARE-Guard]');
    });

    it('rejects invalid entity ids', () => {
      expect(() => AREPayloadFactory.createNormalized('', {}, {})).toThrow('[ARE-Payload]');
    });

    it('rejects attempts to override reserved payload keys from additional state', () => {
      expect(() => AREPayloadFactory.createNormalized('entity_008', {}, {}, { position: { x: 999 } })).toThrow('[ARE-Payload]');
    });
  });
});
