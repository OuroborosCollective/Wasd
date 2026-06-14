import React from "react";
import type { InteractionTarget } from "../game/interactions";

interface Props {
  target: InteractionTarget | null;
  onInteract: () => void;
}

export function InteractionPrompt({ target, onInteract }: Props) {
  if (!target) return null;

  return (
    <button
      type="button"
      onClick={onInteract}
      aria-label={`Interact with ${target.label}`}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 150,
        transform: "translateX(-50%)",
        zIndex: 22,
        padding: "10px 20px",
        borderRadius: 999,
        border: "1px solid rgba(0,229,255,.35)",
        background: "rgba(0,0,0,.55)",
        color: "#f5f7ff",
        fontWeight: 800,
        backdropFilter: "blur(12px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      <kbd
        style={{
          background: "rgba(0,229,255,0.2)",
          border: "1px solid rgba(0,229,255,0.4)",
          borderRadius: "4px",
          padding: "2px 6px",
          fontSize: "12px",
          fontFamily: "monospace",
          color: "#00e5ff",
        }}
      >
        E
      </kbd>
      <span>{target.label}</span>
    </button>
  );
}