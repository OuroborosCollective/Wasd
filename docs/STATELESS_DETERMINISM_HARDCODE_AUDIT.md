# Stateless Determinism Hardcode Audit

ARELORIA must distinguish between **axioms** and **runtime state**.

Axioms are allowed to be constants. Runtime state must be derived from explicit inputs through deterministic resolvers.

## Allowed hardcoding: axioms

These are system laws and may remain fixed:

```txt
KAPPA_INVARIANT = 1000
TICK_RATE = 10Hz
CHUNK_SIZE_TILES = 16
VIEW_RADIUS_CHUNKS = 1
```

Axioms should be named clearly and centralized where possible.

## Toxic hardcoding: runtime state

These values must not be embedded directly inside components, render boot paths, gameplay services, or quest flows:

```txt
playerId = "guest"
playerName = "Architect"
chunkX = 0
chunkZ = 0
biomeId = "forest_village"
WORLD_SEED = "areloria:earth_1_1"
Date.now() in deterministic logic
Math.random() anywhere near gameplay/render decisions
```

These are hidden state. Hidden state breaks replayability, persistence, identity continuity, and dynamic world expansion.

## New resolver seam

The first resolver lives at:

```txt
apps/client-2d/src/world/StatelessWorldRuntimeResolver.ts
```

It converts explicit deterministic inputs into runtime state:

```ts
resolveStatelessWorldRuntime({
  identity,
  worldSeed,
  currentPosition,
  storedSpawn,
  kappaInvariant,
  chunkSizeTiles,
});
```

It returns:

```txt
playerId
worldSeed
position
chunkX
chunkZ
chunkKey
biomeId
visibleChunkKeys
spawnCell
initialChunkPlanInput
```

The renderer should consume this output instead of inventing its own fallback state.

## Audit script

Run:

```bash
node scripts/audit-hardcoded-runtime-state.mjs
```

To fail CI on findings:

```bash
node scripts/audit-hardcoded-runtime-state.mjs --fail
```

Findings do not always mean the code is wrong. Some values may be true axioms or visual-only timing. Mark true exceptions explicitly with one of these comments on the same line:

```ts
// ARE_AXIOM_ALLOW_HARDCODE
// STATELESS_AUDIT_ALLOW
// HARDCODE_AUDIT_ALLOW
```

Do not use allow markers to hide real runtime state. Use them only for named axioms or harmless UI-only constants.

## Conversion pattern

Bad:

```ts
generateChunkScenePlan({
  worldSeed: WORLD_SEED,
  chunkX: 0,
  chunkZ: 0,
  biomeId: "forest_village",
  kappa: 1000,
  chunkTiles: 16,
});
```

Good:

```ts
const runtime = resolveStatelessWorldRuntime({
  identity,
  worldSeed,
  currentPosition,
  storedSpawn,
});

generateChunkScenePlan(runtime.initialChunkPlanInput);
```

## Current priority targets

1. `apps/client-2d/src/DeterministicWorldIsoApp.tsx`
2. `apps/client-2d/src/world/ChunkManager.ts`
3. `apps/client-2d/src/CyberZenLoginGate.tsx`
4. `apps/client-2d/src/ui/windows/CharacterSelectPanel.tsx`
5. `server/src/character/StartPathQuestLine.ts`
6. `server/src/quests/QuestProgressionStore.ts`

## Rule of thumb

```txt
AXIOM    -> named constant, allowed
CONFIG   -> explicit external input
RUNTIME  -> resolver output
PREVIEW  -> must be clearly marked as preview
FALLBACK -> deterministic resolver fallback only
```

If a value can differ by player, seed, savegame, chunk, biome, server tick, inventory, quest state, or database state, it is runtime state and must not be hardcoded.
