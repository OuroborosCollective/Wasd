import { REGION_LOD_TIERS } from "./RegionPressureTypes.js";

export function normalizeChunkKey(chunkKey) {
  return String(chunkKey ?? "").trim();
}

export function classifyObservation(distanceChunks) {
  if (!Number.isFinite(distanceChunks) || distanceChunks < 0) return "sleeping_region";
  if (distanceChunks <= 0) return "observed_chunk";
  if (distanceChunks <= 2) return "near_chunk";
  if (distanceChunks <= 8) return "region_summary";
  return "sleeping_region";
}

export function isRegionLodTier(value) {
  return REGION_LOD_TIERS.includes(value);
}
