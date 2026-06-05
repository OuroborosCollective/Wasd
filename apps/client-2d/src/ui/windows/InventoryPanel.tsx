/**
 * Inventory Panel
 *
 * Displays server-authoritative player inventory from LiveGameplaySnapshot.
 * Shows gathered resource items with quantities.
 *
 * Rules:
 * - No Math.random() for display
 * - No Date.now() for state
 * - Shows server-provided values only
 * - Client cannot set inventory directly
 */

import React from "react";
import type { PlayerInventorySnapshot } from "../../game/liveGameplaySnapshot";

interface Props {
  inventory: PlayerInventorySnapshot;
}

const categoryIcons: Record<string, string> = {
  resource: "📦",
  quest: "📜",
  consumable: "🧪",
  equipment: "⚔️",
};

export function InventoryPanel({ inventory }: Props) {
  const slots = inventory?.slots ?? [];

  if (!slots.length) {
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