/**
 * Camp Trade Panel - ARELORIAN Diamond Glass Edition
 *
 * Displays camp stock for purchasing from camp workers.
 * Uses Stitch-generated "Diamond Glass" design system.
 *
 * Design features:
 * - Frosted glass panels with blur backdrop
 * - Crystalline clip-path corners (diamond-cut)
 * - Neon accent colors per NPC type
 * - Hexagonal action buttons
 * - Pulsing status indicators
 *
 * Rules:
 * - No Math.random() for display
 * - No Date.now() for state
 * - Shows server-provided values only
 * - After buy, refetches snapshot to update inventory, wallet, and camp stock
 */

import React, { useState, useCallback, useEffect } from "react";
import type { CampStockSnapshot, CampNpcSnapshot } from "../../game/liveGameplaySnapshot";
import { dispatchBuyCampStock } from "../../game/gameplayActions";
import { useLiveGameplaySnapshot } from "../../game/useLiveGameplaySnapshot";

interface CampTradePanelProps {
  npc: CampNpcSnapshot;
  campStock: CampStockSnapshot | undefined;
  onClose?: () => void;
}

/** Map NPC type to the item they sell */
const NPC_SELL_ITEM: Record<string, string> = {
  camp_woodcutter: "wood_log",
  camp_miner: "copper_ore",
  camp_fisher: "raw_fish",
};

/** Display names for items */
const ITEM_NAMES: Record<string, string> = {
  wood_log: "Wood Log",
  copper_ore: "Copper Ore",
  raw_fish: "Raw Fish",
};

/** Material icon names for items */
const ITEM_ICONS: Record<string, string> = {
  wood_log: "forest",
  copper_ore: "diamond",
  raw_fish: "set_meal",
};

/** NPC display names */
const NPC_NAMES: Record<string, string> = {
  camp_woodcutter: "Arel Woodcutter",
  camp_miner: "Arel Miner",
  camp_fisher: "Arel Fisher",
};

/** Activity messages per NPC type */
const NPC_ACTIVITY: Record<string, string> = {
  camp_woodcutter: "CHOPPING WOOD",
  camp_miner: "EXTRACTING ORE",
  camp_fisher: "FISHING",
};

/** Accent colors per NPC type */
const NPC_COLORS: Record<string, { primary: string; glow: string }> = {
  camp_woodcutter: { primary: "#2ae500", glow: "rgba(42, 229, 0, 0.5)" },
  camp_miner: { primary: "#f5c842", glow: "rgba(245, 200, 66, 0.5)" },
  camp_fisher: { primary: "#00E5FF", glow: "rgba(0, 229, 255, 0.5)" },
};

/** ARELORIAN Diamond Glass Design Tokens */
const COLORS = {
  background: "#101419",
  surface: "#101419",
  surfaceContainer: "#1c2025",
  surfaceContainerHigh: "#272a30",
  surfaceContainerHighest: "#31353b",
  surfaceDim: "#101419",
  onSurface: "#e0e2ea",
  onSurfaceVariant: "#c4c6cf",
  manaCyan: "#00E5FF",
  energyAmber: "#FF7A00",
  tertiary: "#2ae500",
  outline: "#8e9198",
};

/** CSS for diamond-cut corners */
const diamondGlassStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(0, 229, 255, 0.15)",
  clipPath: "polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0% calc(100% - 10px), 0% 10px)",
  position: "relative" as const,
};

export function CampTradePanel({ npc, campStock, onClose }: CampTradePanelProps) {
  const snapshot = useLiveGameplaySnapshot();
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const sellItemId = NPC_SELL_ITEM[npc.type] ?? "";
  const stockItem = campStock?.items.find((i) => i.itemId === sellItemId);
  const hasStock = stockItem && stockItem.quantity > 0 && stockItem.buyPrice != null;
  const buyPrice = stockItem?.buyPrice ?? 0;
  const stockQty = stockItem?.quantity ?? 0;
  const walletCoin = snapshot.wallet?.coin ?? 0;
  const canAfford = walletCoin >= buyPrice;
  const accent = NPC_COLORS[npc.type] ?? { primary: COLORS.manaCyan, glow: "rgba(0, 229, 255, 0.5)" };
  const itemName = ITEM_NAMES[sellItemId] ?? sellItemId;
  const itemIcon = ITEM_ICONS[sellItemId] ?? "inventory_2";

  const handleBuy = useCallback(async () => {
    if (!hasStock || buying || !canAfford) return;

    setBuying(true);
    setError(null);

    try {
      const result = await dispatchBuyCampStock({
        npcId: npc.id,
        itemId: sellItemId,
        quantity: 1,
      });

      if (result.ok) {
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "success",
              message: `Bought 1 ${itemName}`,
            },
          }),
        );
        if (onClose) onClose();
      } else {
        const errorMsg = result.error === "insufficient_coins"
          ? "Not enough coins"
          : result.error === "camp_too_far"
          ? "Move closer to the camp worker"
          : result.error === "insufficient_camp_stock"
          ? "Camp stock empty"
          : "Purchase failed";

        setError(errorMsg);
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
  }, [npc.id, sellItemId, hasStock, buying, canAfford, itemName, onClose]);

  return (
    <div
      data-testid="camp-trade-panel"
      style={{
        position: "absolute",
        bottom: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "320px",
        maxWidth: "90vw",
        zIndex: 100,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Panel Container - Diamond Glass */}
      <div
        style={{
          ...diamondGlassStyle,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Store icon */}
            <span
              style={{
                fontSize: "24px",
                color: COLORS.manaCyan,
                textShadow: `0 0 8px ${COLORS.manaCyan}`,
              }}
            >
              🏕️
            </span>
            <span
              style={{
                fontFamily: "'Epilogue', sans-serif",
                fontSize: "18px",
                fontWeight: 600,
                color: accent.primary,
                textShadow: `0 0 8px ${accent.glow}`,
                letterSpacing: "0.05em",
              }}
            >
              CAMP EXCHANGE
            </span>
          </div>
          {onClose && (
            <button
              data-testid="camp-trade-close"
              onClick={onClose}
              className="wow-close-btn"
              style={{
                background: "transparent",
                border: "none",
                color: COLORS.onSurfaceVariant,
                cursor: "pointer",
                fontSize: "14px",
                padding: "4px 8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
              aria-label="Close [ESC]"
              aria-keyshortcuts="Escape"
            >
              <kbd className="cz-kbd" aria-hidden="true" style={{ fontSize: "10px", pointerEvents: "none" }}>ESC</kbd>
              ✕
            </button>
          )}
        </div>

        {/* Worker Profile Card */}
        <div
          style={{
            ...diamondGlassStyle,
            padding: "12px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* Worker Avatar Placeholder */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "8px",
              background: COLORS.surfaceContainerHighest,
              border: `2px solid ${accent.primary}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            {npc.type === "camp_woodcutter" ? "🪓" : npc.type === "camp_miner" ? "⛏️" : "🎣"}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Epilogue', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: COLORS.onSurface,
                marginBottom: "4px",
              }}
            >
              {NPC_NAMES[npc.type]}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: accent.primary,
                  boxShadow: `0 0 0 0 ${accent.glow}`,
                  animation: "pulse 2s infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  color: accent.primary,
                  letterSpacing: "0.15em",
                }}
              >
                {NPC_ACTIVITY[npc.type] ?? "WORKING"}
              </span>
            </div>
          </div>
        </div>

        {/* Item Card */}
        <div
          data-testid="camp-stock-item"
          style={{
            ...diamondGlassStyle,
            padding: "12px",
            cursor: hasStock && canAfford ? "pointer" : "default",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Item Icon */}
            <div
              style={{
                width: "48px",
                height: "48px",
                ...diamondGlassStyle,
                background: `${COLORS.surfaceContainerHighest}80`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              📦
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: COLORS.onSurface,
                }}
              >
                {itemName}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: COLORS.onSurfaceVariant,
                }}
              >
                Stock:{" "}
                <span style={{ color: COLORS.manaCyan }}>{stockQty}</span>
                {" "}Units
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: COLORS.energyAmber,
                  fontWeight: 700,
                  fontSize: "16px",
                  filter: `drop-shadow(0 0 8px ${COLORS.energyAmber})`,
                }}
              >
                <span>{buyPrice}</span>
                <span style={{ fontSize: "14px" }}>💰</span>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  color: COLORS.outline,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Per Unit
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: "rgba(255, 180, 171, 0.15)",
              border: "1px solid #ffb4ab",
              borderRadius: "4px",
              padding: "8px 12px",
              color: "#ffb4ab",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Footer Balance */}
        <div
          style={{
            ...diamondGlassStyle,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                color: COLORS.outline,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              Balance
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: walletCoin >= buyPrice ? COLORS.energyAmber : "#ffb4ab",
                fontFamily: "'Epilogue', sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                filter: walletCoin >= buyPrice ? `drop-shadow(0 0 8px ${COLORS.energyAmber})` : "none",
              }}
            >
              <span>{walletCoin.toLocaleString()}</span>
              <span style={{ fontSize: "14px" }}>💰</span>
            </div>
          </div>

          {/* Buy Button - Hexagonal */}
          <button
            data-testid="camp-trade-buy-button"
            onClick={handleBuy}
            disabled={!hasStock || !canAfford || buying}
            aria-label={buying ? "Processing purchase" : `Buy 1 ${itemName} for ${buyPrice} coins`}
            aria-busy={buying}
            title={
              buying
                ? "Processing purchase..."
                : !hasStock
                ? "Camp stock empty"
                : !canAfford
                ? "Not enough coins (insufficient balance)"
                : `Buy 1 ${itemName} for ${buyPrice} coins`
            }
            style={{
              padding: "12px 24px",
              background: hasStock && canAfford ? COLORS.energyAmber : COLORS.surfaceContainerHighest,
              color: hasStock && canAfford ? "#2f1500" : COLORS.outline,
              border: `2px solid ${hasStock && canAfford ? accent.primary : "transparent"}33`,
              fontFamily: "'Epilogue', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              clipPath: "polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)",
              cursor: hasStock && canAfford && !buying ? "pointer" : "not-allowed",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: hasStock && canAfford ? `0 0 20px ${COLORS.energyAmber}66` : "none",
              opacity: buying ? 0.7 : 1,
            }}
          >
            {buying ? "..." : "BUY"}
          </button>
        </div>

        {/* Status Text */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "9px",
            color: COLORS.outline,
            textAlign: "center",
            letterSpacing: "0.1em",
          }}
        >
          Stay near camp to trade
        </div>
      </div>

      {/* Pulse Animation Keyframes */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 ${accent.glow}; }
          70% { transform: scale(1); box-shadow: 0 0 0 6px transparent; }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>
    </div>
  );
}

export default CampTradePanel;