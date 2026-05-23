# Asset Forge and 2D Pipeline

Tags: `assets`, `pixi`, `stitch`, `atlas`, `forge`, `2d-client`
Status: `implemented-and-evolving`

The **Asset Forge** converts imported sprite and atlas material into deterministic runtime metadata for the Areloria 2D client.

It protects the client from broken paths, missing frames, atlas-sheet rendering mistakes and inconsistent pickable metadata.

---

## Pipeline order

The client 2D build path should run in this order:

```txt
are-asset-forge.mjs
→ enrich-stitch-atlas-frames.mjs
→ validate-client-2d-assets.mjs
→ extract-2d-weapon-pool.mjs
→ vite build
```

---

## ARE Asset Forge

Repository anchor:

```txt
scripts/are-asset-forge.mjs
```

Responsibilities:

- scan `apps/client-2d/public/2d-assets/manifest.json`,
- infer deterministic roles such as `house`, `tree`, `terrain`, `npc`, `prop`, `fx`,
- mark pickable objects,
- add stable `assetHash`,
- read PNG signature dimensions without extra dependencies,
- add depth hints such as `zHeight`, `isoFootprint`, and `shadow`,
- write a Forge report,
- quarantine obviously broken entries.

---

## Stitch atlas frame enrichment

Repository anchor:

```txt
scripts/enrich-stitch-atlas-frames.mjs
```

Responsibilities:

- read Stitch JSON atlases,
- choose a valid frame,
- write `entry.frame`,
- normalize width and height,
- prepare atlases for Pixi cropping.

---

## Runtime cropping

Repository anchor:

```txt
apps/client-2d/src/stackedProps.ts
```

`make2dProp()` must respect `entry.frame`. Without this, the runtime may show the entire atlas sheet instead of a single building or tree.

---

## Manifest anchors

| File | Purpose |
| --- | --- |
| `apps/client-2d/public/2d-assets/manifest.json` | canonical runtime manifest |
| `apps/client-2d/public/2d-assets/stitch/stitch-atlas-manifest.json` | imported Stitch source index |
| `apps/client-2d/public/2d-assets/credits/are-asset-forge-report.json` | generated Forge report |

---

## Quality gates

Every asset PR should answer:

1. Does the asset appear as a single frame?
2. Does it have `role`?
3. Does it have `pickable` when expected?
4. Does it have stable `assetHash`?
5. Does the validator pass?
6. Does the smoke build include the Forge report?

---

## See also

- [[Home]]
- [[Glossary]]
- [[Implementation Map|Implementation-Map]]
- [[WorldTick and 10Hz Simulation|WorldTick-and-10Hz-Simulation]]