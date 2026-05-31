import { describe, it, expect } from 'vitest';
import { WeatherMonsterBridge } from '../modules/monster/WeatherMonsterBridge.js';
import { mutateMonster } from '../modules/monster/MonsterMutation.js';
import { type MonsterDNA } from '../modules/monster/MonsterDNA.js';

describe('WeatherMonsterBridge', () => {
  it('should provide deterministic stat modifiers', () => {
    const stormMods = WeatherMonsterBridge.getStatsModifier('storm');
    expect(stormMods.aggression).toBe(1.3);
    expect(stormMods.strength).toBe(1.2);
    expect(stormMods.intelligence).toBe(0.8);
  });

  it('should provide weather-specific mutations', () => {
    expect(WeatherMonsterBridge.getWeatherMutations('storm')).toContain('storm_frenzy');
    expect(WeatherMonsterBridge.getWeatherMutations('fog')).toContain('mist_stalker');
    expect(WeatherMonsterBridge.getWeatherMutations('clear')).toEqual([]);
  });
});

describe('MonsterMutation with Weather', () => {
  const baseDna: MonsterDNA = {
    species: 'wolf',
    aggression: 1.0,
    strength: 1.0,
    speed: 1.0,
    intelligence: 1.0,
    resilience: 1.0,
  };

  it('should apply weather effects during mutation', () => {
    const mutated = mutateMonster(baseDna, 'forest', undefined, 'storm');

    expect(mutated.aggression).toBeCloseTo(1.3);
    expect(mutated.strength).toBeCloseTo(1.2);
    expect(mutated.intelligence).toBeCloseTo(0.8);
    expect(mutated.mutations).toContain('storm_frenzy');
  });

  it('should combine biome and weather effects', () => {
    // snow biome gives +0.2 resilience
    // snow weather gives 1.2x resilience multiplier
    const mutated = mutateMonster(baseDna, 'snow', undefined, 'snow');

    // (1.0 + 0.2) * 1.2 = 1.44
    expect(mutated.resilience).toBeCloseTo(1.44);
    expect(mutated.mutations).toContain('frost_resistance');
    expect(mutated.mutations).toContain('frost_hide');
  });
});
