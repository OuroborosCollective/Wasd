# Visual Game Data Truth

This folder contains static visual rules for Areloria. It does not contain runtime state, fake snapshots, generated screenshots, or demo claims.

The runtime truth path is:

```text
server/world tick + world seed + chunk coordinates + kappa1000 position + semantic role + optional state hash
→ VisualSignature
→ AssetBinder
→ asset manifest entry + crop profile + render layer
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

Files:

- `visual_signature_contract.json` defines the canonical input/output contract.
- `biome_visual_profiles.json` defines static biome styling intent.
- `npc_visual_profiles.json` defines static NPC role visual categories.
- `building_visual_profiles.json` defines static building visual categories.
- `asset_crop_profiles.json` defines deterministic cropping/anchor rules.
- `world_render_layers.json` defines render-layer order and truth boundaries.

These files are authoring rules. Concrete visual selection must still be computed from the runtime VisualSignature.
