import React, { useEffect, useRef } from "react";
import type { DialogueState } from "../game/dialogue";

interface Props {
  dialogue: DialogueState;
  onClose: () => void;
}

export function NpcDialoguePanel({ dialogue, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialogue.active) return;

    // Focus close button on mount for accessibility (focus management)
    closeButtonRef.current?.focus();

    // Listen to Escape key to close the dialog
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogue.active, onClose]);

  if (!dialogue.active) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Dialogue with ${dialogue.active.npcName}`}
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
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: "#00e5ff", fontSize: "16px", fontFamily: "Epilogue, sans-serif" }}>
          {dialogue.active.npcName}
        </strong>
        <button
          ref={closeButtonRef}
          className="wow-close-btn"
          type="button"
          onClick={onClose}
          aria-label="Close dialogue [ESC]"
          aria-keyshortcuts="Escape"
          style={{
            cursor: "pointer",
            background: "transparent",
            color: "#f5f7ff",
            border: "none"
          }}
        >
          <kbd className="cz-kbd" aria-hidden="true">ESC</kbd>✕
        </button>
      </header>

      <p style={{ marginTop: 12, lineHeight: 1.55, fontFamily: "Epilogue, sans-serif", fontSize: "14px" }}>
        {dialogue.active.text}
      </p>
    </div>
  );
}
