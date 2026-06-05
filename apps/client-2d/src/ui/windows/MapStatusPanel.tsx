// MapStatusPanel
// Live snapshot-based map display for ArelorianStitchHud
// Server-authoritative, display-only

import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";

interface MapStatusPanelProps {
  snapshot: LiveGameplaySnapshot;
}

export function MapStatusPanel({ snapshot }: MapStatusPanelProps) {
  const map = snapshot.map;

  return (
    <div className="stitch-grid-panel" data-testid="map-panel-live">
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
        <small>Visible Chunks</small>
        <b>{map.visibleChunks ?? "waiting"}</b>
      </article>
      <article className="stitch-info">
        <small>Biome</small>
        <b>{map.biome ?? "unknown"}</b>
      </article>
    </div>
  );
}