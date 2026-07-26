import React from "react";
import type { DialogueState } from "../game/dialogue";

interface Props {
  dialogue: DialogueState;
  onClose: () => void;
}

export function NpcDialoguePanel({ dialogue, onClose }: Props) {
  const [isHovered, setIsHovered] = React.useState(false);

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
        borderRadius: "0px",
        border: "1px solid rgba(0,229,255,.35)",
        background: "rgba(13, 21, 22, 0.95)",
        color: "#f5f7ff",
        backdropFilter: "blur(20px)",
        boxShadow: "0 20px 60px rgba(0,0,0,.55)"
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: "#00e5ff", fontFamily: "Epilogue, sans-serif", fontSize: "16px", letterSpacing: "0.05em" }}>
          {dialogue.active.npcName}
        </strong>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialogue [ESC]"
          aria-keyshortcuts="Escape"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          style={{
            minWidth: 36,
            width: "auto",
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            border: `1px solid ${isHovered ? "#00e5ff" : "rgba(132, 147, 150, 0.3)"}`,
            borderRadius: "0px",
            color: isHovered ? "#00e5ff" : "#849396",
            fontSize: "14px",
            transition: "all 0.2s ease",
            padding: "0 8px",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <kbd className="cz-kbd" aria-hidden="true" style={{ margin: 0 }}>ESC</kbd>
          ✕
        </button>
      </header>

      <p style={{ marginTop: 12, lineHeight: 1.55, fontFamily: "Epilogue, sans-serif", fontSize: "14px", color: "#dce4e5" }}>
        {dialogue.active.text}
      </p>
    </div>
  );
}