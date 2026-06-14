# Canonical Layer Seed Truth

## Purpose

New active WorldBrain chunks must not start from fake zero-state. They start from deterministic Kappa1000 13-layer seeds derived from canonical runtime inputs.

## Seed Inputs

The canonical seed formula uses:

```text
version + worldSeed + chunkKey + activationTick + layerName
```

The runtime source order for `worldSeed` is:

1. explicit `WorldTickThinShellOptions.worldSeed` or `RuntimeWorldBrainStatePortOptions.worldSeed`
2. `WASD_WORLD_SEED`
3. `ARELORIA_WORLD_SEED`
4. `WORLD_SEED`
5. canonical fallback `areloria:earth_1_1`

The fallback is stable and named. It is not random, not wall-clock based, and not a mock snapshot.

## Invariant

Each seed creates 13 non-zero Kappa1000 layers with fixed total checksum:

```text
sum(layers) = 6500
```

This preserves a neutral conservation baseline while still giving every chunk a unique deterministic layer vector.

## Runtime Chain

```text
WorldTickThinShell.registerChunk(chunkKey)
  -> RuntimeWorldBrainStatePort.registerChunk(chunkKey)
  -> deriveCanonicalLayerSeed({ worldSeed, chunkKey, activationTick })
  -> iareLayersToChunkLayerState(seed.layers)
  -> WorldBrainTickSystem reads the seeded layers on the next tick
```

## Guarantees

- No `Math.random()`.
- No `Date.now()`.
- No empty layer bootstrap for active chunks.
- Same seed inputs produce identical layers and seed hash.
- Different `worldSeed`, `chunkKey`, or `activationTick` can produce different layers.
- Seed hashes use existing `hashChunkKappa1000()` verification.

## Validation

Covered by:

- `server/src/core/are/__tests__/CanonicalLayerSeed.test.ts`
- `server/src/core/are/__tests__/WorldBrainRuntimeTruth.test.ts`
- `server/src/core/WorldTickPolicy.guard.ts`

## Follow-up

Next step: feed biome/terrain/settlement signals into the canonical seed formula as explicit deterministic inputs, without changing the conservation invariant or introducing side-channel state.
