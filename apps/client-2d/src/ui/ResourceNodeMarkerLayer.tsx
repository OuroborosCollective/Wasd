/**
 * Resource Node Marker Layer
 *
 * Renders interactive resource node markers on top of the 2D world canvas.
 * Each marker is clickable/tappable and triggers a server-authoritative gather action.
 *
 * Rules:
 * - No Math.random() for marker positioning
 * - No Date.now() for state
 * - Server-authoritative: client only sends gather request, server decides outcome
 * - Markers positioned using server-provided world coordinates
 * - After successful gather, refetches snapshot to update UI
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot";
import { dispatchGather, type GameplayWorldPosition } from "../game/gameplayActions";
import { DEFAULT_GAMEPLAY_PLAYER_ID } from "../game/liveGameplayStore";
import { readPlayerPositionBridge } from "../game/PlayerPositionBridge";

interface ResourceMarkerProps {
  nodeId: string;
  title: string;
  kind: "tree" | "ore" | "fish_spot";
  x: number;
  y: number;
  status: "available" | "depleted";
  onGather: (nodeId: string) => Promise<void>;
}

const KIND_ICONS: Record<string, string> = {
  tree: "🌲",
  ore: "⛏️",
  fish_spot: "🎣",
};

const KIND_COLORS: Record<string, string> = {
  tree: "var(--st-emerald, #39ff14)",
  ore: "var(--st-gold, #f5c842)",
  fish_spot: "var(--st-aether, #00e5ff)",
};

function ResourceMarker({ nodeId, title, kind, x, y, status, onGather }: ResourceMarkerProps) {
  const [gathering, setGathering] = useState(false);
  const markerRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(async () => {
    if (status === "depleted" || gathering) return;
    setGathering(true);
    try {
      await onGather(nodeId);
    } finally {
      setGathering(false);
    }
  }, [nodeId, status, gathering, onGather]);

  const icon = KIND_ICONS[kind] ?? "?";
  const color = KIND_COLORS[kind] ?? "#fff";

  return (
    <button
      ref={markerRef}
      type="button"
      data-testid="resource-node-marker"
      className={`resource-node-marker ${status === "depleted" ? "resource-node-marker--depleted" : ""}`}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -100%)",
        background: "rgba(4, 8, 14, 0.82)",
        border: `2px solid ${status === "depleted" ? "rgba(255,255,255,0.2)" : color}`,
        borderRadius: "12px",
        padding: "4px 8px",
        cursor: status === "depleted" || gathering ? "not-allowed" : "pointer",
        color: status === "depleted" ? "rgba(255,255,255,0.4)" : "#fff",
        fontSize: "11px",
        fontFamily: "ui-monospace, monospace",
        whiteSpace: "nowrap",
        backdropFilter: "blur(8px)",
        boxShadow: status === "available" ? `0 0 12px ${color}44` : "none",
        opacity: status === "depleted" ? 0.5 : 1,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        minWidth: "52px",
      }}
      onClick={handleClick}
      disabled={status === "depleted" || gathering}
      title={`${title} - ${status === "available" ? `Tap to gather` : `Respawning...`}`}
      aria-label={`${title} resource node, ${status}`}
    >
      <span style={{ fontSize: "18px", lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: "9px", opacity: 0.7 }}>{title}</span>
      {gathering && (
        <span style={{ fontSize: "8px", color: "var(--st-aether, #00e5ff)" }}>gathering...</span>
      )}
      {status === "depleted" && (
        <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)" }}>depleted</span>
      )}
    </button>
  );
}

interface Props {
  /** Called when gather succeeds, to trigger snapshot refetch */
  onGatherSuccess?: () => void;
  /** Optional bridge to the authoritative/self player world position. */
  getPlayerPosition?: () => GameplayWorldPosition | null;
}

export function ResourceNodeMarkerLayer({ onGatherSuccess, getPlayerPosition }: Props) {
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

  const resources = snapshot.resources ?? [];

  const handleGather = useCallback(async (nodeId: string) => {
    const playerPosition = getPlayerPosition?.() ?? readPlayerPositionBridge();
    const result = await dispatchGather({
      playerId: DEFAULT_GAMEPLAY_PLAYER_ID,
      nodeId,
      currentTick: snapshot.serverTick ?? 0,
      playerPosition: playerPosition ?? undefined,
    });

    if (!result.ok) {
      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: "error",
            message: `Gather failed: ${result.error ?? "unknown"}`,
          },
        }),
      );
    } else {
      onGatherSuccess?.();
    }
  }, [getPlayerPosition, snapshot.serverTick, onGatherSuccess]);

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

  if (resources.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid="resource-node-marker-layer"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {resources.map((node) => {
        const { screenX, screenY } = worldToScreen(node.position.x, node.position.y);
        return (
          <div key={node.id} style={{ pointerEvents: "auto" }}>
            <ResourceMarker
              nodeId={node.id}
              title={node.title}
              kind={node.kind as "tree" | "ore" | "fish_spot"}
              x={screenX}
              y={screenY}
              status={node.status as "available" | "depleted"}
              onGather={handleGather}
            />
          </div>
        );
      })}
    </div>
  );
}
