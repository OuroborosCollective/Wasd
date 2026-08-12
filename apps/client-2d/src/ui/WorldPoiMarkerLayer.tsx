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
import { useWorldOverlayModel } from "../game/useWorldOverlayModel";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot";
import { markOverlayReachable } from "../game/OverlayReachabilityGuard";
import { projectWorldToScreen, type ViewportInput } from "../game/WorldOverlayProjection";

markOverlayReachable("world-poi-marker-layer");

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
  discovered?: boolean;
}

function PoiMarker({ poiId, type, title, x, y, discovered = true }: PoiMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const markerRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (!discovered) {
      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: "info",
            message: "Unknown location — Explore to discover",
          },
        }),
      );
      return;
    }
    window.dispatchEvent(
      new CustomEvent("wasd:toast", {
        detail: {
          type: "info",
          message: `${title} — ${getPoiDescription(type)}`,
        },
      }),
    );
  }, [title, type, discovered]);

  // For undiscovered POIs, show generic marker
  const emoji = discovered ? (POI_EMOJI[type] ?? "📍") : "?";
  const color = discovered ? (POI_COLORS[type] ?? "#fff") : "#666";
  const displayTitle = discovered ? title : "Unknown Location";

  return (
    <button
      ref={markerRef}
      type="button"
      data-testid="world-poi-marker"
      data-poi-type={discovered ? type : "unknown"}
      data-discovered={discovered}
      className="world-poi-marker"
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
        background: discovered ? "rgba(4, 8, 14, 0.85)" : "rgba(40, 40, 40, 0.85)",
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
      title={discovered ? `${title} — Tap for details` : "Unknown location — Explore to discover"}
      aria-label={discovered ? `${title} world POI, ${type}` : "Unknown world POI"}
    >
      <span style={{ fontSize: "20px", lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: "9px", opacity: 0.8, maxWidth: "60px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
        {displayTitle}
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
  const overlay = useWorldOverlayModel();
  const snapshot = useLiveGameplaySnapshot();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const previousDiscoveriesRef = useRef<Set<string>>(new Set());

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

  // Handle discovery toasts — driven by the real snapshot, not the model
  useEffect(() => {
    const recentDiscoveries = snapshot.recentDiscoveries ?? [];
    if (recentDiscoveries.length === 0) return;

    for (const discovery of recentDiscoveries) {
      if (previousDiscoveriesRef.current.has(discovery.poiId)) continue;
      previousDiscoveriesRef.current.add(discovery.poiId);

      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: "success",
            message: `Discovered: ${discovery.title}`,
          },
        }),
      );
    }
  }, [snapshot.recentDiscoveries]);

  const viewport: ViewportInput = {
    screenWidth: containerSize.width,
    screenHeight: containerSize.height,
  };

  const worldPois = overlay.pois;

  if (overlay.status === "waiting" || overlay.status === "blocked") {
    return null;
  }

  if (worldPois.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid="world-poi-marker-layer"
      data-overlay-status={overlay.status}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      {worldPois.map((poi) => {
        const { screenX, screenY } = projectWorldToScreen({ x: poi.x, y: poi.y }, viewport);
        return (
          <div key={poi.poiId} style={{ pointerEvents: "auto" }}>
            <PoiMarker
              poiId={poi.poiId}
              type={poi.type}
              title={poi.title}
              x={screenX}
              y={screenY}
              discovered={poi.discovered}
            />
          </div>
        );
      })}
    </div>
  );
}