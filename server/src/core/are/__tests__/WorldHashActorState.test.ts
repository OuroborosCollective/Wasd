import { describe, expect, it } from 'vitest';
import { RuntimeWorldBrainStatePort, type ActorHashEntry } from '../WorldBrainRuntimePort.js';
import { createChunkKey } from '../types.js';

function player(id: string, x: number, y: number, state = 'idle', z = 0): ActorHashEntry {
  return { id, position: { x, y, z }, state };
}

const CHUNK = createChunkKey(0, 0);

function snapshotHash(port: RuntimeWorldBrainStatePort): string {
  return String(port.getSnapshot().world_hash);
}

describe('RuntimeWorldBrainStatePort actor-state world hash (AIM-104)', () => {
  it('folds actor state into the canonical world hash', () => {
    const port = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    port.registerChunk(CHUNK);
    const withoutActors = snapshotHash(port);

    port.setActorStateProvider(() => [player('p1', 5, 0, 'walking')]);
    port.registerChunk(CHUNK); // re-register to recompute hash with actor segment
    const withActors = snapshotHash(port);

    // Actor state must change the hash; otherwise divergence is undetectable.
    expect(withActors).not.toBe(withoutActors);
    // Still a 64-char hex StateHash.
    expect(withActors).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces identical hashes for identical actor state regardless of provider order (deterministic)', () => {
    const a = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    const b = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    a.registerChunk(CHUNK);
    b.registerChunk(CHUNK);

    a.setActorStateProvider(() => [player('pa', 3, 4, 'walking'), player('pb', 10, 15, 'idle')]);
    b.setActorStateProvider(() => [player('pb', 10, 15, 'idle'), player('pa', 3, 4, 'walking')]); // different order

    a.registerChunk(CHUNK);
    b.registerChunk(CHUNK);

    expect(snapshotHash(a)).toBe(snapshotHash(b));
  });

  it('produces different hashes when actor positions differ (divergence detection)', () => {
    const a = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    const b = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    a.registerChunk(CHUNK);
    b.registerChunk(CHUNK);

    a.setActorStateProvider(() => [player('p1', 0, 0, 'idle')]);
    b.setActorStateProvider(() => [player('p1', 5, 0, 'walking')]);

    a.registerChunk(CHUNK);
    b.registerChunk(CHUNK);

    expect(snapshotHash(a)).not.toBe(snapshotHash(b));
  });

  it('quantizes float positions to millitiles so float drift does not split hashes', () => {
    const a = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    const b = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    a.registerChunk(CHUNK);
    b.registerChunk(CHUNK);

    // 3.5355339 vs 3.5355340 both round to 3536 millitiles (Math.round(x*1000)).
    a.setActorStateProvider(() => [player('p1', 3.5355339, 0, 'walking')]);
    b.setActorStateProvider(() => [player('p1', 3.5355340, 0, 'walking')]);

    a.registerChunk(CHUNK);
    b.registerChunk(CHUNK);

    expect(snapshotHash(a)).toBe(snapshotHash(b));
  });

  it('ignores actor state when no provider is set (backward-compatible shape)', () => {
    const port = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    port.registerChunk(CHUNK);
    const hash = snapshotHash(port);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Same as a plain chunk-only hash recomputed again.
    port.registerChunk(CHUNK);
    expect(snapshotHash(port)).toBe(hash);
  });

  it('treats empty actor list the same as no provider', () => {
    const a = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    const b = new RuntimeWorldBrainStatePort({ worldSeed: 's1' });
    a.registerChunk(CHUNK);
    b.registerChunk(CHUNK);
    a.setActorStateProvider(() => []);
    a.registerChunk(CHUNK);
    expect(snapshotHash(a)).toBe(snapshotHash(b));
  });
});
