# Stateless Core Fix Log

## fix/stateless-world-core-runtime

### Fixed

- `server/src/npc/CampNpcRoutes.ts`
  - Removed fixed generated camp lookup at `{ chunkX: 0, chunkZ: 0 }` for camp stock reads.
  - Camp stock now resolves generated camp POIs from request tile/chunk context when provided.
  - Starter village POIs still come from the starter POI provider, not from an inline generated chunk literal.

### Prepared

- `server/src/resources/ResourceWorldSeedResolver.ts`
  - Adds a small resolver seam for resource world seed input.
  - This prepares `ChunkResourceGenerator.ts` for the next patch, where module-level world seed constants should be removed fully.

### Next targets

- `apps/client-2d/src/DeterministicWorldIsoApp.tsx`
- `apps/client-2d/src/world/ChunkManager.ts`
- `server/src/resources/ChunkResourceGenerator.ts`
