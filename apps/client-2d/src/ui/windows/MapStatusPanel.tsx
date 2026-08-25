// MapStatusPanel
// Live snapshot-based map display for ArelorianStitchHud
// Server-authoritative, display-only

import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";
import { deriveChunkBiome } from "@wasd/shared";

interface MapStatusPanelProps {
  snapshot: LiveGameplaySnapshot;
  /** Optional active chunk count from ChunkManager */
  activeChunkCount?: number;
  /** Optional world seed for biome derivation */
  worldSeed?: string;
}

export function MapStatusPanel({ snapshot, activeChunkCount, worldSeed = "areloria:earth_1_1" }: MapStatusPanelProps) {
  const map = snapshot.map;

  // Derive biome from chunk coordinates for debug display
  // This matches the deterministic biome derivation in ChunkManager
  const derivedBiome = (map.chunkX !== null && map.chunkZ !== null)
    ? deriveChunkBiome(map.chunkX, map.chunkZ, worldSeed)
    : null;

  // Resource count from snapshot
  const resourceCount = snapshot.resources?.length ?? 0;

  // POI count from snapshot
  const poiCount = snapshot.worldPois?.length ?? 0;

  // Camp NPC count from snapshot
  const campNpcCount = snapshot.campNpcs?.length ?? 0;

  // Discovery stats (optional, for map fog progression)
  const discoveryStats = snapshot.discoveryStats;
  const discoveredPoiCount = discoveryStats?.discoveredPoiCount ?? poiCount;
  const discoveredChunkCount = discoveryStats?.discoveredChunkCount ?? 0;
  const visiblePoiCount = discoveryStats?.visiblePoiCount ?? poiCount;

  return (
    <div className="stitch-grid-panel" data-testid="map-panel-live" role="region" aria-label="Map Status">
      <article className="stitch-info">
        <small>Region</small>
        <b>{map.regionName}</b>
      </article>
      <article className="stitch-info">
        <small>Chunk</small>
        <b>
          {map.chunkX === null || map.chunkZ === null
            ? "waiting"
            : `${map.chunkX}, ${map.chunkZ}`}
        </b>
      </article>
      <article className="stitch-info">
        <small>Active Chunks</small>
        <b>{activeChunkCount ?? map.visibleChunks ?? "—"}</b>
      </article>
      <article className="stitch-info">
        <small>Resources</small>
        <b>{resourceCount}</b>
      </article>
      <article className="stitch-info">
        <small>POIs</small>
        <b>{poiCount}</b>
      </article>
      <article className="stitch-info">
        <small>Camp NPCs</small>
        <b>{campNpcCount}</b>
      </article>
      <article className="stitch-info" data-testid="map-discovered-poi-count">
        <small>Discovered</small>
        <b>{discoveredPoiCount}</b>
      </article>
      <article className="stitch-info" data-testid="map-discovered-chunk-count">
        <small>Chunks Explored</small>
        <b>{discoveredChunkCount}</b>
      </article>
      <article className="stitch-info">
        <small>Biome</small>
        <b>{derivedBiome ?? map.biome ?? "unknown"}</b>
      </article>
      {process.env.NODE_ENV !== "production" && (
        <article className="stitch-info">
          <small>WorldSeed</small>
          <b style={{ fontSize: "9px", opacity: 0.7 }}>{worldSeed.slice(0, 16)}...</b>
        </article>
      )}
    </div>
  );
}