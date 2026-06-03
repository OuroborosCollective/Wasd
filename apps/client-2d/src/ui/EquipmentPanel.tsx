import React from "react";
import type { EquipmentState } from "../game/equipment";
import { getItemDefinition } from "../game/items";

interface Props {
  open: boolean;
  equipment: EquipmentState;
  onClose: () => void;
}

export function EquipmentPanel({ open, equipment, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 41,
        width: "min(420px, 94vw)",
        padding: 16,
        borderRadius: 20,
        border: "1px solid rgba(255,122,0,.32)",
        background: "rgba(7,7,17,.92)",
        color: "#f5f7ff",
        backdropFilter: "blur(14px)"
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Equipment</h2>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,.1)",
            border: "1px solid rgba(255,255,255,.2)",
            borderRadius: 8,
            color: "#f5f7ff",
            cursor: "pointer",
            padding: "6px 12px"
          }}
        >
          ✕
        </button>
      </header>

      <div style={{ display: "grid", gap: 10 }}>
        {Object.entries(equipment.slots).map(([slot, itemId]) => {
          const def = itemId ? getItemDefinition(itemId) : null;

          return (
            <div
              key={slot}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)"
              }}
            >
              <strong style={{ textTransform: "capitalize" }}>{slot}</strong>
              <div style={{ opacity: def ? 1 : 0.45 }}>
                {def ? def.name : "Empty"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}