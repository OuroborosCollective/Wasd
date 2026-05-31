import { describe, it, expect } from 'vitest';
import { WeatherMagicBridge } from '../modules/magic/WeatherMagicBridge.js';
import { MagicSystem } from '../modules/magic/MagicSystem.js';

describe('WeatherMagicBridge', () => {
  it('should provide deterministic multipliers', () => {
    expect(WeatherMagicBridge.getMultiplier('fire', 'heatwave')).toBe(1.4);
    expect(WeatherMagicBridge.getMultiplier('lightning', 'storm')).toBe(1.5);
    expect(WeatherMagicBridge.getMultiplier('frost', 'snow')).toBe(1.3);
    expect(WeatherMagicBridge.getMultiplier('water', 'rain')).toBe(1.2);
    expect(WeatherMagicBridge.getMultiplier('fire', 'rain')).toBe(0.8);
  });

  it('should return 1.0 for unknown combinations', () => {
    // @ts-ignore
    expect(WeatherMagicBridge.getMultiplier('arcane', 'clear')).toBe(1.0);
  });
});

describe('MagicSystem with Weather', () => {
  const magicSystem = new MagicSystem();
  const caster = { mana: 100 };
  const spell = { id: 'fireball', cost: 10, element: 'fire', effect: 'burn' };
  const target = { id: 'dummy' };

  it('should apply weather multipliers to cast intensity', () => {
    const result = magicSystem.cast(caster, spell, target, 'heatwave');
    expect(result.success).toBe(true);
    expect(result.intensity).toBe(1.4);
    expect(result.weather).toBe('heatwave');
  });

  it('should use default weather if none provided', () => {
    const result = magicSystem.cast(caster, spell, target);
    expect(result.weather).toBe('clear');
    expect(result.intensity).toBe(1.1); // fire in clear is 1.1
  });
});
