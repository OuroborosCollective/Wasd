// The old DOM marker overlay is intentionally disabled.
// Bootstrap NPCs are rendered through the Pixi scene / asset binding layer instead.

interface ChatSidecarEntry {
  readonly id: string;
  readonly senderName: string;
  readonly channel: string;
  readonly text: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function ensureChatSidecar(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  let root = document.getElementById("client2d-chat-feed");
  if (root) return root;

  root = document.createElement("section");
  root.id = "client2d-chat-feed";
  root.dataset.testid = "chat-feed";
  root.setAttribute("aria-label", "Live chat");
  root.style.cssText = [
    "position:fixed",
    "left:max(12px, env(safe-area-inset-left))",
    "bottom:max(96px, calc(env(safe-area-inset-bottom) + 96px))",
    "z-index:32",
    "display:grid",
    "gap:6px",
    "width:min(420px, calc(100vw - 24px))",
    "pointer-events:none",
  ].join(";");

  document.body.appendChild(root);
  return root;
}

function parseChatEntry(detail: unknown): ChatSidecarEntry | null {
  const record = asRecord(detail);
  if (!record) return null;

  const type = asString(record.type || record.event);
  if (type !== "chat_message") return null;

  const payload = asRecord(record.payload) ?? record;
  const text = asString(payload.text).trim();
  if (!text) return null;

  const id = asString(payload.id, `chat_${text.length}_${asString(payload.senderName || payload.sender || payload.from, "chat")}`);
  const senderName = asString(payload.senderName || payload.sender || payload.from, "[CHAT]");
  const channel = asString(payload.channel || payload.scope, "global");

  return { id, senderName, channel, text: text.slice(0, 300) };
}

function renderChatEntries(entries: readonly ChatSidecarEntry[]): void {
  const root = ensureChatSidecar();
  if (!root) return;

  root.replaceChildren();

  for (const entry of entries.slice(-5)) {
    const item = document.createElement("article");
    item.dataset.testid = "chat-feed-entry";
    item.style.cssText = [
      "border:1px solid rgba(72, 233, 255, 0.22)",
      "border-radius:14px",
      "background:rgba(7, 7, 17, 0.72)",
      "color:#f5f7ff",
      "padding:8px 10px",
      "box-shadow:0 10px 28px rgba(0,0,0,.28)",
      "backdrop-filter:blur(10px)",
      "font:12px/1.35 system-ui, sans-serif",
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;gap:8px;margin-bottom:2px";

    const sender = document.createElement("strong");
    sender.style.color = "#48e9ff";
    sender.textContent = entry.senderName;

    const channel = document.createElement("span");
    channel.style.cssText = "color:rgba(245,247,255,.46);font-size:11px";
    channel.textContent = entry.channel;

    const text = document.createElement("div");
    text.textContent = entry.text;

    header.append(sender, channel);
    item.append(header, text);
    root.appendChild(item);
  }
}

if (typeof window !== "undefined") {
  const entries: ChatSidecarEntry[] = [];

  window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("client2d-bootstrap-npc-overlay")?.remove();
    document.getElementById("client2d-bootstrap-npc-overlay-style")?.remove();
  }, { once: true });

  window.addEventListener("wasd:network-packet", (event: Event) => {
    const entry = parseChatEntry((event as CustomEvent).detail);
    if (!entry) return;

    const existing = entries.findIndex((item) => item.id === entry.id);
    if (existing >= 0) entries.splice(existing, 1);
    entries.push(entry);
    renderChatEntries(entries);
  });
}

export {};
