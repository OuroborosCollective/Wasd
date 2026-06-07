/**
 * Camp Trade Panel
 *
 * Displays camp stock for purchasing from camp workers.
 * Appears when player is near a camp NPC with available stock.
 *
 * Rules:
 * - No Math.random() for display
 * - No Date.now() for state
 * - Shows server-provided values only
 * - After buy, refetches snapshot to update inventory, wallet, and camp stock
 */

import React, { useState, useCallback } from "react";
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

/** Icons for items */
const ITEM_ICONS: Record<string, string> = {
  wood_log: "🪵",
  copper_ore: "ite",
  raw_fish: "ite",
};

/** NPC display names */
const NPC_NAMES: Record<string, string> = {
  camp_woodcutter: "Arel Woodcutter",
  camp_miner: "Arel Miner",
  camp_fisher: "Arel Fisher",
};

/** Background colors per NPC type */
const NPC_COLORS: Record<string, string> = {
  camp_woodcutter: "#39ff14",
  camp_miner: "#f5c842",
  camp_fisher: "#00e5ff",
};

export function CampTradePanel({ npc, campStock, onClose }: CampTradePanelProps) {
  const snapshot = useLiveGameplaySnapshot();
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sellItemId = NPC_SELL_ITEM[npc.type] ?? "";
  const stockItem = campStock?.items.find((i) => i.itemId === sellItemId);
  const hasStock = stockItem && stockItem.quantity > 0 && stockItem.buyPrice != null;
  const buyPrice = stockItem?.buyPrice ?? 0;
  const stockQty = stockItem?.quantity ?? 0;
  const walletCoin = snapshot.wallet?.coin ?? 0;
  const canAfford = walletCoin >= buyPrice;

  const handleBuy = useCallback(async () => {
    if (!hasStock || buying) return;

    setBuying(true);
    setError(null);

    try {
      const result = await dispatchBuyCampStock({
        npcId: npc.id,
        itemId: sellItemId,
        quantity: 1,
      });

      if (result.ok) {
        // Show success toast
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "success",
              message: `Bought 1 ${ITEM_NAMES[sellItemId] ?? sellItemId}`,
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
  }, [npc.id, sellItemId, hasStock, buying, onClose]);

  const accentColor = NPC_COLORS[npc.type] ?? "#fff";
  const itemName = ITEM_NAMES[sellItemId] ?? sellItemId;

  return (
    <div
      data-testid="camp-trade-panel"
      style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(16, 20, 25, 0.95)",
        backdropFilter: "blur(20px)",
        border: `2px solid ${accentColor}44`,
        borderRadius: "12px",
        padding: "16px",
        minWidth: "280px",
        maxWidth: "320px",
        zIndex: 100,
        boxShadow: `0 0 20px ${accentColor}33`,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
        borderBottom: `1px solid ${accentColor}33`,
        paddingBottom: "8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🏕️</span>
          <div>
            <div style={{
              color: accentColor,
              fontWeight: "bold",
              fontSize: "14px",
              fontFamily: "ui-monospace, monospace",
            }}>
              {NPC_NAMES[npc.type] ?? "Camp Worker"}
            </div>
            <div style={{
              color: "#8a9ba8",
              fontSize: "10px",
              fontFamily: "ui-monospace, monospace",
            }}>
              {npc.activityMessage}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            data-testid="camp-trade-close"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#8a9ba8",
              cursor: "pointer",
              fontSize: "18px",
              padding: "4px 8px",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Stock Display */}
      <div style={{
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px" }}>📦</span>
            <div>
              <div style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: "14px",
              }}>
                {itemName}
              </div>
              <div style={{
                color: "#8a9ba8",
                fontSize: "11px",
              }}>
                Camp Stock: {stockQty}
              </div>
            </div>
          </div>
          <div style={{
            textAlign: "right",
          }}>
            <div style={{
              color: "#39ff14",
              fontWeight: "bold",
              fontSize: "18px",
              fontFamily: "ui-monospace, monospace",
            }}>
              {buyPrice}c
            </div>
            <div style={{
              color: "#8a9ba8",
              fontSize: "10px",
            }}>
              per unit
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Info */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
        fontSize: "12px",
        color: "#8a9ba8",
      }}>
        <span>Your Coins:</span>
        <span style={{
          fontFamily: "ui-monospace, monospace",
          color: walletCoin >= buyPrice ? "#39ff14" : "#ff4444",
        }}>
          {walletCoin}c
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: "rgba(255, 68, 68, 0.2)",
          border: "1px solid #ff4444",
          borderRadius: "6px",
          padding: "8px 12px",
          marginBottom: "12px",
          color: "#ff4444",
          fontSize: "12px",
          textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* Buy Button */}
      <button
        data-testid="camp-trade-buy-button"
        onClick={handleBuy}
        disabled={!hasStock || !canAfford || buying}
        style={{
          width: "100%",
          padding: "12px 16px",
          background: hasStock && canAfford ? accentColor : "rgba(255, 255, 255, 0.1)",
          color: hasStock && canAfford ? "#000" : "#666",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "14px",
          cursor: hasStock && canAfford && !buying ? "pointer" : "not-allowed",
          transition: "all 0.2s ease",
          opacity: buying ? 0.7 : 1,
        }}
      >
        {buying
          ? "Processing..."
          : !hasStock
          ? "No Stock"
          : !canAfford
          ? `Need ${buyPrice - walletCoin}c more`
          : `Buy 1 ${itemName} (${buyPrice}c)`}
      </button>

      {/* Hint */}
      <div style={{
        marginTop: "8px",
        fontSize: "10px",
        color: "#666",
        textAlign: "center",
      }}>
        Stay near the camp to trade
      </div>
    </div>
  );
}

export default CampTradePanel;