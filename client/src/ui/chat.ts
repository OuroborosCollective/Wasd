export type ChatScope = "global" | "zone" | "party";

type ChatSendFn = (type: string, payload: Record<string, unknown>) => void;

const MAX_LINES = 80;
const lines: string[] = [];

let chatLogEl: HTMLDivElement | null = null;
let chatInputEl: HTMLInputElement | null = null;
let sendChat: ChatSendFn | null = null;
let initialized = false;

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));
}

function appendHtmlLine(line: string): void {
  lines.push(line);
  if (lines.length > MAX_LINES) {
    lines.shift();
  }
  if (!chatLogEl) return;
  chatLogEl.innerHTML = lines.join("<br>");
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

export function initChat(sender: ChatSendFn): void {
  sendChat = sender;
  if (initialized) {
    return;
  }
  initialized = true;

  const existing = document.getElementById("chat-container");
  if (existing) {
    existing.remove();
  }

  const container = document.createElement("div");
  container.id = "chat-container";
  container.style.position = "fixed";
  container.style.left = "12px";
  container.style.bottom = "84px";
  container.style.width = "min(360px, 90vw)";
  container.style.zIndex = "6000";
  container.style.pointerEvents = "auto";
  container.innerHTML = `
    <div id="chat-log" aria-live="polite" aria-label="Game chat"
      style="height:140px;overflow-y:auto;background:rgba(8,10,16,0.72);border:1px solid rgba(255,255,255,0.15);border-bottom:none;border-radius:10px 10px 0 0;padding:10px;color:#e8ecf5;font:12px/1.4 system-ui,sans-serif;"></div>
    <form id="chat-form" autocomplete="off" style="display:flex;">
      <input id="chat-input" type="text" maxlength="200" placeholder="Press Enter to chat…"
        aria-label="Chat message"
        style="flex:1;background:rgba(8,10,16,0.9);border:1px solid rgba(255,255,255,0.2);border-radius:0 0 0 10px;padding:8px 10px;color:#fff;font-size:13px;outline:none;" />
      <button type="submit"
        style="background:rgba(52,109,77,0.92);border:1px solid rgba(84,180,126,0.58);border-left:none;border-radius:0 0 10px 0;padding:8px 12px;color:#f6fff9;font-size:12px;cursor:pointer;">Send</button>
    </form>
  `;

  document.body.appendChild(container);

  chatLogEl = container.querySelector<HTMLDivElement>("#chat-log");
  chatInputEl = container.querySelector<HTMLInputElement>("#chat-input");
  const form = container.querySelector<HTMLFormElement>("#chat-form");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!chatInputEl || !sendChat) return;
    const text = chatInputEl.value.trim();
    if (!text) return;
    sendChat("chat_send", { scope: "global", text });
    chatInputEl.value = "";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatInputEl) {
      chatInputEl.blur();
      return;
    }
    if (event.key !== "Enter" || !chatInputEl) {
      return;
    }
    const activeEl = document.activeElement;
    const activeTag = activeEl?.tagName?.toLowerCase() ?? "";
    const typingInInput =
      activeEl === chatInputEl ||
      activeTag === "input" ||
      activeTag === "textarea" ||
      activeTag === "select";
    if (typingInInput) return;
    event.preventDefault();
    chatInputEl.focus();
  });
}

export function focusChatInput(): void {
  chatInputEl?.focus();
}

export function onChatMessage(msg: {
  senderName?: string;
  sender?: string;
  text?: string;
  scope?: string;
  channel?: string;
  ts?: number;
  timestamp?: number;
}): void {
  const senderName = (msg.senderName || msg.sender || "Unknown").trim();
  const text = (msg.text || "").trim();
  if (!text) return;
  const ts = Number.isFinite(msg.ts) ? Number(msg.ts) : Number.isFinite(msg.timestamp) ? Number(msg.timestamp) : Date.now();
  const scope = (msg.scope || msg.channel || "global").trim().toLowerCase();
  const scopeLabel = scope !== "global" ? `[${escHtml(scope)}] ` : "";
  appendHtmlLine(
    `<span style="color:#8da6d8;">${formatTimestamp(ts)}</span> ` +
      `<span style="color:#9fc8a7;">${scopeLabel}</span>` +
      `<span style="color:#ffd38c;">${escHtml(senderName)}:</span> ` +
      `<span style="color:#e6edf9;">${escHtml(text)}</span>`
  );
}