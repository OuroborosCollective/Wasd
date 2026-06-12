import { useEffect, useState } from "react";

interface ChatFeedEntry {
  readonly id: string;
  readonly senderName: string;
  readonly text: string;
  readonly channel: string;
  readonly tick: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function extractChatEntry(detail: unknown): ChatFeedEntry | null {
  const record = asRecord(detail);
  if (!record) return null;

  const type = asString(record.type || record.event);
  if (type !== "chat_message") return null;

  const payload = asRecord(record.payload) ?? record;
  const text = asString(payload.text).trim();
  if (!text) return null;

  const id = asString(payload.id, `chat_${asNumber(payload.ts || payload.timestamp, 0)}_${text.length}`);
  const senderName = asString(payload.senderName || payload.sender || payload.from, "[CHAT]");
  const channel = asString(payload.channel || payload.scope, "global");
  const tick = asNumber(payload.ts || payload.timestamp || payload.atMs, 0);

  return {
    id,
    senderName,
    text: text.slice(0, 300),
    channel,
    tick,
  };
}

export function ChatFeed(): JSX.Element {
  const [entries, setEntries] = useState<ChatFeedEntry[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const entry = extractChatEntry((event as CustomEvent).detail);
      if (!entry) return;

      setEntries((previous) => {
        const next = [...previous.filter((item) => item.id !== entry.id), entry];
        return next.slice(-5);
      });
    };

    window.addEventListener("wasd:network-packet", handler);
    return () => window.removeEventListener("wasd:network-packet", handler);
  }, []);

  if (entries.length === 0) {
    return <div data-testid="chat-feed" style={{ display: "none" }} />;
  }

  return (
    <section
      data-testid="chat-feed"
      aria-label="Live chat"
      style={{
        position: "fixed",
        left: "max(12px, env(safe-area-inset-left))",
        bottom: "max(96px, calc(env(safe-area-inset-bottom) + 96px))",
        zIndex: 32,
        display: "grid",
        gap: 6,
        width: "min(420px, calc(100vw - 24px))",
        pointerEvents: "none",
      }}
    >
      {entries.map((entry) => (
        <article
          key={entry.id}
          data-testid="chat-feed-entry"
          style={{
            border: "1px solid rgba(72, 233, 255, 0.22)",
            borderRadius: 14,
            background: "rgba(7, 7, 17, 0.72)",
            color: "#f5f7ff",
            padding: "8px 10px",
            boxShadow: "0 10px 28px rgba(0,0,0,.28)",
            backdropFilter: "blur(10px)",
            font: "12px/1.35 system-ui, sans-serif",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
            <strong style={{ color: "#48e9ff" }}>{entry.senderName}</strong>
            <span style={{ color: "rgba(245,247,255,.46)", fontSize: 11 }}>{entry.channel}</span>
          </div>
          <div>{entry.text}</div>
        </article>
      ))}
    </section>
  );
}
