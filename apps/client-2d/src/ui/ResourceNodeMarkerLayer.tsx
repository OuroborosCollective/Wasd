import React, { useCallback, useEffect, useRef, useState } from "react";
import { useWorldOverlayModel } from "../game/useWorldOverlayModel";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot";
import { markOverlayReachable } from "../game/OverlayReachabilityGuard";
import { projectWorldToScreen, type ViewportInput } from "../game/WorldOverlayProjection";
import { dispatchGather, type GameplayWorldPosition } from "../game/gameplayActions";
import { DEFAULT_GAMEPLAY_PLAYER_ID } from "../game/liveGameplayStore";
import { readPlayerPositionBridge } from "../game/PlayerPositionBridge";

markOverlayReachable("resource-node-marker-layer");

interface ResourceMarkerProps {
  nodeId: string;
  title: string;
  kind: "tree" | "ore" | "fish_spot";
  x: number;
  y: number;
  status: "available" | "depleted" | "locked";
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
    if (status === "depleted" || status === "locked" || gathering) return;
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
      className={`resource-node-marker ${status === "depleted" || status === "locked" ? "resource-node-marker--depleted" : ""}`}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -100%)",
        background: "rgba(4, 8, 14, 0.82)",
        border: `2px solid ${status === "depleted" || status === "locked" ? "rgba(255,255,255,0.2)" : color}`,
        borderRadius: "12px",
        padding: "4px 8px",
        cursor: status === "depleted" || status === "locked" || gathering ? "not-allowed" : "pointer",
        color: status === "depleted" || status === "locked" ? "rgba(255,255,255,0.4)" : "#fff",
        fontSize: "11px",
        fontFamily: "ui-monospace, monospace",
        whiteSpace: "nowrap",
        backdropFilter: "blur(8px)",
        boxShadow: status === "available" ? `0 0 12px ${color}44` : "none",
        opacity: status === "depleted" || status === "locked" ? 0.5 : 1,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
        minWidth: "52px",
      }}
      onClick={handleClick}
      disabled={status === "depleted" || status === "locked" || gathering}
      title={`${title} - ${status === "available" ? `Tap to gather` : `Locked/Respawning...`}`}
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
      {status === "locked" && (
        <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)" }}>locked</span>
      )}
    </button>
  );
}

interface Props {
  onGatherSuccess?: () => void;
  getPlayerPosition?: () => GameplayWorldPosition | null;
}

function humanReadableGatherError(reason?: string, requiredTool?: string): string {
  switch (reason) {
    case "missing_player_position":
      return "Move closer — waiting for position sync";
    case "invalid_player_position":
      return "Position sync missing";
    case "node_not_found":
      return "Resource node not found";
    case "too_far":
      return "Too far from resource";
    case "node_depleted":
      return "Resource depleted";
    case "level_too_low":
      return "Skill level too low";
    case "missing_tool":
      if (requiredTool === "mining_tool") return "Missing required tool: Pickaxe";
      if (requiredTool === "fishing_tool") return "Missing required tool: Fishing Rod";
      if (requiredTool === "woodcutting_tool") return "Missing required tool: Axe";
      return "Missing required tool";
    case "inventory_full":
      return "Inventory full";
    default:
      return reason ? `Gather failed: ${reason}` : "Gather failed";
  }
}

export function ResourceNodeMarkerLayer({ onGatherSuccess, getPlayerPosition }: Props) {
  const overlay = useWorldOverlayModel();
  const snapshot = useLiveGameplaySnapshot();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [lastError, setLastError] = useState<string | null>(null);

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

  const viewport: ViewportInput = {
    screenWidth: containerSize.width,
    screenHeight: containerSize.height,
  };

  const surfaceGroups = overlay.surfaceGroups;
  const surfacePoints = overlay.surfacePoints;

  const handleGather = useCallback(async (nodeId: string) => {
    const playerPosition = getPlayerPosition?.() ?? readPlayerPositionBridge();
    const result = await dispatchGather({
      playerId: DEFAULT_GAMEPLAY_PLAYER_ID,
      nodeId,
      currentTick: snapshot.serverTick ?? 0,
      playerPosition: playerPosition ?? undefined,
    });

    if (!result.ok) {
      const msg = humanReadableGatherError(result.error, result.requiredTool);
      setLastError(msg);
      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: { type: "error", message: msg },
        }),
      );
    } else {
      setLastError(null);
      onGatherSuccess?.();
    }
  }, [getPlayerPosition, snapshot.serverTick, onGatherSuccess]);

  const resourceNodes = overlay.resourceNodes;
  const hasOverlayContent =
    resourceNodes.length > 0 ||
    surfaceGroups.length > 0 ||
    surfacePoints.length > 0 ||
    Boolean(lastError);

  return (
    <div
      ref={containerRef}
      data-testid="resource-node-marker-layer"
      data-overlay-status={overlay.status}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}
    >
      {hasOverlayContent && surfaceGroups.map((group, index) => {
        const id = group.id;
        const title = group.title || id;
        return (
          <div
            key={`surface-group:${id}`}
            data-testid="world-surface-house-marker"
            style={{
              position: "absolute",
              left: 18,
              top: 18 + index * 24,
              color: "#f5c842",
              background: "rgba(4, 8, 14, 0.72)",
              border: "1px solid rgba(245, 200, 66, 0.35)",
              borderRadius: 8,
              padding: "3px 8px",
              font: "11px/1.2 ui-monospace, monospace",
              whiteSpace: "nowrap",
            }}
            title={`Lineage house ${id}`}
          >
            🏠 {title}
          </div>
        );
      })}

      {hasOverlayContent && surfacePoints.map((point) => {
        const { screenX, screenY } = projectWorldToScreen({ x: point.x, y: point.y }, viewport);
        return (
          <div
            key={`surface-point:${point.id}`}
            data-testid="world-surface-node-marker"
            style={{
              position: "absolute",
              left: `${screenX}px`,
              top: `${screenY}px`,
              transform: "translate(-50%, -100%)",
              color: "#f5f7ff",
              background: "rgba(4, 8, 14, 0.78)",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              borderRadius: 10,
              padding: "4px 7px",
              font: "10px/1.2 ui-monospace, monospace",
              boxShadow: "0 0 12px rgba(0, 229, 255, 0.18)",
              whiteSpace: "nowrap",
            }}
            title={`Lineage node ${point.id}`}
          >
            ✦ NPC
          </div>
        );
      })}

      {hasOverlayContent && resourceNodes.map((node) => {
        const { screenX, screenY } = projectWorldToScreen({ x: node.x, y: node.y }, viewport);
        return (
          <div key={node.id} style={{ pointerEvents: "auto" }}>
            <ResourceMarker
              nodeId={node.id}
              title={node.title}
              kind={node.kind}
              x={screenX}
              y={screenY}
              status={node.status}
              onGather={handleGather}
            />
          </div>
        );
      })}
      {lastError && (
        <div
          data-testid="resource-gather-feedback"
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,65,108,.24)",
            border: "1px solid rgba(255,65,108,.4)",
            borderRadius: 10,
            padding: "8px 16px",
            color: "#f5f7ff",
            font: "12px/1.4 system-ui, sans-serif",
            backdropFilter: "blur(10px)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            maxWidth: "80vw",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {lastError}
        </div>
      )}
    </div>
  );
}
