// @ARE-GUARD-EXEMPT: Testing logic only.
import { describe, expect, it } from 'vitest';
import { AREGuard } from '../AREGuard';

describe('ARE-Logic: ARE Guard protections', () => {
  describe('system integrity', () => {
    it('verifies KAPPA remains exactly 1000', () => {
      expect(() => AREGuard.verifyKappaIntegrity()).not.toThrow();
    });
  });

  describe('execution isolation', () => {
    it('blocks Math.random inside a protected execution frame', () => {
      expect(() => {
        AREGuard.executeProtected(() => Math.random());
      }).toThrow('[ARE-Guard] Math.random is strictly prohibited');
    });

    it('blocks Date.now inside a protected execution frame', () => {
      expect(() => {
        AREGuard.executeProtected(() => Date.now());
      }).toThrow('[ARE-Guard] Date.now is strictly prohibited');
    });

    it('restores Math.random and Date.now after successful execution', () => {
      const result = AREGuard.executeProtected(() => 42);
      expect(result).toBe(42);
      expect(() => Math.random()).not.toThrow();
      expect(() => Date.now()).not.toThrow();
    });

    it('restores Math.random and Date.now after failed execution', () => {
      expect(() => AREGuard.executeProtected(() => { throw new Error('tick failed'); })).toThrow('tick failed');
      expect(() => Math.random()).not.toThrow();
      expect(() => Date.now()).not.toThrow();
    });
  });

  describe('payload protections', () => {
    it('accepts integer-only nested payloads', () => {
      const cleanPayload = { position: { x: 1250, y: 3000 }, health: 100, tags: ['npc', 'observer'] };
      expect(() => AREGuard.assertNoFloats(cleanPayload)).not.toThrow();
    });

    it('blocks float values deep inside nested payloads', () => {
      const dirtyPayload = { position: { x: 1250, y: 3000.5 }, health: 100 };
      expect(() => AREGuard.assertNoFloats(dirtyPayload)).toThrow("[ARE-Guard] Float detected in payload at 'root.position.y'");
    });

    it('handles cyclic payloads without recursive overflow', () => {
      const cyclic: { value: number; self?: unknown } = { value: 1000 };
      cyclic.self = cyclic;
      expect(() => AREGuard.assertNoFloats(cyclic)).not.toThrow();
      const protectedPayload = AREGuard.protectPayload(cyclic);
      expect(Object.isFrozen(protectedPayload)).toBe(true);
    });

    it('deeply freezes payloads to prevent direct mutation', () => {
      const state = { entity: { id: 1, velocity: 500 } };
      const protectedState = AREGuard.protectPayload(state);

      expect(Object.isFrozen(protectedState)).toBe(true);
      expect(Object.isFrozen(protectedState.entity)).toBe(true);

      expect(() => {
        (protectedState.entity as { velocity: number }).velocity = 1000;
      }).toThrow(TypeError);
    });
  });
});
