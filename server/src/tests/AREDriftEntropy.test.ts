import { describe, expect, it } from 'vitest';
import { AREDriftEntropy } from '../core/are/AREDriftEntropy';
import { AREPayloadFactory } from '../core/are/AREPayload';

function createNpc(energy = 10) {
  return AREPayloadFactory.createNormalized(
    'npc:entropy',
    { x: 1, y: 2, z: 0 },
    { x: 0, y: 0, z: 0 },
    { energy, health: 20 },
  );
}

describe('ARE-Logic: drift and entropy helpers', () => {
  it('maps low drift to calm observation', () => {
    const result = AREDriftEntropy.computeDrift({ x: 1, y: 2, z: 0 }, { x: 1000, y: 2000, z: 0 }, 'neutral');
    expect(result.playerDrift).toBe(0);
    expect(result.status).toBe('calm');
    expect(result.action).toBe('observe');
  });

  it('maps high ally drift to anchor support', () => {
    const result = AREDriftEntropy.computeDrift({ x: 20, y: 2, z: 0 }, { x: 1000, y: 2000, z: 0 }, 'ally');
    expect(result.status).toBe('chaotic');
    expect(result.action).toBe('anchor_support');
  });

  it('maps high rival drift to adaptive response', () => {
    const result = AREDriftEntropy.computeDrift({ x: 20, y: 2, z: 0 }, { x: 1000, y: 2000, z: 0 }, 'rival');
    expect(result.status).toBe('chaotic');
    expect(result.action).toBe('adaptive_response');
  });

  it('decays energy deterministically without mutating input', () => {
    const npc = createNpc(10);
    const result = AREDriftEntropy.applyEntropy(npc, 3);

    expect(result.event).toBe('entropy_decay');
    expect(result.payload?.energy).toBe(7);
    expect(npc.energy).toBe(10);
    expect(Object.isFrozen(result.payload)).toBe(true);
  });

  it('spawns an energy capsule when energy reaches zero', () => {
    const npc = createNpc(1);
    const result = AREDriftEntropy.applyEntropy(npc, 1);

    expect(result.event).toBe('capsule_spawn');
    expect(result.payload).toBeNull();
    expect(result.capsule?.kind).toBe('EnergyCapsule');
    expect(result.capsule?.position).toEqual(npc.position);
    expect(result.capsule?.sourceEntityId).toBe(npc.entityId);
  });
});
