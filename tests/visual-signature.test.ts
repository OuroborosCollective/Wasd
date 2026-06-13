import { describe, expect, it } from 'vitest';
import {
  VISUAL_KAPPA_INVARIANT,
  createNpcPortraitSignature,
  createVisualSignature,
  createVisualSignatureFromBinding,
  deterministicVisualIndex,
  getNpcVisualCategory,
} from '../apps/client-2d/src/world/VisualSignature';

describe('VisualSignature', () => {
  it('derives the same signature for the same runtime truth input', () => {
    const input = {
      subjectKind: 'npc' as const,
      entityId: 'npc_guard_001',
      semanticType: 'guard',
      role: 'guard',
      worldSeed: 'areloria:test',
      worldTick: 42000,
      chunkX: 2,
      chunkZ: -1,
      tileX: 7,
      tileZ: 9,
      kappaX: 7500,
      kappaZ: 9500,
      biomeId: 'forest_village',
      factionId: 'outpost_guard',
      culture: 'generic',
      stateHash: 'state_a',
      source: 'test' as const,
    };

    const a = createVisualSignature(input);
    const b = createVisualSignature(input);

    expect(a.signatureId).toBe(b.signatureId);
    expect(a.deterministicSeed).toBe(b.deterministicSeed);
    expect(a.kappa).toBe(VISUAL_KAPPA_INVARIANT);
    expect(a.portraitCategory).toBe('guard_warrior');
    expect(a.cropProfileId).toBe('actor_foot_anchor_bottom_center');
  });

  it('does not change deterministic selection inside one bounded visual epoch', () => {
    const base = {
      subjectKind: 'prop' as const,
      entityId: 'tree_a',
      semanticType: 'tree',
      worldSeed: 'areloria:test',
      chunkX: 0,
      chunkZ: 0,
      tileX: 1,
      tileZ: 1,
      biomeId: 'forest',
      source: 'test' as const,
    };

    const a = createVisualSignature({ ...base, worldTick: 1 });
    const b = createVisualSignature({ ...base, worldTick: 99999 });

    expect(a.visualEpoch).toBe(0);
    expect(b.visualEpoch).toBe(0);
    expect(a.signatureId).toBe(b.signatureId);
    expect(a.deterministicSeed).toBe(b.deterministicSeed);
  });

  it('changes selection only when the visual epoch changes', () => {
    const base = {
      subjectKind: 'prop' as const,
      entityId: 'tree_a',
      semanticType: 'tree',
      worldSeed: 'areloria:test',
      chunkX: 0,
      chunkZ: 0,
      tileX: 1,
      tileZ: 1,
      biomeId: 'forest',
      source: 'test' as const,
    };

    const a = createVisualSignature({ ...base, worldTick: 99999 });
    const b = createVisualSignature({ ...base, worldTick: 100000 });

    expect(a.visualEpoch).toBe(0);
    expect(b.visualEpoch).toBe(1);
    expect(a.signatureId).not.toBe(b.signatureId);
  });

  it('maps NPC portrait categories from the shared role contract', () => {
    expect(getNpcVisualCategory('blacksmith')).toBe('blacksmith_crafter');
    expect(getNpcVisualCategory('guard_captain')).toBe('guard_warrior');
    expect(getNpcVisualCategory('unknown_role')).toBe('generic_npc');

    const portrait = createNpcPortraitSignature({
      entityId: 'npc_blacksmith_001',
      role: 'blacksmith',
      worldSeed: 'areloria:test',
      worldTick: 0,
      chunkX: 0,
      chunkZ: 0,
      tileX: 3,
      tileZ: 4,
    });

    expect(portrait.subjectKind).toBe('portrait');
    expect(portrait.spriteCategory).toBe('ui');
    expect(portrait.portraitCategory).toBe('blacksmith_crafter');
  });

  it('creates binder-compatible seeds without runtime randomness', () => {
    const signature = createVisualSignatureFromBinding('building', 'house', {
      seed: 'chunk:0:0:areloria:test:building:lot_a',
      biome: 'plains',
      factionId: 'settlers',
      culture: 'generic',
    });

    expect(signature.assetIntent).toBe('building:house');
    expect(signature.spriteCategory).toBe('buildings');
    expect(signature.tags).toContain('biome:plains');
    expect(deterministicVisualIndex(signature.deterministicSeed, 16)).toBe(signature.paletteIndex);
  });
});
