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
      style={{
        position: "fixed",
        left: "50%",
        bottom: 150,
        transform: "translateX(-50%)",
        zIndex: 22,
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid rgba(0,229,255,.35)",
        background: "rgba(0,0,0,.45)",
        color: "#f5f7ff",
        fontWeight: 800,
        backdropFilter: "blur(10px)",
        cursor: "pointer"
      }}
    >
      {target.label}
    </button>
  );
}