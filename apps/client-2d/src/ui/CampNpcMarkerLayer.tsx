/**
 * Camp NPC Marker Layer
 *
 * Renders camp NPC markers on top of the 2D world canvas.
 * NPCs appear at discovered gathering camp POIs.
 *
 * Rules:
 * - No Math.random() for marker positioning
 * - No Date.now() for state
 * - Server-authoritative: client only displays NPCs from snapshot
 */

import React, { useCallback, useRef, useState } from "react";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot";
import type { CampNpcSnapshot } from "../game/liveGameplaySnapshot";

const NPC_EMOJI: Record<string, string> = {
  camp_woodcutter: "🪓",
  camp_miner: "⛏️",
  camp_fisher: "🎣",
};

const NPC_COLORS: Record<string, string> = {
  camp_woodcutter: "var(--st-emerald, #39ff14)",
  camp_miner: "var(--st-gold, #f5c842)",
  camp_fisher: "var(--st-aether, #00e5ff)",
};

interface CampNpcMarkerProps {
  npc: CampNpcSnapshot;
  x: number;
  y: number;
}

function CampNpcMarker({ npc, x, y }: CampNpcMarkerProps) {
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("wasd:toast", {
        detail: {
          type: "info",
          message: `${npc.name} - ${npc.activityMessage}`,
        },
      }),
    );
  }, [npc]);

  const emoji = NPC_EMOJI[npc.type] ?? "👤";
  const color = NPC_COLORS[npc.type] ?? "#fff";

  return (
    <button
      type="button"
      data-testid="camp-npc-marker"
      data-npc-type={npc.type}
      data-activity={npc.activity}
      className="camp-npc-marker"
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
        background: "rgba(4, 8, 14, 0.9)",
        border: `2px solid ${color}`,
        borderRadius: "12px",
        padding: "4px 8px",
        cursor: "pointer",
        color: "#fff",
        fontSize: "10px",
        fontFamily: "ui-monospace, monospace",
        whiteSpace: "nowrap",
        backdropFilter: "blur(8px)",
        boxShadow: `0 0 12px ${color}44`,
        zIndex: 45,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        minWidth: "40px",
        opacity: hovered ? 1.2 : 1,
        transition: "opacity 0.15s ease",
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${npc.name} - ${npc.role}`}
      aria-label={`${npc.name} camp worker, ${npc.activity}`}
    >
      <span style={{ fontSize: "16px", lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: "8px", opacity: 0.8, maxWidth: "50px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
        {npc.activity}
      </span>
    </button>
  );
}

export function CampNpcMarkerLayer() {
  const snapshot = useLiveGameplaySnapshot();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track container size for coordinate mapping
  React.useEffect(() => {
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

  const campNpcs = snapshot.campNpcs ?? [];

  // Map world coordinates to screen coordinates
  // Uses same projection as WorldPoiMarkerLayer
  function worldToScreen(worldX: number, worldY: number): { screenX: number; screenY: number } {
    const { width, height } = containerSize;
    if (width === 0 || height === 0) return { screenX: worldX, screenY: worldY };

    // Approximate isometric projection
    const worldOriginX = 460;
    const worldOriginY = 500;
    const scale = 1.2;

    const isoX = (worldX - worldY) * scale * 0.5;
    const isoY = (worldX + worldY) * scale * 0.25;

    const screenX = width / 2 + isoX - (worldOriginX - worldOriginY) * scale * 0.5;
    const screenY = height / 2 + isoY - (worldOriginX + worldOriginY) * scale * 0.25;

    return { screenX, screenY };
  }

  if (campNpcs.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid="camp-npc-marker-layer"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 45,
      }}
    >
      {campNpcs.map((npc) => {
        const { screenX, screenY } = worldToScreen(npc.position.x, npc.position.y);
        return (
          <div key={npc.id} style={{ pointerEvents: "auto" }}>
            <CampNpcMarker
              npc={npc}
              x={screenX}
              y={screenY}
            />
          </div>
        );
      })}
    </div>
  );
}