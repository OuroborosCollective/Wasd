import { classifyObservation, normalizeChunkKey } from "./ObservationBounds.js";

export function createRegionLodState(input) {
  const tick = Number.isSafeInteger(input.tick) && input.tick >= 0 ? input.tick : 0;
  const chunkKeys = [...new Set((input.chunkKeys ?? []).map(normalizeChunkKey).filter(Boolean))].sort();
  const distanceChunks = Number.isFinite(input.distanceChunks) ? Math.floor(input.distanceChunks) : 999999;
  return Object.freeze({
    tick,
    regionId: String(input.regionId ?? "unknown_region").trim(),
    chunkKeys: Object.freeze(chunkKeys),
    lodTier: classifyObservation(distanceChunks),
  });
}
