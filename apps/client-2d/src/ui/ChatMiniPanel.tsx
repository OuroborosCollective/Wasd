/**
 * Phase 5/7: ChatMiniPanel - Legacy/Development Component
 *
 * ⚠️ IMPORTANT: This component is NOT used in the production/live render path.
 *
 * LIVE RENDER PATH (what's actually rendered on VPS):
 *   main.tsx → DeterministicWorldIsoApp.tsx → ArelorianStitchHud.tsx
 *   (ArelorianStitchHud has inline chat in stitch-chat section)
 *
 * UNUSED/LEGACY:
 *   - ChatMiniPanel.tsx: NOT IMPORTED anywhere in production code
 *   - The actual chat in live client is inline in ArelorianStitchHud.tsx
 *
 * Purpose: This was a standalone chat panel. ArelorianStitchHud has its own
 * chat implementation (stitch-chat section) instead.
 *
 * To add chat features to production, use the chat in ArelorianStitchHud.tsx
 *
 * Last used by: Development/testing only
 */

import React from "react";
import type { ChatMessagePayload } from "../net/protocol";

interface Props {
  messages: ChatMessagePayload[];
  onSend: (text: string) => void;
}

export function ChatMiniPanel({ messages, onSend }: Props) {
  const [text, setText] = React.useState("");

  function submit(event: React.FormEvent): void {
    event.preventDefault();

    const clean = text.trim();

    if (clean.length === 0) return;

    onSend(clean.slice(0, 240));
    setText("");
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 10,
        bottom: 12,
        zIndex: 12,
        width: "min(360px, calc(100vw - 20px))",
        borderRadius: 16,
        border: "1px solid rgba(0,229,255,.18)",
        background: "rgba(0,0,0,.34)",
        color: "#f5f7ff",
        font: "12px/1.4 system-ui, sans-serif",
        overflow: "hidden",
        backdropFilter: "blur(10px)"
      }}
    >
      <div
        style={{
          maxHeight: 120,
          overflow: "auto",
          padding: 10,
          display: "grid",
          gap: 6
        }}
      >
        {messages.length === 0 ? (
          <div style={{ opacity: 0.5 }}>Chat bereit…</div>
        ) : (
          messages.slice(-6).map((message) => (
            <div key={message.id}>
              <strong style={{ color: "#00e5ff" }}>{message.from}: </strong>
              <span>{message.text}</span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nachricht…"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "9px 10px",
            border: 0,
            outline: 0,
            color: "#f5f7ff",
            background: "rgba(255,255,255,.06)"
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0 12px",
            border: 0,
            color: "#071016",
            background: "#00e5ff",
            fontWeight: 800
          }}
        >
          SEND
        </button>
      </form>
    </div>
  );
}