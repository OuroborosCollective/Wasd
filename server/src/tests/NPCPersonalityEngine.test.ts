import { describe, it, expect } from 'vitest';
import { NPCPersonalityEngine } from '../modules/npc/NPCPersonalityEngine.js';

describe('NPCPersonalityEngine Determinism', () => {
  const engine = new NPCPersonalityEngine();

  it('should generate identical traits for the same NPC ID', () => {
    const id = 'npc_stable_123';
    const traits1 = engine.generateTraits(id);
    const traits2 = engine.generateTraits(id);

    expect(traits1).toEqual(traits2);
    expect(traits1.courage).toBeGreaterThanOrEqual(0);
    expect(traits1.courage).toBeLessThanOrEqual(1);
  });

  it('should generate different traits for different NPC IDs', () => {
    const traits1 = engine.generateTraits('npc_a');
    const traits2 = engine.generateTraits('npc_b');

    expect(traits1).not.toEqual(traits2);
  });
});
