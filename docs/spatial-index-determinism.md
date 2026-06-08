# Deterministic SpatialIndex

`server/lib/SpatialIndex.js` is the ESM primary spatial index for GPS-backed logic gates and local MMO proximity queries.

## Why this exists

The old implementation always inserted into the first child after the root split. That makes the tree drift into an imbalanced shape and hurts 10Hz world logic under load.

The upgraded index is deterministic and production-safer:

- validates latitude, longitude, altitude, radius and IDs
- supports both `lon` and legacy `lng`
- keeps stable query ordering by distance and ID
- avoids unnecessary `sqrt` during radius filtering
- supports `insert`, `upsert`, `update`, `remove`, `nearest`, `queryBounds`, `stats` and `clear`
- selects subtrees by least bounding-box enlargement
- splits nodes by the axis with the largest spread

## 10Hz rule

Use this index for local GPS gates, trigger zones, interaction radii and small/medium regional indexing.

For large procedural worlds, keep the chunk grid above it:

```txt
WorldSpatialGrid
  -> ChunkKey(x,z)
    -> SpatialIndex per active chunk or region
```

That keeps the 10Hz loop cheap: chunk-first, tree-second.

## Smoke test

Run from the repository root after dependencies are available:

```bash
node server/lib/SpatialIndex.test.mjs
```

The test verifies deterministic query order, node splitting, update/remove behavior and legacy `lng` compatibility.
