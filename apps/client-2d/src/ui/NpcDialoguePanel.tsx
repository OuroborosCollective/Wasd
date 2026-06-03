import React from "react";
import type { DialogueState } from "../game/dialogue";

interface Props {
  dialogue: DialogueState;
  onClose: () => void;
}

export function NpcDialoguePanel({ dialogue, onClose }: Props) {
  if (!dialogue.active) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 28,
        transform: "translateX(-50%)",
        zIndex: 60,
        width: "min(620px, 94vw)",
        padding: 16,
        borderRadius: 20,
        border: "1px solid rgba(0,229,255,.35)",
        background: "rgba(7,7,17,.94)",
        color: "#f5f7ff",
        backdropFilter: "blur(14px)",
        boxShadow: "0 20px 60px rgba(0,0,0,.42)"
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <strong style={{ color: "#00e5ff" }}>
          {dialogue.active.npcName}
        </strong>
        <button type="button" onClick={onClose}>
          ✕
        </button>
      </header>

      <p style={{ marginTop: 12, lineHeight: 1.55 }}>
        {dialogue.active.text}
      </p>
    </div>
  );
}