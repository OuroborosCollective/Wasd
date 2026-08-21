# 2D Projection Truth

The `/2d` client is a renderer of the canonical server world. It must not create a second game world.

Production rules:

- Entity identity and position come from authoritative server heartbeat/tick data.
- Visual identity comes from accepted presentation bindings and the real client asset manifest.
- Generic geometry is allowed only with `VITE_ARELORIA_DEBUG_SHAPES=true`.
- Missing or failed presentation evidence must be shown explicitly as unavailable, not replaced with a plausible-looking fake actor.
- `DeterministicWorldIsoAppFuture.tsx` is not a production truth source and must not replace the live renderer.
- Terrain/world-surface restoration is a separate requirement under issue #2568; actor sprite restoration alone does not make the full 2D world Green.