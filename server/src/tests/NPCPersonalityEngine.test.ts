import { describe, it, expect } from 'vitest';
import { NPCPersonalityEngine } from '../modules/npc/NPCPersonalityEngine';

describe('NPCPersonalityEngine', () => {
  const engine = new NPCPersonalityEngine();

  it('should generate consistent traits for the same seed', () => {
    const seed = 'test-npc-123';
    const traits1 = engine.generateTraits(seed);
    const traits2 = engine.generateTraits(seed);

    expect(traits1).toEqual(traits2);
    expect(traits1.courage).toBeGreaterThanOrEqual(0);
    expect(traits1.courage).toBeLessThan(1);
  });

  it('should generate different traits for different seeds', () => {
    const traits1 = engine.generateTraits('npc-a');
    const traits2 = engine.generateTraits('npc-b');

    expect(traits1).not.toEqual(traits2);
  });

  it('should return all required traits', () => {
    const traits = engine.generateTraits('any-seed');
    expect(traits).toHaveProperty('courage');
    expect(traits).toHaveProperty('curiosity');
    expect(traits).toHaveProperty('greed');
    expect(traits).toHaveProperty('faith');
    expect(traits).toHaveProperty('aggression');
  });
});
