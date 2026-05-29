import { describe, expect, it } from 'vitest';
import { ARENpcEvolution } from '../core/are/ARENpcEvolution';
import { AREPayloadFactory } from '../core/are/AREPayload';

function npc(id: string, pos = { x: 4, y: 5, z: 0 }, energy = 10, health = 20) {
  return AREPayloadFactory.createNormalized(
    id,
    pos,
    { x: 0, y: 0, z: 0 },
    { energy, health },
  );
}

function capsule(id: string, pos = { x: 4.5, y: 5, z: 0 }) {
  return AREPayloadFactory.createNormalized(
    id,
    pos,
    { x: 0, y: 0, z: 0 },
    { kind: 'EnergyCapsule', residualEnergy: 3 },
  );
}

describe('ARE-Logic: NPC evolution helpers', () => {
  it('does not fuse NPCs on different kappa positions', () => {
    const result = ARENpcEvolution.fuseOnSameKappaCell(npc('a'), npc('b', { x: 5, y: 5, z: 0 }));
    expect(result.fused).toBe(false);
    expect(result.consumedEntityIds).toEqual([]);
  });

  it('fuses NPCs on the same kappa position into an apex payload', () => {
    const a = npc('a', { x: 4, y: 5, z: 0 }, 10, 20);
    const b = npc('b', { x: 4, y: 5, z: 0 }, 7, 11);
    const result = ARENpcEvolution.fuseOnSameKappaCell(a, b);

    expect(result.fused).toBe(true);
    expect(result.consumedEntityIds).toEqual(['a', 'b']);
    expect(result.apex?.kind).toBe('ApexNpc');
    expect(result.apex?.energy).toBe(17);
    expect(result.apex?.health).toBe(31);
    expect(result.apex?.position).toEqual(a.position);
    expect(Object.isFrozen(result.apex)).toBe(true);
  });

  it('scans only the NPC own chunk for energy capsules', () => {
    const seeker = npc('seeker', { x: 4, y: 5, z: 0 });
    const local = capsule('capsule:local', { x: 4.5, y: 5, z: 0 });
    const far = capsule('capsule:far', { x: 100, y: 5, z: 0 });

    const result = ARENpcEvolution.scanOwnChunkForCapsule(seeker, [far, local]);

    expect(result.capsule?.entityId).toBe('capsule:local');
    expect(result.movementCost).toBe(500);
    expect(result.direction).toEqual({ x: 500, y: 0, z: 0 });
  });

  it('returns no target when no capsule is in the same chunk', () => {
    const seeker = npc('seeker', { x: 4, y: 5, z: 0 });
    const far = capsule('capsule:far', { x: 100, y: 5, z: 0 });

    const result = ARENpcEvolution.scanOwnChunkForCapsule(seeker, [far]);

    expect(result.capsule).toBeNull();
    expect(result.direction).toBeNull();
    expect(result.movementCost).toBe(0);
  });
});
