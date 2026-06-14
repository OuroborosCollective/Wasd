# Canonical Layer Seed Truth

## Purpose

New active WorldBrain chunks must not start from fake zero-state. They start from deterministic Kappa1000 13-layer seeds derived from canonical runtime inputs and shared world-generation signals.

## Seed Inputs

The canonical seed formula uses:

```text
version + worldSeed + chunkKey + activationTick + layerName + worldgenSignalSignature
```

The runtime source order for `worldSeed` is:

1. explicit `WorldTickThinShellOptions.worldSeed` or `RuntimeWorldBrainStatePortOptions.worldSeed`
2. `WASD_WORLD_SEED`
3. `ARELORIA_WORLD_SEED`
4. `WORLD_SEED`
5. canonical fallback `areloria:earth_1_1`

The fallback is stable and named. It is not random, not wall-clock based, and not a mock snapshot.

## Worldgen Signal Source

`RuntimeWorldBrainStatePort.registerChunk()` derives seed signals through `deriveCanonicalWorldgenSeedSignals()`.

Signal source:

```text
deriveChunkBiome()
  -> generateChunkScenePlan()
  -> biome / terrain / roads / settlement / props / NPC / collision signals
```

Signals include biome id, resource density, tree density, settlement intent, terrain mix, road pressure, settlement lots, resource props, structure props, collision pressure, NPC count, and deterministic risk/underworld pressure from terrain structure.

## Invariant

Each seed creates 13 non-zero Kappa1000 layers with fixed total checksum:

```text
sum(layers) = 6500
```

Worldgen signals bias individual layers, then deterministic conservation adjustment restores the checksum. The invariant is never weakened.

## Runtime Chain

```text
WorldTickThinShell.registerChunk(chunkKey)
  -> RuntimeWorldBrainStatePort.registerChunk(chunkKey)
  -> deriveCanonicalWorldgenSeedSignals({ worldSeed, chunkKey, activationTick })
  -> deriveCanonicalLayerSeed({ worldSeed, chunkKey, activationTick, signals })
  -> iareLayersToChunkLayerState(seed.layers)
  -> WorldBrainTickSystem reads the seeded layers on the next tick
```

## Guarantees

- No `Math.random()`.
- No `Date.now()`.
- No empty layer bootstrap for active chunks.
- No side-channel signal source.
- Same seed inputs and worldgen signals produce identical layers and seed hash.
- Seed hashes use existing `hashChunkKappa1000()` verification.

## Validation

Covered by:

- `server/src/core/are/__tests__/CanonicalLayerSeed.test.ts`
- `server/src/core/are/__tests__/WorldBrainRuntimeTruth.test.ts`
- `server/src/core/WorldTickPolicy.guard.ts`

## Follow-up

Next step: promote signal weights into a documented balancing matrix so layer pressure can be tuned without changing the deterministic seed contract.
