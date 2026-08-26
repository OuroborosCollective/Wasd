import { describe, expect, it } from 'vitest';
import { checksumKappaLayers, verifyChunkKappaHash } from '../KappaLayers.js';
import {
  DEFAULT_ARELORIA_WORLD_SEED,
  deriveCanonicalLayerSeed,
} from '../CanonicalLayerSeed.js';
import { deriveCanonicalWorldgenSeedSignals } from '../CanonicalLayerSeedSignals.js';
import { RuntimeWorldBrainStatePort, chunkLayerStateToIARELayers } from '../WorldBrainRuntimePort.js';
import { createChunkKey, createTickId } from '../types.js';

describe('Canonical layer seed truth', () => {
  it('derives deterministic non-zero Kappa1000 layers from worldSeed + chunkKey + tick', () => {
    const chunkKey = createChunkKey(7, -3);
    const activationTick = createTickId(42);

    const a = deriveCanonicalLayerSeed({ worldSeed: 'seed-alpha', chunkKey, activationTick });
    const b = deriveCanonicalLayerSeed({ worldSeed: 'seed-alpha', chunkKey, activationTick });
    const c = deriveCanonicalLayerSeed({ worldSeed: 'seed-beta', chunkKey, activationTick });

    expect(a.layers).toEqual(b.layers);
    expect(a.seedHash).toBe(b.seedHash);
    expect(a.layers).not.toEqual(c.layers);
    expect(Number(checksumKappaLayers(a.layers))).toBe(6500);
    expect(Object.values(a.layers).every((value) => Number(value) > 0)).toBe(true);
    expect(verifyChunkKappaHash(chunkKey, a.layers, activationTick, a.seedHash)).toBe(true);
  });

  it('uses the canonical default world seed when no explicit runtime seed exists', () => {
    const environmentKeys = ['WASD_WORLD_SEED', 'ARELORIA_WORLD_SEED', 'WORLD_SEED'] as const;
    const previousValues = environmentKeys.map((key) => [key, process.env[key]] as const);

    try {
      for (const key of environmentKeys) delete process.env[key];

      const seed = deriveCanonicalLayerSeed({
        chunkKey: createChunkKey(0, 0),
        activationTick: createTickId(0),
      });

      expect(seed.worldSeed).toBe(DEFAULT_ARELORIA_WORLD_SEED);
      expect(Number(seed.checksum)).toBe(6500);
    } finally {
      for (const [key, value] of previousValues) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('folds deterministic biome terrain signals into the seed while preserving Kappa conservation', () => {
    const chunkKey = createChunkKey(3, 4);
    const activationTick = createTickId(0);
    const signals = deriveCanonicalWorldgenSeedSignals({ worldSeed: 'signal-seed', chunkKey, activationTick });

    const base = deriveCanonicalLayerSeed({ worldSeed: 'signal-seed', chunkKey, activationTick });
    const signaled = deriveCanonicalLayerSeed({ worldSeed: 'signal-seed', chunkKey, activationTick, signals });
    const repeat = deriveCanonicalLayerSeed({ worldSeed: 'signal-seed', chunkKey, activationTick, signals });

    expect(signals.source).toBe('OuroborosWorldDirectorV1');
    expect(signals.signature).toContain(String(chunkKey));
    expect(signaled.layers).toEqual(repeat.layers);
    expect(signaled.layers).not.toEqual(base.layers);
    expect(signaled.signals?.biomeId).toBe(signals.biomeId);
    expect(Number(signaled.checksum)).toBe(6500);
    expect(verifyChunkKappaHash(chunkKey, signaled.layers, activationTick, signaled.seedHash)).toBe(true);
  });

  it('seeds RuntimeWorldBrainStatePort chunks with worldgen signals before first tick', () => {
    const port = new RuntimeWorldBrainStatePort({ worldSeed: 'runtime-seed' });
    const chunkKey = createChunkKey(1, 2);

    port.registerChunk(chunkKey);

    const seedRecord = port.getCanonicalSeedRecord(chunkKey);
    const snapshot = port.getSnapshot();
    const chunkState = snapshot.layer_states.get(chunkKey);

    expect(seedRecord).not.toBeNull();
    expect(seedRecord!.signals).not.toBeNull();
    expect(seedRecord!.signals!.source).toBe('OuroborosWorldDirectorV1');
    expect(Number(seedRecord!.checksum)).toBe(6500);
    expect(chunkState).toBeDefined();
    expect(chunkLayerStateToIARELayers(chunkState!)).toEqual(seedRecord!.layers);
    expect(snapshot.world_hash).not.toBe('0'.repeat(64));
  });
});
