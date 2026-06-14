import React, { useEffect, useRef, useState } from "react";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function surfaceKind(value: unknown): string {
  return text(isRecord(value) ? value.kind : "");
}

function worldToScreen(worldX: number, worldY: number, width: number, height: number): { screenX: number; screenY: number } {
  if (width === 0 || height === 0) return { screenX: worldX, screenY: worldY };
  const scale = 1.2;
  const isoX = (worldX - worldY) * scale * 0.5;
  const isoY = (worldX + worldY) * scale * 0.25;
  return { screenX: width / 2 + isoX, screenY: height / 2 + isoY };
}

export function WorldSurfaceMarkerLayer() {
  const snapshot = useLiveGameplaySnapshot();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const surface = snapshot.worldSurface;
  const groups = Array.isArray(surface?.groups) ? surface.groups.filter(isRecord) : [];
  const points = Array.isArray(surface?.points) ? surface.points.filter(isRecord) : [];

  if (groups.length === 0 && points.length === 0) return null;

  return (
    <div
      ref={containerRef}
      data-testid="world-surface-marker-layer"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 45 }}
    >
      {groups.map((group) => {
        const id = text(group.id);
        const label = text(group.title) || id;
        if (!id) return null;
        return (
          <div
            key={`group:${id}`}
            data-testid="world-surface-house-marker"
            style={{
              position: "absolute",
              left: 18,
              top: 18 + groups.indexOf(group) * 24,
              color: "#f5c842",
              background: "rgba(4, 8, 14, 0.72)",
              border: "1px solid rgba(245, 200, 66, 0.35)",
              borderRadius: 8,
              padding: "3px 8px",
              font: "11px/1.2 ui-monospace, monospace",
              whiteSpace: "nowrap",
            }}
            title={`House ${id}`}
          >
            🏠 {label}
          </div>
        );
      })}
      {points.map((point) => {
        const id = text(point.id);
        const kind = surfaceKind(point);
        if (!id) return null;
        const x = numberValue(point.x);
        const y = numberValue(point.y);
        const pos = worldToScreen(x, y, containerSize.width, containerSize.height);
        return (
          <div
            key={`point:${id}`}
            data-testid="world-surface-node-marker"
            style={{
              position: "absolute",
              left: `${pos.screenX}px`,
              top: `${pos.screenY}px`,
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
            title={`${kind || "world_surface"}:${id}`}
          >
            ✦ NPC
          </div>
        );
      })}
    </div>
  );
}
