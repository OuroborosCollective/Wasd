/**
 * Inventory Panel
 *
 * Displays server-authoritative player inventory from LiveGameplaySnapshot.
 * Shows gathered resource items with quantities.
 * Includes Gathering Tools section for equipped tools.
 * Supports selling resources to the vendor.
 * Shows dynamic vendor prices based on stock/demand.
 *
 * Rules:
 * - No Math.random() for display
 * - No Date.now() for state
 * - Shows server-provided values only
 * - Client cannot set inventory directly
 * - After equip, refetches snapshot to update equipment/paperdoll display
 * - After sell, refetches snapshot to update inventory and wallet
 */

import React, { useCallback, useMemo } from "react";
import type {
  PlayerInventorySnapshot,
  PlayerEquipmentSnapshot,
  WalletSnapshot,
  VendorEconomyContainerSnapshot,
  VendorPriceItemSnapshot,
} from "../../game/liveGameplaySnapshot";
import { getVendorPriceForItem } from "../../game/liveGameplaySnapshot";
import { equipGatheringTool } from "../../game/equipment";
import { fetchGameplaySnapshot, liveGameplayStore, DEFAULT_GAMEPLAY_PLAYER_ID } from "../../game/liveGameplayStore";
import { getGatheringToolIcon, isGatheringTool } from "../utils/ItemIconMapper";
import { dispatchSellResource, dispatchSellAllResources } from "../../game/gameplayActions";
import { readPlayerPositionBridge } from "../../game/PlayerPositionBridge";

interface Props {
  inventory: PlayerInventorySnapshot;
  equipment?: PlayerEquipmentSnapshot | null;
  wallet?: WalletSnapshot;
  vendorEconomy?: VendorEconomyContainerSnapshot;
}

// Tool item IDs for gathering
const GATHERING_TOOL_IDS = new Set([
  "wooden_axe",
  "copper_pickaxe",
  "simple_fishing_rod",
]);

// Slot labels
const SLOT_LABELS: Record<string, string> = {
  woodcutting_tool: "Woodcutting",
  mining_tool: "Mining",
  fishing_tool: "Fishing",
};

// Tool display names
const TOOL_NAMES: Record<string, string> = {
  wooden_axe: "Wooden Axe",
  copper_pickaxe: "Copper Pickaxe",
  simple_fishing_rod: "Simple Fishing Rod",
};

// Tool rarity (all common for now)
const TOOL_RARITY: Record<string, string> = {
  wooden_axe: "common",
  copper_pickaxe: "common",
  simple_fishing_rod: "common",
};

const categoryIcons: Record<string, string> = {
  resource: "📦",
  quest: "📜",
  consumable: "🧪",
  equipment: "⚔️",
};

// Resource item IDs that are sellable
const SELLABLE_RESOURCE_IDS = new Set([
  "wood_log",
  "copper_ore",
  "raw_fish",
  "wood_plank",
  "copper_ingot",
  "cooked_fish",
]);

// Default sell prices for fallback display (when no snapshot available)
const DEFAULT_SELL_PRICES: Record<string, number> = {
  // Raw gathered resources
  wood_log: 1,
  copper_ore: 3,
  raw_fish: 2,
  // Processed resources (premium)
  wood_plank: 3,
  copper_ingot: 8,
  cooked_fish: 4,
};

const VENDOR_ID = "village_trader_001";

export function InventoryPanel({ inventory, equipment, wallet, vendorEconomy }: Props) {
  const slots = inventory?.slots ?? [];
  const equipped = equipment?.slots ?? [];
  const tools = slots.filter((slot) => GATHERING_TOOL_IDS.has(slot.itemId));
  const resources = slots.filter((slot) => SELLABLE_RESOURCE_IDS.has(slot.itemId));

  /**
   * Get price info for an item, using snapshot if available.
   */
  const getPriceInfo = useCallback(
    (itemId: string): VendorPriceItemSnapshot | null => {
      if (!vendorEconomy) return null;
      return getVendorPriceForItem(vendorEconomy, VENDOR_ID, itemId) ?? null;
    },
    [vendorEconomy],
  );

  /**
   * Get effective price for an item (snapshot price or default).
   */
  const getEffectivePrice = useCallback(
    (itemId: string): number => {
      const priceInfo = getPriceInfo(itemId);
      if (priceInfo) return priceInfo.unitPrice;
      return DEFAULT_SELL_PRICES[itemId] ?? 0;
    },
    [getPriceInfo],
  );

  /**
   * Get demand band display text.
   */
  const getDemandBandText = useCallback(
    (itemId: string): string | null => {
      const priceInfo = getPriceInfo(itemId);
      if (!priceInfo) return null;
      if (priceInfo.demandBand === "stocked") return "Price down: stocked";
      if (priceInfo.demandBand === "oversupplied") return "Price down: oversupplied";
      return null;
    },
    [getPriceInfo],
  );

  const handleEquip = useCallback(
    async (itemId: string) => {
      const result = await equipGatheringTool(itemId);

      if (result.ok && result.result?.ok) {
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "success",
              message: "Tool equipped",
            },
          }),
        );

        // Refetch snapshot to update equipment/paperdoll display
        const next = await fetchGameplaySnapshot(DEFAULT_GAMEPLAY_PLAYER_ID);
        if (next) {
          liveGameplayStore.setSnapshot(next);
        }
      } else {
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "error",
              message: `Equip failed: ${result.result?.reason ?? "unknown"}`,
            },
          }),
        );
      }
    },
    [],
  );

  const handleSell = useCallback(
    async (itemId: string, quantity: number) => {
      const result = await dispatchSellResource({ itemId, quantity });

      if (result.ok && result.result) {
        const price = getEffectivePrice(itemId);
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "success",
              message: `Sold ${quantity} for ${result.result.totalCoins} coins`,
            },
          }),
        );
      } else {
        // Provide user-friendly error message for vendor proximity issues
        let errorMessage = result.error ?? "Sell failed";
        if (result.error === "vendor_too_far") {
          errorMessage = "Return to village trader to sell resources";
        } else if (result.error === "missing_player_position") {
          errorMessage = "Cannot determine position - try moving slightly";
        }
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "error",
              message: errorMessage,
            },
          }),
        );
      }
    },
    [getEffectivePrice],
  );

  const handleSellAll = useCallback(
    async () => {
      const result = await dispatchSellAllResources();

      if (result.ok && result.result) {
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "success",
              message: `Sold all resources for ${result.result.totalCoins} coins`,
            },
          }),
        );
      } else {
        // Provide user-friendly error message for vendor proximity issues
        let errorMessage = result.error ?? "Nothing to sell";
        if (result.error === "vendor_too_far") {
          errorMessage = "Return to village trader to sell resources";
        } else if (result.error === "missing_player_position") {
          errorMessage = "Cannot determine position - try moving slightly";
        }
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "error",
              message: errorMessage,
            },
          }),
        );
      }
    },
    [],
  );

  if (!slots.length && !equipped.length) {
    return (
      <section data-testid="inventory-panel-empty" className="are-window">
        <h2>Inventory</h2>
        <p className="are-text-muted">No items collected yet.</p>
        <p className="are-text-muted">
          <small>Walk near resource nodes and gather to collect items.</small>
        </p>
      </section>
    );
  }

  return (
    <section data-testid="inventory-panel-live" className="are-window">
      <h2>Inventory</h2>

      {/* Wallet Section */}
      <div className="wallet-section" data-testid="wallet-balance">
        <span className="wallet-label">💰 Coins:</span>
        <span className="wallet-value">{wallet?.coin ?? 0}</span>
      </div>

      {/* Gathering Tools Section */}
      <div className="gathering-tools-section">
        <h3 className="section-title">Equipment</h3>

        {equipped.length > 0 && (
          <div className="equipped-tools">
            <h4 className="subsection-title">Equipped</h4>
            <div className="equipped-list">
              {equipped.map((slot) => {
                const iconPath = getGatheringToolIcon(slot.itemId);
                return (
                  <div key={slot.slotId} className={`equipped-slot rarity-${TOOL_RARITY[slot.itemId] ?? "common"}`}>
                    {iconPath && (
                      <img src={iconPath} alt={slot.title} className="tool-svg-icon" />
                    )}
                    <span className="slot-label">{SLOT_LABELS[slot.slotId] ?? slot.slotId}:</span>
                    <span className="item-name">{slot.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tools.length > 0 && (
          <div className="available-tools">
            <h4 className="subsection-title">Available Tools</h4>
            <div className="tools-grid">
              {tools.map((slot) => {
                const iconPath = getGatheringToolIcon(slot.itemId);
                return (
                  <button
                    key={slot.slotId}
                    type="button"
                    className={`tool-button rarity-${TOOL_RARITY[slot.itemId] ?? "common"}`}
                    onClick={() => handleEquip(slot.itemId)}
                    title={`Equip ${slot.name}`}
                  >
                    {iconPath && (
                      <img src={iconPath} alt={slot.name} className="tool-svg-icon" />
                    )}
                    <span className="tool-name">{TOOL_NAMES[slot.itemId] ?? slot.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="inventory-summary">
        {slots.length} / {inventory.capacity} slots used
      </p>

      {/* Vendor proximity hint */}
      {resources.length > 0 && (
        <div className="vendor-sell-hint" data-testid="vendor-sell-hint">
          <span className="vendor-hint-icon">🏪</span>
          <span>Sell at Village Trader</span>
        </div>
      )}

      {/* Sell All Resources Button */}
      {resources.length > 0 && (
        <button
          type="button"
          className="sell-all-button"
          onClick={handleSellAll}
          data-testid="sell-all-resources-button"
        >
          Sell All Resources
        </button>
      )}

      <div className="inventory-grid">
        {slots.map((slot) => {
          const iconPath = getGatheringToolIcon(slot.itemId);
          const rarity = TOOL_RARITY[slot.itemId] ?? slot.category;
          const isSellable = SELLABLE_RESOURCE_IDS.has(slot.itemId);
          const sellPrice = getEffectivePrice(slot.itemId);
          const demandBandText = getDemandBandText(slot.itemId);
          const totalValue = sellPrice * slot.quantity;

          return (
            <article key={slot.slotId} className={`inventory-slot rarity-${rarity}`}>
              <div className="inventory-slot__icon">
                {iconPath ? (
                  <img src={iconPath} alt={slot.name} className="inventory-slot-svg" />
                ) : (
                  categoryIcons[slot.category] ?? "📦"
                )}
              </div>
              <div className="inventory-slot__info">
                <strong className="inventory-slot__name">{slot.name}</strong>
                <span className="inventory-slot__quantity">
                  x{slot.quantity}
                </span>
                <small className="inventory-slot__category">{slot.category}</small>
                {isSellable && (
                  <small className="inventory-slot__price" data-testid="vendor-price">
                    {sellPrice}c each
                    {demandBandText && <span className="demand-band-hint"> ({demandBandText})</span>}
                  </small>
                )}
              </div>
              {isSellable && (
                <button
                  type="button"
                  className="sell-button"
                  onClick={() => handleSell(slot.itemId, slot.quantity)}
                  data-testid="sell-resource-button"
                  title={`Sell ${slot.name} for ${totalValue} coins`}
                >
                  SELL {totalValue}c
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}