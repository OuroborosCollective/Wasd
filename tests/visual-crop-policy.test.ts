import { describe, expect, it } from 'vitest';
import { resolveVisualCropPolicy } from '../apps/client-2d/src/stackedProps';
import { createVisualSignature } from '../apps/client-2d/src/world/VisualSignature';

describe('visual crop policy resolver', () => {
  it('uses deterministic crop profile ids from visual signatures', () => {
    const tree = createVisualSignature({
      subjectKind: 'prop',
      entityId: 'tree_a',
      semanticType: 'tree',
      worldSeed: 'areloria:test',
      worldTick: 0,
      chunkX: 0,
      chunkZ: 0,
      tileX: 1,
      tileZ: 1,
      source: 'test',
    });

    const actor = createVisualSignature({
      subjectKind: 'npc',
      entityId: 'npc_guard_001',
      semanticType: 'guard',
      role: 'guard',
      worldSeed: 'areloria:test',
      worldTick: 0,
      chunkX: 0,
      chunkZ: 0,
      tileX: 1,
      tileZ: 1,
      source: 'test',
    });

    expect(resolveVisualCropPolicy(tree).paddingY).toBe(6);
    expect(resolveVisualCropPolicy(actor).anchorY).toBe(1);
    expect(resolveVisualCropPolicy(null).anchorX).toBe(0.5);
  });
});
