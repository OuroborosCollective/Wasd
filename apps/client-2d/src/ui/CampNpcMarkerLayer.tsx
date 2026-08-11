/**
 * Camp NPC Marker Layer
 *
 * Renders camp NPC markers on top of the 2D world canvas.
 * NPCs appear at discovered gathering camp POIs.
 * Shows trade panel when clicking on a camp NPC.
 *
 * Rules:
 * - No Math.random() for marker positioning
 * - No Date.now() for state
 * - Server-authoritative: client only displays NPCs from snapshot
 */

import React, { useCallback, useRef, useState } from "react";
import { useWorldOverlayModel } from "../game/useWorldOverlayModel";
import { markOverlayReachable } from "../game/OverlayReachabilityGuard";
import { projectWorldToScreen, type ViewportInput } from "../game/WorldOverlayProjection";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot";
import type { CampNpcSnapshot, CampStockSnapshot } from "../game/liveGameplaySnapshot";
import { CampTradePanel } from "./windows/CampTradePanel";

markOverlayReachable("camp-npc-marker-layer");

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
  campStock: CampStockSnapshot | undefined;
  x: number;
  y: number;
  onTradeClick: (npc: CampNpcSnapshot, campStock: CampStockSnapshot | undefined) => void;
}

function CampNpcMarker({ npc, campStock, x, y, onTradeClick }: CampNpcMarkerProps) {
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(() => {
    onTradeClick(npc, campStock);
  }, [npc, campStock, onTradeClick]);

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
      title={`${npc.name} - ${npc.role} (Click to trade)`}
      aria-label={`${npc.name} camp worker, ${npc.activity}`}
    >
      <span style={{ fontSize: "16px", lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: "8px", opacity: 0.8, maxWidth: "50px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>
        {npc.activity}
      </span>
      <span style={{
        fontSize: "7px",
        color: color,
        marginTop: "2px",
      }}>
        TRADE
      </span>
    </button>
  );
}

export function CampNpcMarkerLayer() {
  const overlay = useWorldOverlayModel();
  const snapshot = useLiveGameplaySnapshot();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeTradeNpc, setActiveTradeNpc] = useState<CampNpcSnapshot | null>(null);
  const [activeTradeStock, setActiveTradeStock] = useState<CampStockSnapshot | undefined>(undefined);

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
  const campStocks = snapshot.campStocks ?? [];
  const viewport: ViewportInput = {
    screenWidth: containerSize.width,
    screenHeight: containerSize.height,
  };

  const handleTradeClick = useCallback((npc: CampNpcSnapshot, campStock: CampStockSnapshot | undefined) => {
    setActiveTradeNpc(npc);
    setActiveTradeStock(campStock);
  }, []);

  const handleCloseTrade = useCallback(() => {
    setActiveTradeNpc(null);
    setActiveTradeStock(undefined);
  }, []);

  if (campNpcs.length === 0 && !activeTradeNpc) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        data-testid="camp-npc-marker-layer"
        data-overlay-status={overlay.status}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 45,
        }}
      >
        {campNpcs.map((npc) => {
          const { screenX, screenY } = projectWorldToScreen({ x: npc.position.x, y: npc.position.y }, viewport);
          const campStock = campStocks.find((s) => s.poiId === npc.poiId);
          return (
            <div key={npc.id} style={{ pointerEvents: "auto" }}>
              <CampNpcMarker
                npc={npc}
                campStock={campStock}
                x={screenX}
                y={screenY}
                onTradeClick={handleTradeClick}
              />
            </div>
          );
        })}
      </div>

      {/* Trade Panel */}
      {activeTradeNpc && (
        <CampTradePanel
          npc={activeTradeNpc}
          campStock={activeTradeStock}
          onClose={handleCloseTrade}
        />
      )}
    </>
  );
}