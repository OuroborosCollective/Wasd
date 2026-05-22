import { describe, it, expect } from 'vitest';
import {
  processHazardResonance,
  processAllHazards,
  HazardType,
  HazardSource
} from '../../../modules/world/HazardResonance';

describe('HazardResonance Determinism', () => {
  const player = {
    pos: { x: 10, y: 10 },
    health: 100,
    maxHealth: 100,
    hazardResistance: 0
  };

  const hazard: HazardSource = {
    id: 'lava-001',
    type: HazardType.LAVA,
    position: { x: 12, y: 12 },
    baseIntensity: 100,
    radius: 40
  };

  it('should produce identical results for the same tick', () => {
    const tick = 12345;

    const player1 = { ...player, pos: { ...player.pos } };
    const player2 = { ...player, pos: { ...player.pos } };

    const result1 = processHazardResonance(player1, hazard, tick);
    const result2 = processHazardResonance(player2, hazard, tick);

    expect(result1.phaseShift).toBe(tick % 100);
    expect(result1).toEqual(result2);
    expect(player1.health).toBe(player2.health);
  });

  it('should produce different phaseShift for different ticks', () => {
    const tick1 = 100;
    const tick2 = 101;

    const player1 = { ...player, pos: { ...player.pos } };
    const player2 = { ...player, pos: { ...player.pos } };

    const result1 = processHazardResonance(player1, hazard, tick1);
    const result2 = processHazardResonance(player2, hazard, tick2);

    expect(result1.phaseShift).toBe(0);
    expect(result2.phaseShift).toBe(1);
    expect(result1.phaseShift).not.toBe(result2.phaseShift);
  });

  it('should handle all hazards deterministically', () => {
    const tick = 99;
    const hazards = [hazard];

    const player1 = { ...player, pos: { ...player.pos } };
    const player2 = { ...player, pos: { ...player.pos } };

    const result1 = processAllHazards(player1, hazards, tick);
    const result2 = processAllHazards(player2, hazards, tick);

    expect(result1.phaseShift).toBe(99);
    expect(result1).toEqual(result2);
  });
});
