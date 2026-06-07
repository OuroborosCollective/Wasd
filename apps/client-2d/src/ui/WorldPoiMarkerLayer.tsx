/**
 * World POI Marker Layer
 *
 * Renders interactive world POI markers on top of the 2D world canvas.
 * POIs include gathering camps (logging, mining, fishing) and village stations.
 *
 * Rules:
 * - No Math.random() for marker positioning
 * - No Date.now() for state
 * - Server-authoritative: client only displays POIs from snapshot
 * - Markers positioned using server-provided world coordinates
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot";

const POI_EMOJI: Record<string, string> = {
  logging_camp: "🪓",
  mining_camp: "⛏️",
  fishing_camp: "🎣",
  campfire: "🔥",
  furnace: "🧱",
  workbench: "🛠️",
  village_trader: "🏪",
};

const POI_COLORS: Record<string, string> = {
  logging_camp: "var(--st-emerald, #39ff14)",
  mining_camp: "var(--st-gold, #f5c842)",
  fishing_camp: "var(--st-aether, #00e5ff)",
  campfire: "var(--st-orange, #ff6b35)",
  furnace: "var(--st-red, #ff3355)",
  workbench: "var(--st-blue, #4dabf7)",
  village_trader: "var(--st-purple, #9c27b0)",
};

interface PoiMarkerProps {
  poiId: string;
  type: string;
  title: string;
  x: number;
  y: number;
}

function PoiMarker({ poiId, type, title, x, y }: PoiMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("wasd:toast", {
        detail: {
          type: "info",
          message: `${title} — ${getPoiDescription(type)}`,
        },
      }),
    );
  }, [title, type]);

  const emoji = POI_EMOJI[type] ?? "📍";
  const color = POI_COLORS[type] ?? "#fff";

  return (
    <button
      ref={markerRef}
      type="button"
      data-testid="world-poi-marker"
      data-poi-type={type}
      className="world-poi-marker"
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
        background: "rgba(4, 8, 14, 0.85)",
        border: `2px solid ${color}`,
        borderRadius: "16px",
        padding: "6px 10px",
        cursor: "pointer",
        color: "#fff",
        fontSize: "12px",
        fontFamily: "ui-monospace, monospace",
        whiteSpace: "nowrap",
        backdropFilter: "blur(8px)",
        boxShadow: `0 0 16px ${color}55`,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        minWidth: "56px",
        opacity: hovered ? 1.2 : 1,
        transition: "opacity 0.15s ease",
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${title} — Tap for details`}
      aria-label={`${title} world POI, ${type}`}
    >
      <span style={{ fontSize: "20px", lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: "9px", opacity: 0.8, maxWidth: "60px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
        {title}
      </span>
    </button>
  );
}

function getPoiDescription(type: string): string {
  switch (type) {
    case "logging_camp":
      return "Trees nearby";
    case "mining_camp":
      return "Ore veins nearby";
    case "fishing_camp":
      return "Fish spots nearby";
    case "campfire":
      return "Cooking station";
    case "furnace":
      return "Smelting station";
    case "workbench":
      return "Crafting station";
    case "village_trader":
      return "Resource vendor";
    default:
      return "World POI";
  }
}

export function WorldPoiMarkerLayer() {
  const snapshot = useLiveGameplaySnapshot();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track container size for coordinate mapping
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const worldPois = snapshot.worldPois ?? [];

  // Map world coordinates to screen coordinates
  // The world uses isometric projection, we approximate screen position
  // based on the container size and a fixed world-to-screen scale
  function worldToScreen(worldX: number, worldY: number): { screenX: number; screenY: number } {
    const { width, height } = containerSize;
    if (width === 0 || height === 0) return { screenX: worldX, screenY: worldY };

    // Approximate isometric projection
    // World origin at (460, 500) maps near the center of the screen
    const worldOriginX = 460;
    const worldOriginY = 500;
    const scale = 1.2; // Adjust based on your world scale

    // Isometric transform: screenX = (worldX - worldY) * scale + centerX
    //                     screenY = (worldX + worldY) * scale * 0.5 + centerY
    const isoX = (worldX - worldY) * scale * 0.5;
    const isoY = (worldX + worldY) * scale * 0.25;

    const screenX = width / 2 + isoX - (worldOriginX - worldOriginY) * scale * 0.5;
    const screenY = height / 2 + isoY - (worldOriginX + worldOriginY) * scale * 0.25;

    return { screenX, screenY };
  }

  if (worldPois.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid="world-poi-marker-layer"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      {worldPois.map((poi) => {
        const { screenX, screenY } = worldToScreen(poi.x, poi.y);
        return (
          <div key={poi.poiId} style={{ pointerEvents: "auto" }}>
            <PoiMarker
              poiId={poi.poiId}
              type={poi.type}
              title={poi.title}
              x={screenX}
              y={screenY}
            />
          </div>
        );
      })}
    </div>
  );
}