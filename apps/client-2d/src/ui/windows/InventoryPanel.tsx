/**
 * Inventory Panel
 *
 * Displays server-authoritative player inventory from LiveGameplaySnapshot.
 * Shows gathered resource items with quantities.
 * Includes Gathering Tools section for equipped tools.
 *
 * Rules:
 * - No Math.random() for display
 * - No Date.now() for state
 * - Shows server-provided values only
 * - Client cannot set inventory directly
 */

import React, { useCallback } from "react";
import type {
  PlayerInventorySnapshot,
  PlayerEquipmentSnapshot,
} from "../../game/liveGameplaySnapshot";
import { equipGatheringTool } from "../../game/equipment";

interface Props {
  inventory: PlayerInventorySnapshot;
  equipment?: PlayerEquipmentSnapshot | null;
}

// Tool item IDs for gathering
const GATHERING_TOOL_IDS = new Set([
  "wooden_axe",
  "copper_pickaxe",
  "simple_fishing_rod",
]);

// Slot labels
const SLOT_LABELS: Record<string, string> = {
  woodcutting_tool: "🪓 Woodcutting",
  mining_tool: "⛏️ Mining",
  fishing_tool: "🎣 Fishing",
};

// Tool icons
const TOOL_ICONS: Record<string, string> = {
  wooden_axe: "🪓",
  copper_pickaxe: "⛏️",
  simple_fishing_rod: "🎣",
};

const categoryIcons: Record<string, string> = {
  resource: "📦",
  quest: "📜",
  consumable: "🧪",
  equipment: "⚔️",
};

export function InventoryPanel({ inventory, equipment }: Props) {
  const slots = inventory?.slots ?? [];
  const equipped = equipment?.slots ?? [];
  const tools = slots.filter((slot) => GATHERING_TOOL_IDS.has(slot.itemId));

  const handleEquip = useCallback(
    async (itemId: string) => {
      const result = await equipGatheringTool(itemId);

      // Show toast notification
      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: result.ok ? "success" : "error",
            message: result.ok
              ? "Tool equipped"
              : `Equip failed: ${result.result?.reason ?? "unknown"}`,
          },
        }),
      );
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

      {/* Gathering Tools Section */}
      <div className="gathering-tools-section">
        <h3 className="section-title">Equipment</h3>

        {equipped.length > 0 && (
          <div className="equipped-tools">
            <h4 className="subsection-title">Equipped</h4>
            <div className="equipped-list">
              {equipped.map((slot) => (
                <div key={slot.slotId} className="equipped-slot">
                  <span className="slot-label">{SLOT_LABELS[slot.slotId] ?? slot.slotId}:</span>
                  <span className="item-name">{slot.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tools.length > 0 && (
          <div className="available-tools">
            <h4 className="subsection-title">Available Tools</h4>
            <div className="tools-grid">
              {tools.map((slot) => (
                <button
                  key={slot.slotId}
                  type="button"
                  className="tool-button"
                  onClick={() => handleEquip(slot.itemId)}
                  title={`Equip ${slot.name}`}
                >
                  <span className="tool-icon">{TOOL_ICONS[slot.itemId] ?? "🔧"}</span>
                  <span className="tool-name">{slot.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="inventory-summary">
        {slots.length} / {inventory.capacity} slots used
      </p>

      <div className="inventory-grid">
        {slots.map((slot) => (
          <article key={slot.slotId} className="inventory-slot">
            <div className="inventory-slot__icon">
              {categoryIcons[slot.category] ?? "📦"}
            </div>
            <div className="inventory-slot__info">
              <strong className="inventory-slot__name">{slot.name}</strong>
              <span className="inventory-slot__quantity">
                x{slot.quantity}
              </span>
              <small className="inventory-slot__category">{slot.category}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}