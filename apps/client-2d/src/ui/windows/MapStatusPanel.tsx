// MapStatusPanel
// Live snapshot-based map display for ArelorianStitchHud
// Server-authoritative, display-only

import { useState } from "react";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";
import { dispatchAurionTransition } from "../../game/gameplayActions";
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
  const [aurionRequestError, setAurionRequestError] = useState<string | null>(null);
  const [isPendingAurionRequest, setIsPendingAurionRequest] = useState(false);

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

  const chunkDisplay =
    map.chunkX === null || map.chunkZ === null
      ? "waiting"
      : `${map.chunkX}, ${map.chunkZ}`;
  const activeChunksDisplay = String(
    activeChunkCount ?? map.visibleChunks ?? "—"
  );
  const biomeDisplay = derivedBiome ?? map.biome ?? "unknown";
  const aurionTransition = snapshot.aurionTransition;
  const canRequestAurionTransition = aurionTransition?.status === "idle";

  const requestAurionTransition = async () => {
    setIsPendingAurionRequest(true);
    try {
      const result = await dispatchAurionTransition();
      setAurionRequestError(result.ok ? null : result.error ?? "aurion_transition_failed");
    } finally {
      setIsPendingAurionRequest(false);
    }
  };

  return (
    <div
      className="stitch-grid-panel"
      data-testid="map-panel-live"
      role="region"
      aria-label="Map and Exploration Status"
    >
      <article
        className="stitch-info"
        title={`Region: ${map.regionName}`}
        aria-label={`Region: ${map.regionName}`}
      >
        <small>Region</small>
        <b>{map.regionName}</b>
      </article>
      <article
        className="stitch-info"
        title={`Chunk coordinates: ${chunkDisplay}`}
        aria-label={`Chunk: ${chunkDisplay}`}
      >
        <small>Chunk</small>
        <b>{chunkDisplay}</b>
      </article>
      <article
        className="stitch-info"
        title={`Active Chunks: ${activeChunksDisplay}`}
        aria-label={`Active Chunks: ${activeChunksDisplay}`}
      >
        <small>Active Chunks</small>
        <b>{activeChunksDisplay}</b>
      </article>
      <article
        className="stitch-info"
        title={`Resources in region: ${resourceCount}`}
        aria-label={`Resources: ${resourceCount}`}
      >
        <small>Resources</small>
        <b>{resourceCount}</b>
      </article>
      <article
        className="stitch-info"
        title={`Points of Interest in region: ${poiCount}`}
        aria-label={`Points of Interest: ${poiCount}`}
      >
        <small>POIs</small>
        <b>{poiCount}</b>
      </article>
      <article
        className="stitch-info"
        title={`Camp NPCs in region: ${campNpcCount}`}
        aria-label={`Camp NPCs: ${campNpcCount}`}
      >
        <small>Camp NPCs</small>
        <b>{campNpcCount}</b>
      </article>
      <article
        className="stitch-info"
        data-testid="map-discovered-poi-count"
        title={`Discovered Points of Interest: ${discoveredPoiCount}`}
        aria-label={`Discovered Points of Interest: ${discoveredPoiCount}`}
      >
        <small>Discovered</small>
        <b>{discoveredPoiCount}</b>
      </article>
      <article
        className="stitch-info"
        data-testid="map-discovered-chunk-count"
        title={`Chunks Explored: ${discoveredChunkCount}`}
        aria-label={`Chunks Explored: ${discoveredChunkCount}`}
      >
        <small>Chunks Explored</small>
        <b>{discoveredChunkCount}</b>
      </article>
      <article
        className="stitch-info"
        title={`Biome: ${biomeDisplay}`}
        aria-label={`Biome: ${biomeDisplay}`}
      >
        <small>Biome</small>
        <b>{biomeDisplay}</b>
      </article>
      {aurionTransition && (
        <article
          className="stitch-info"
          data-testid="aurion-transition-status"
          title={`Aurion: ${aurionTransition.status} in ${aurionTransition.zoneId}`}
          aria-label={`Aurion transition: ${aurionTransition.status} in ${aurionTransition.zoneId}`}
        >
          <small>Aurion</small>
          <b>{`${aurionTransition.zoneId} · ${aurionTransition.status}`}</b>
          <span style={{ fontSize: "9px", opacity: 0.7 }}>{aurionTransition.persistence}</span>
          {canRequestAurionTransition && (
            <button
              type="button"
              data-testid="aurion-transition-request"
              onClick={() => { void requestAurionTransition(); }}
              disabled={isPendingAurionRequest}
              aria-busy={isPendingAurionRequest}
              aria-label={isPendingAurionRequest ? "Entering Expanse..." : "Request entry into Aurion Expanse"}
              title={isPendingAurionRequest ? "Entering Expanse..." : "Request entry into Aurion Expanse"}
            >
              {isPendingAurionRequest ? "Betrete Expanse..." : "Expanse betreten"}
            </button>
          )}
          {aurionRequestError && (
            <span role="alert" aria-live="assertive" style={{ fontSize: "9px", color: "var(--st-fire, #ff4d4d)" }}>
              {aurionRequestError}
            </span>
          )}
        </article>
      )}
      {process.env.NODE_ENV !== "production" && (
        <article
          className="stitch-info"
          title={`World Seed: ${worldSeed}`}
          aria-label={`World Seed: ${worldSeed}`}
        >
          <small>WorldSeed</small>
          <b style={{ fontSize: "9px", opacity: 0.7 }}>
            {worldSeed.slice(0, 16)}...
          </b>
        </article>
      )}
    </div>
  );
}