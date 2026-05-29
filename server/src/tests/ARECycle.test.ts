import { describe, expect, it } from 'vitest';
import { ARECycle } from '../core/are/ARECycle';
import { AREPayloadFactory } from '../core/are/AREPayload';

function createGenesisPayload() {
  return AREPayloadFactory.createNormalized(
    'cycle_entity_01',
    { x: 10, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { generation: 0 },
  );
}

describe('ARE-Logic: full lifecycle composition', () => {
  describe('pipeline execution', () => {
    it('executes Brain, Tick, and Hash in a seamless pipeline', () => {
      const genesis = createGenesisPayload();
      const gen1 = ARECycle.processCycle(genesis);

      expect(gen1.position.x).not.toBe(10000);
      expect(gen1.stateHash).toBeDefined();
      expect(typeof gen1.stateHash).toBe('number');
      expect(Object.isFrozen(gen1)).toBe(true);
      expect(Object.isFrozen(gen1.position)).toBe(true);
      expect(Object.isFrozen(gen1.velocity)).toBe(true);
    });

    it('keeps only the current stateHash on the payload', () => {
      const gen1 = ARECycle.processCycle(createGenesisPayload());
      expect(gen1.stateHash).toBeDefined();
      expect((gen1 as any).stateHashes).toBeUndefined();
      expect((gen1 as any).replay).toBeUndefined();
      expect((gen1 as any).history).toBeUndefined();
    });
  });

  describe('evolutionary determinism', () => {
    it('evolves identically across parallel universes', () => {
      let stateA = createGenesisPayload();
      let stateB = createGenesisPayload();

      for (let i = 0; i < 5; i += 1) {
        stateA = ARECycle.processCycle(stateA) as typeof stateA;
      }

      for (let i = 0; i < 5; i += 1) {
        stateB = ARECycle.processCycle(stateB) as typeof stateB;
      }

      expect(stateA).toEqual(stateB);
      expect(stateA.stateHash).toBe(stateB.stateHash);
    });

    it('preserves immutability of the genesis state', () => {
      const genesis = createGenesisPayload();
      ARECycle.processCycle(genesis);

      expect(genesis.position.x).toBe(10000);
      expect(genesis.velocity.x).toBe(1000);
      expect(Object.isFrozen(genesis)).toBe(true);
    });

    it('supports deterministic plexity options without requiring them', () => {
      const genesis = createGenesisPayload();
      const solo = ARECycle.processCycle(genesis);
      const social = ARECycle.processCycle(genesis, { neighborHashes: [101, 202, 303] });
      const socialAgain = ARECycle.processCycle(genesis, { neighborHashes: [101, 202, 303] });

      expect(social).toEqual(socialAgain);
      expect(social.stateHash).not.toBe(solo.stateHash);
    });
  });
});
