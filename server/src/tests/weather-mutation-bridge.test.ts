import { describe, it, expect } from 'vitest';
import { mutateMonster } from '../modules/monster/MonsterMutation.js';
import { SeededARERng } from '../core/determinism/AREDeterminism.js';

describe('WeatherMutationBridge', () => {
  const mockDNA = {
    species: 'goblin',
    strength: 0.5,
    speed: 0.5,
    aggression: 0.5,
    intelligence: 0.5,
    resilience: 0.5
  };

  it('should apply deterministic mutations based on weather', () => {
    const rng1 = new SeededARERng('test-seed');
    const monster1 = mutateMonster(mockDNA, 'forest', 'storm', rng1);

    const rng2 = new SeededARERng('test-seed');
    const monster2 = mutateMonster(mockDNA, 'forest', 'storm', rng2);

    expect(monster1).toEqual(monster2);
    expect(monster1.mutations).toContain('static_charge');
    expect(monster1.strength).toBeGreaterThan(0.5);
  });

  it('should apply snow mutations in snow biome', () => {
    const monster = mutateMonster(mockDNA, 'snow', 'clear', new SeededARERng('snow-test'));
    expect(monster.mutations).toContain('frost_resistance');
    expect(monster.resilience).toBeGreaterThan(0.5);
  });

  it('should combine biome and weather mutations', () => {
      // In snow biome with snow weather
      const monster = mutateMonster(mockDNA, 'snow', 'snow', new SeededARERng('double-snow'));
      expect(monster.mutations).toContain('frost_resistance');
      expect(monster.mutations).toContain('arctic_fur');
      expect(monster.resilience).toBeGreaterThan(0.7); // 0.5 + 0.2 (biome) + 0.15 (weather)
  });

  it('should handle different weather states', () => {
    const weathers = ['rain', 'storm', 'fog', 'snow', 'heatwave'];
    weathers.forEach(weather => {
      const monster = mutateMonster(mockDNA, 'plain', weather, new SeededARERng(weather));
      expect(monster.mutations.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should handle clear weather (probabilistic mutation)', () => {
    // With seed 'clear', rng.nextFloat() is 0.446... which is > 0.1
    const monster = mutateMonster(mockDNA, 'plain', 'clear', new SeededARERng('clear'));
    expect(monster.mutations).not.toContain('sun_blessed');

    // We need a seed that results in < 0.1 for clear weather mutation
    // Let's try to find one or just verify it CAN happen
    let found = false;
    for (let i = 0; i < 100; i++) {
        const monsterProb = mutateMonster(mockDNA, 'plain', 'clear', new SeededARERng('seed-' + i));
        if (monsterProb.mutations.includes('sun_blessed')) {
            found = true;
            break;
        }
    }
    expect(found).toBe(true);
  });
});
