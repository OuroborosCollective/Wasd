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
 * - After unequip, refetches snapshot to update inventory and equipment
 */

import React, { useCallback, useMemo, useState } from "react";
import type {
  PlayerInventorySnapshot,
  PlayerEquipmentSnapshot,
  WalletSnapshot,
  VendorEconomyContainerSnapshot,
  VendorPriceItemSnapshot,
  EquipmentStats,
} from "../../game/liveGameplaySnapshot";
import { getVendorPriceForItem } from "../../game/liveGameplaySnapshot";
import { equipGatheringTool, unequipGatheringTool } from "../../game/equipment";
import { fetchGameplaySnapshot, liveGameplayStore, DEFAULT_GAMEPLAY_PLAYER_ID } from "../../game/liveGameplayStore";
import { getGatheringToolIcon, isGatheringTool } from "../utils/ItemIconMapper";
import { dispatchSellResource, dispatchSellAllResources } from "../../game/gameplayActions";
import { readPlayerPositionBridge } from "../../game/PlayerPositionBridge";

interface Props {
  inventory: PlayerInventorySnapshot | null;
  equipment?: PlayerEquipmentSnapshot | null;
  wallet?: WalletSnapshot;
  vendorEconomy?: VendorEconomyContainerSnapshot;
  equipmentStats?: EquipmentStats;
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

export function InventoryPanel({ inventory, equipment, wallet, vendorEconomy, equipmentStats }: Props) {
  const [sellingItemId, setSellingItemId] = useState<string | null>(null);
  const [isSellingAll, setIsSellingAll] = useState<boolean>(false);

  const slots = inventory?.slots ?? [];
  const equipped = equipment?.slots ?? [];
  const tools = slots.filter((slot) => GATHERING_TOOL_IDS.has(slot.itemId));
  const resources = slots.filter((slot) => SELLABLE_RESOURCE_IDS.has(slot.itemId));
  const stats = equipmentStats ?? {
    attackPower: 0, defense: 0, maxHealth: 0, maxStamina: 0,
    magicFind: 0, gatheringYield: 0, gatheringXp: 0,
    lootQuality: 0, criticalChancePerMille: 0,
  };

  // Show empty state when no inventory loaded yet
  if (!inventory) {
    return (
      <section data-testid="inventory-panel-empty" className="are-window">
        <p className="are-text-muted">Loading inventory…</p>
      </section>
    );
  }

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

  /**
   * Refetch snapshot after mutating actions.
   */
  const refetchSnapshot = useCallback(async () => {
    const next = await fetchGameplaySnapshot(DEFAULT_GAMEPLAY_PLAYER_ID);
    if (next) {
      liveGameplayStore.setSnapshot(next);
    }
  }, []);

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
        await refetchSnapshot();
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
    [refetchSnapshot],
  );

  const handleUnequip = useCallback(
    async (slotId: string) => {
      const result = await unequipGatheringTool(slotId);

      if (result.ok && result.result?.ok) {
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "success",
              message: "Tool unequipped",
            },
          }),
        );

        // Refetch snapshot to update equipment/paperdoll display
        await refetchSnapshot();
      } else {
        window.dispatchEvent(
          new CustomEvent("wasd:toast", {
            detail: {
              type: "error",
              message: `Unequip failed: ${result.result?.reason ?? "unknown"}`,
            },
          }),
        );
      }
    },
    [refetchSnapshot],
  );

  const handleSell = useCallback(
    async (itemId: string, quantity: number) => {
      setSellingItemId(itemId);
      try {
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
      } finally {
        setSellingItemId(null);
      }
    },
    [getEffectivePrice],
  );

  const handleSellAll = useCallback(
    async () => {
      setIsSellingAll(true);
      try {
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
      } finally {
        setIsSellingAll(false);
      }
    },
    [],
  );

  if (!slots.length && !equipped.length) {
    return (
      <section data-testid="inventory-panel-empty" className="are-window">
        <p className="are-text-muted">No items collected yet.</p>
        <p className="are-text-muted">
          <small>Walk near resource nodes and gather to collect items.</small>
        </p>
      </section>
    );
  }

  return (
    <section data-testid="inventory-panel-live" className="are-window">
      {/* Wallet Section */}
      <div className="wallet-section" data-testid="wallet-coin-balance">
        <span className="wallet-label">💰 Coins:</span>
        <span className="wallet-value">{wallet?.coin ?? 0}</span>
      </div>

      {/* Equipment Stats Summary — server-authoritative */}
      <div className="equipment-stats-summary" data-testid="equipment-stats-summary">
        <h3 className="section-title">Equipment Stats</h3>
        <div className="stats-grid">
          <div className="stat-row" data-testid="equipment-stat-attack-power">
            <span className="stat-label">Attack Power</span>
            <span className="stat-value">{stats.attackPower}</span>
          </div>
          <div className="stat-row" data-testid="equipment-stat-defense">
            <span className="stat-label">Defense</span>
            <span className="stat-value">{stats.defense}</span>
          </div>
          <div className="stat-row" data-testid="equipment-stat-max-health">
            <span className="stat-label">Max Health</span>
            <span className="stat-value">{stats.maxHealth}</span>
          </div>
          <div className="stat-row" data-testid="equipment-stat-max-stamina">
            <span className="stat-label">Max Stamina</span>
            <span className="stat-value">{stats.maxStamina}</span>
          </div>
          <div className="stat-row" data-testid="equipment-stat-magic-find">
            <span className="stat-label">Magic Find</span>
            <span className="stat-value">{stats.magicFind}</span>
          </div>
          <div className="stat-row" data-testid="equipment-stat-gathering-yield">
            <span className="stat-label">Gathering Yield</span>
            <span className="stat-value">{stats.gatheringYield}</span>
          </div>
          <div className="stat-row" data-testid="equipment-stat-loot-quality">
            <span className="stat-label">Loot Quality</span>
            <span className="stat-value">{stats.lootQuality}</span>
          </div>
          <div className="stat-row" data-testid="equipment-stat-crit-chance">
            <span className="stat-label">Crit Chance</span>
            <span className="stat-value">{(stats.criticalChancePerMille / 10).toFixed(1)}%</span>
          </div>
        </div>
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
                  <div key={slot.slotId} className={`equipped-slot rarity-${TOOL_RARITY[slot.itemId] ?? "common"}`} data-testid={`equipment-slot-${slot.slotId}`}>
                    {iconPath && (
                      <img src={iconPath} alt={slot.title} className="tool-svg-icon" />
                    )}
                    <span className="slot-label">{SLOT_LABELS[slot.slotId] ?? slot.slotId}:</span>
                    <span className="item-name">{slot.title}</span>
                    <button
                      type="button"
                      className="unequip-button"
                      onClick={() => handleUnequip(slot.slotId)}
                      data-testid={`unequip-slot-${slot.slotId}`}
                      title={`Unequip ${slot.title}`}
                      aria-label={`Unequip ${slot.title}`}
                    >
                      ✕
                    </button>
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
                const toolName = TOOL_NAMES[slot.itemId] ?? slot.name;
                return (
                  <button
                    key={slot.slotId}
                    type="button"
                    className={`tool-button rarity-${TOOL_RARITY[slot.itemId] ?? "common"}`}
                    onClick={() => handleEquip(slot.itemId)}
                    data-testid={`equip-item-${slot.itemId}`}
                    title={`Equip ${toolName}`}
                    aria-label={`Equip ${toolName}`}
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
          title={isSellingAll ? "Selling resources..." : "Sell all collectable resources in inventory"}
          aria-label={isSellingAll ? "Selling resources..." : "Sell all collectable resources in inventory"}
          disabled={isSellingAll || sellingItemId !== null}
          aria-busy={isSellingAll}
        >
          {isSellingAll ? "Selling..." : "Sell All Resources"}
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
            <article key={slot.slotId} className={`inventory-slot rarity-${rarity}`} data-testid={`inventory-item-${slot.itemId}`}>
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
                  data-testid={`vendor-sell-${slot.itemId}`}
                  title={sellingItemId === slot.itemId ? `Selling ${slot.name}...` : `Sell ${slot.name} for ${totalValue} coins`}
                  aria-label={sellingItemId === slot.itemId ? `Selling ${slot.name}...` : `Sell ${slot.name} for ${totalValue} coins`}
                  disabled={isSellingAll || sellingItemId !== null}
                  aria-busy={sellingItemId === slot.itemId}
                >
                  {sellingItemId === slot.itemId ? "SELLING..." : `SELL ${totalValue}c`}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}