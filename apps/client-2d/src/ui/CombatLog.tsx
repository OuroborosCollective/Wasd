import React from "react";
import type { CombatLogEntry } from "../game/combat";

interface Props {
  entries: CombatLogEntry[];
}

export function CombatLog({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <div
      role="log"
      aria-label="Combat Log"
      aria-live="polite"
      aria-relevant="additions"
      style={{
        position: "fixed",
        right: 12,
        top: "38%",
        zIndex: 34,
        width: 180,
        maxHeight: 220,
        overflow: "hidden",
        display: "grid",
        gap: 6,
        pointerEvents: "none"
      }}
    >
      {entries.slice(0, 8).map((entry) => (
        <div
          key={entry.id}
          role="status"
          aria-label={`Combat event: ${entry.text}`}
          title={entry.text}
          style={{
            padding: "7px 9px",
            borderRadius: 10,
            background: "rgba(0,0,0,.34)",
            color:
              entry.kind === "damage"
                ? "#ff7a00"
                : entry.kind === "heal"
                  ? "#39ff14"
                  : "#f5f7ff",
            font: "12px/1.35 ui-monospace, monospace",
            backdropFilter: "blur(8px)"
          }}
        >
          {entry.text}
        </div>
      ))}
    </div>
  );
}