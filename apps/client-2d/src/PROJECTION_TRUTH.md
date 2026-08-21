# 2D Projection Truth

The `/2d` client is a renderer of the canonical server world. It must not create a second game world.

Production rules:

- Entity identity and position come from authoritative server heartbeat/tick data.
- Visual identity comes from accepted presentation bindings and the real client asset manifest.
- Generic actor geometry is allowed only with `VITE_ARELORIA_DEBUG_SHAPES=true`.
- Missing or failed actor presentation evidence must be shown explicitly as unavailable, not replaced with a plausible-looking fake actor.
- `DeterministicWorldIsoAppFuture.tsx` is not a production truth source and must not replace the live renderer.

## Static world surface

The active `LiveAuthoritativeWorld2D` now renders terrain, roads, buildings and props through `LiveAssetWorldSurface`.

The surface is deliberately **presentation-only**. It is generated with the shared `OuroborosWorldDirectorV1`, but it may only start after `/health/world-projection` supplies server-owned provenance:

- canonical world seed resolved by `resolveCanonicalWorldSeed()`,
- `KAPPA_STANDARD`,
- `DEFAULT_CHUNK_TILES`,
- shared generator identity,
- current server tick,
- current world hash when initialized.

The client does not choose or persist its own production world seed. The server endpoint labels this projection `SERVER_SEEDED_STATIC_PRESENTATION` and `gameplayAuthority:false`.

`LiveAssetWorldSurface` binds every visible static-world element to the real merged asset manifest:

- terrain -> `bindTerrainWithContext`,
- roads -> `bindRoadWithContext`,
- buildings -> `bindBuildingWithContext`,
- props -> `bindPropWithContext`.

There is no production fallback to colored terrain diamonds, road diamonds, circle trees or hand-drawn buildings. A missing world asset is skipped and counted in runtime diagnostics instead of being replaced by convincing fake art.

The deterministic scene plan also contains NPC suggestions, but the live surface intentionally does **not** render them. Runtime players, NPCs and loot remain exclusively owned by authoritative heartbeat/tick data and are drawn in the actor layer.

## Runtime evidence

The HUD reports the live projection separately from actor presentation:

- active world chunks,
- resolved world assets,
- missing world assets,
- live actor count,
- resolved/missing actor presentation,
- server tick.

A successful build or a populated asset manifest is not visual-runtime Green by itself. Final visual Green still requires a real browser/playtest capture from the deployed revision showing the real surface and live actors together.
