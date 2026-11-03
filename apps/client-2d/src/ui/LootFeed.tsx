import React from "react";
import type { LootFeedEntry } from "../game/loot";
import { getItemDefinition, type ItemKind } from "../game/items";

interface Props {
  entries: LootFeedEntry[];
}

const KIND_ICONS: Record<ItemKind, string> = {
  weapon: "⚔️",
  armor: "🛡️",
  consumable: "🧪",
  material: "📦",
  quest: "📜",
  currency: "💰"
};

export function LootFeed({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <div
      role="log"
      aria-label="Loot Feed"
      aria-live="polite"
      aria-relevant="additions"
      style={{
        position: "fixed",
        left: 12,
        top: "42%",
        zIndex: 35,
        display: "grid",
        gap: 6,
        pointerEvents: "none"
      }}
    >
      {entries.slice(0, 6).map((entry) => {
        const def = getItemDefinition(entry.itemId);
        const name = def?.name ?? entry.itemId;
        const rarity = def?.rarity ? ` (${def.rarity})` : "";
        const icon = def?.kind ? KIND_ICONS[def.kind] ?? "🎁" : "🎁";
        const ariaText = `Acquired ${entry.quantity} ${name}${rarity}`;
        const tooltip = def?.description
          ? `${name}${rarity} - ${def.description}`
          : `${name}${rarity}`;

        return (
          <div
            key={entry.id}
            role="status"
            aria-label={ariaText}
            title={tooltip}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,209,102,.28)",
              background: "rgba(0,0,0,.38)",
              color: "#f5f7ff",
              font: "12px/1.4 system-ui, sans-serif",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center"
            }}
          >
            <span aria-hidden="true" style={{ marginRight: 6 }}>
              {icon}
            </span>
            <span>
              +{entry.quantity} {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
