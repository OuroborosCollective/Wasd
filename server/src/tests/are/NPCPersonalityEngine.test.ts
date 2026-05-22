import { describe, it, expect } from 'vitest';
import { NPCPersonalityEngine } from '../../modules/npc/NPCPersonalityEngine.js';
import { SeededARERng } from '../../core/determinism/AREDeterminism.js';

describe('NPCPersonalityEngine Determinism', () => {
  it('should generate the same traits for the same RNG state', () => {
    const engine = new NPCPersonalityEngine();
    const rng1 = new SeededARERng('test-seed');
    const rng2 = new SeededARERng('test-seed');

    const traits1 = engine.generateTraits(rng1);
    const traits2 = engine.generateTraits(rng2);

    expect(traits1).toEqual(traits2);
  });

  it('should generate different traits for different RNG states', () => {
    const engine = new NPCPersonalityEngine();
    const rng1 = new SeededARERng('seed-a');
    const rng2 = new SeededARERng('seed-b');

    const traits1 = engine.generateTraits(rng1);
    const traits2 = engine.generateTraits(rng2);

    expect(traits1).not.toEqual(traits2);
  });
});
