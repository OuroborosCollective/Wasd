import React, { useEffect } from "react";
import { shortIdentity } from "../identity/clientIdentity";

interface Props {
  open: boolean;
  stableGuestId: string;
  sessionToken: string | null;
  playerId: string;
  characterId: string | null;
  identityStatus: string;
  onResetIdentity: () => void;
  onClose: () => void;
}

export function IdentityDebugPanel({
  open,
  stableGuestId,
  sessionToken,
  playerId,
  characterId,
  identityStatus,
  onResetIdentity,
  onClose
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-debug-title"
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 80,
        width: "min(520px, 94vw)",
        padding: 16,
        borderRadius: 20,
        border: "1px solid rgba(0,229,255,.3)",
        background: "rgba(7,7,17,.95)",
        color: "#f5f7ff",
        font: "13px/1.45 system-ui, sans-serif",
        backdropFilter: "blur(14px)"
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 id="identity-debug-title" style={{ margin: 0, fontSize: 16 }}>
          Identity Debug [P7]
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close identity debug panel"
          title="Close identity debug panel"
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}
        >
          ✕
        </button>
      </header>

      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        <div>Status: {identityStatus}</div>
        <div>Stable Guest: {shortIdentity(stableGuestId)}</div>
        <div>Session Token: {sessionToken ? shortIdentity(sessionToken) : "none"}</div>
        <div>Player ID: {shortIdentity(playerId)}</div>
        <div>Character ID: {characterId ? shortIdentity(characterId) : "none"}</div>
      </div>

      <button
        type="button"
        onClick={onResetIdentity}
        aria-label="Reset local identity"
        title="Reset local guest identity and clear credentials"
        style={{
          marginTop: 16,
          padding: "8px 10px",
          borderRadius: 12,
          border: "1px solid rgba(255,65,108,.4)",
          background: "rgba(255,65,108,.16)",
          color: "#fff",
          cursor: "pointer"
        }}
      >
        Reset Local Identity
      </button>
    </div>
  );
}