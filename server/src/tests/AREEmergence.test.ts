import { describe, expect, it } from 'vitest';
import { AREBrain } from '../core/are/AREBrain';
import { AREHash } from '../core/are/AREHash';
import { AREPayloadFactory } from '../core/are/AREPayload';

const callForbiddenClock = () => globalThis.Date['now']();

describe('ARE-Logic: emergent brain and deterministic hashing', () => {
  describe('AREHash generator', () => {
    it('generates identical hashes for identical states', () => {
      const stateA = AREPayloadFactory.createNormalized('brain_01', { x: 10, y: 5 }, { x: 1, y: 0 });
      const stateB = AREPayloadFactory.createNormalized('brain_01', { x: 10, y: 5 }, { x: 1, y: 0 });

      expect(AREHash.generate(stateA)).toBe(AREHash.generate(stateB));
    });

    it('changes hashes for tiny positional drifts', () => {
      const stateA = AREPayloadFactory.createNormalized('brain_01', { x: 10 }, {});
      const stateB = AREPayloadFactory.createNormalized('brain_01', { x: 10.001 }, {});

      expect(AREHash.generate(stateA)).not.toBe(AREHash.generate(stateB));
    });

    it('mixes neighbor hashes deterministically for future plexity', () => {
      const base = 123456;
      expect(AREHash.mix(base, [1, 2, 3])).toBe(AREHash.mix(base, [1, 2, 3]));
      expect(AREHash.mix(base, [1, 2, 3])).not.toBe(AREHash.mix(base, [3, 2, 1]));
    });
  });

  describe('AREBrain emergence', () => {
    it('evolves deterministic behavior without global random access', () => {
      const genesisState = AREPayloadFactory.createNormalized('organism_01', { x: 0, y: 0 }, { x: 0, y: 0 });

      const gen1 = AREBrain.computeEmergence(genesisState);
      const gen2 = AREBrain.computeEmergence(gen1);
      const gen3 = AREBrain.computeEmergence(gen2);

      expect(gen1.stateHash).toBeDefined();

      const altGen1 = AREBrain.computeEmergence(genesisState);
      const altGen2 = AREBrain.computeEmergence(altGen1);
      const altGen3 = AREBrain.computeEmergence(altGen2);

      expect(gen3).toEqual(altGen3);
    });

    it('allows deterministic plexity mixing without making it mandatory', () => {
      const genesisState = AREPayloadFactory.createNormalized('organism_plex', { x: 0, y: 0 }, { x: 0, y: 0 });

      const solo = AREBrain.computeEmergence(genesisState);
      const social = AREBrain.computeEmergence(genesisState, { neighborHashes: [11, 22, 33] });
      const socialAgain = AREBrain.computeEmergence(genesisState, { neighborHashes: [11, 22, 33] });

      expect(social).toEqual(socialAgain);
      expect(social.stateHash).not.toBe(solo.stateHash);
    });

    it('does not mutate the original organism', () => {
      const genesisState = AREPayloadFactory.createNormalized('organism_02', { x: 100 }, {});
      const next = AREBrain.computeEmergence(genesisState);

      expect(Object.isFrozen(genesisState)).toBe(true);
      expect(genesisState).not.toBe(next);
      expect(genesisState.velocity).not.toBe(next.velocity);
    });

    it('blocks non-deterministic APIs during emergence through protected execution', () => {
      const cleanPayload = AREPayloadFactory.createNormalized('organism_03', { x: 0 }, { x: 0 });
      const maliciousPayload = {
        ...cleanPayload,
        get position() {
          callForbiddenClock();
          return cleanPayload.position;
        },
      };

      expect(() => AREBrain.computeEmergence(maliciousPayload as any)).toThrow(/strictly prohibited/);
    });
  });
});
