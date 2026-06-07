/**
 * Camp NPC Marker Layer
 *
 * Renders camp NPC markers on top of the 2D world canvas.
 * NPCs appear at discovered gathering camp POIs.
 * Shows buy options when camp stock is available.
 *
 * Rules:
 * - No Math.random() for marker positioning
 * - No Date.now() for state
 * - Server-authoritative: client only displays NPCs from snapshot
 */

import React, { useCallback, useRef, useState } from "react";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot";
import type { CampNpcSnapshot, CampStockSnapshot } from "../game/liveGameplaySnapshot";
import { dispatchBuyCampStock } from "../game/gameplayActions";

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

/** Map camp NPC type to the item they sell */
const NPC_SELL_ITEM: Record<string, string> = {
  camp_woodcutter: "wood_log",
  camp_miner: "copper_ore",
  camp_fisher: "raw_fish",
};

/** Display name for items */
const ITEM_NAMES: Record<string, string> = {
  wood_log: "Log",
  copper_ore: "Ore",
  raw_fish: "Fish",
};

interface CampNpcMarkerProps {
  npc: CampNpcSnapshot;
  campStock: CampStockSnapshot | undefined;
  x: number;
  y: number;
}

function CampNpcMarker({ npc, campStock, x, y }: CampNpcMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [buying, setBuying] = useState(false);

  const handleClick = useCallback(() => {
    // Show current activity message
    window.dispatchEvent(
      new CustomEvent("wasd:toast", {
        detail: {
          type: "info",
          message: `${npc.name} - ${npc.activityMessage}`,
        },
      }),
    );
  }, [npc]);

  const handleBuy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!campStock || buying) return;

    const sellItemId = NPC_SELL_ITEM[npc.type];
    const stockItem = campStock.items.find((i) => i.itemId === sellItemId);

    if (!stockItem || stockItem.quantity <= 0) {
      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: "warning",
            message: "Camp stock empty",
          },
        }),
      );
      return;
    }

    setBuying(true);
    try {
      const result = await dispatchBuyCampStock({
        npcId: npc.id,
        itemId: sellItemId,
        quantity: 1,
      });

      if (result.ok) {
        const itemName = ITEM_NAMES[sellItemId] ?? sellItemId;
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "success",
              message: `Bought 1 ${itemName}`,
            },
          }),
        );
      } else {
        // Show error toast based on error type
        const errorMsg = result.error === "insufficient_coins"
          ? "Not enough coins"
          : result.error === "camp_too_far"
          ? "Move closer to the camp worker"
          : result.error === "insufficient_camp_stock"
          ? "Camp stock empty"
          : "Purchase failed";

        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "error",
              message: errorMsg,
            },
          }),
        );
      }
    } finally {
      setBuying(false);
    }
  }, [npc, campStock, buying]);

  const emoji = NPC_EMOJI[npc.type] ?? "👤";
  const color = NPC_COLORS[npc.type] ?? "#fff";

  // Check if there's stock available to buy
  const sellItemId = NPC_SELL_ITEM[npc.type];
  const stockItem = campStock?.items.find((i) => i.itemId === sellItemId);
  const hasStock = stockItem && stockItem.quantity > 0 && stockItem.buyPrice != null;
  const buyPrice = stockItem?.buyPrice ?? 0;

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
      {hasStock && (
        <span
          data-testid="camp-trade-buy-button"
          onClick={handleBuy}
          style={{
            fontSize: "8px",
            background: color,
            color: "#000",
            padding: "2px 4px",
            borderRadius: "4px",
            cursor: buying ? "wait" : "pointer",
            marginTop: "2px",
          }}
          title={`Buy 1 ${ITEM_NAMES[sellItemId]} (${buyPrice}c)`}
        >
          {buying ? "..." : `BUY (${buyPrice}c)`}
        </span>
      )}
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
  const campStocks = snapshot.campStocks ?? [];

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
        const campStock = campStocks.find((s) => s.poiId === npc.poiId);
        return (
          <div key={npc.id} style={{ pointerEvents: "auto" }}>
            <CampNpcMarker
              npc={npc}
              campStock={campStock}
              x={screenX}
              y={screenY}
            />
          </div>
        );
      })}
    </div>
  );
}