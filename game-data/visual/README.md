# Visual Game Data Truth

This folder contains static visual rules for Areloria. It does not contain runtime state, fake snapshots, generated screenshots, or demo claims.

Runtime truth path:

```text
world tick + world seed + chunk + kappa1000 + semantic role + optional state hash
→ VisualSignature
→ AssetBinder
→ manifest entry + crop profile + render layer
→ rendered client presentation
```

Allowed runtime inputs:

- `worldSeed`
- `worldTick`
- `chunkX`, `chunkZ`
- `tileX`, `tileZ`
- `kappaX`, `kappaZ`, with `kappa = 1000`
- `entityId`
- `semanticType`
- `role`
- `biomeId`
- `factionId`
- `culture`
- optional authoritative `stateHash`

Disallowed truth inputs:

- `Date.now()`
- `performance.now()`
- `Math.random()`
- local storage values
- screenshots as proof
- smoke-test-only spawned assets
- placeholder truth that is not backed by runtime world data

The current runtime adapter in this change is `apps/client-2d`. A 3D client must consume the same `VisualSignature` contract instead of creating parallel visual truth.
