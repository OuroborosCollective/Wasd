export type ChatScope = "global" | "zone" | "party" | "local" | "status";

type ChatSendFn = (type: string, payload: Record<string, unknown>) => void;

const MAX_LINES = 100;
const MAX_STATUS_LINES = 40;

interface ChatLine {
  html: string;
  channel: string;
}

const allLines: ChatLine[] = [];

let chatLogEl: HTMLDivElement | null = null;
let chatInputEl: HTMLInputElement | null = null;
let sendChat: ChatSendFn | null = null;
let initialized = false;
export function resetChatInitialized() { initialized = false; }
let activeChannel: "all" | "local" | "global" | "status" = "all";
let chatMinimized = false;

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));
}

function renderLines(): void {
  if (!chatLogEl) return;
  const filtered = activeChannel === "all"
    ? allLines
    : allLines.filter((l) => l.channel === activeChannel);
  chatLogEl.innerHTML = filtered.map((l) => l.html).join("<br>");
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function appendChatLine(line: ChatLine): void {
  if (line.channel === "status") {
    const firstStatusIdx = allLines.findIndex((entry) => entry.channel === "status");
    const statusCount = allLines.reduce((count, entry) => count + (entry.channel === "status" ? 1 : 0), 0);
    if (statusCount >= MAX_STATUS_LINES && firstStatusIdx >= 0) {
      allLines.splice(firstStatusIdx, 1);
    }
  }
  allLines.push(line);
  if (allLines.length > MAX_LINES) {
    // Preserve local/global player chatter by dropping the oldest status line first.
    const firstStatusIdx = allLines.findIndex((entry) => entry.channel === "status");
    if (firstStatusIdx >= 0) {
      allLines.splice(firstStatusIdx, 1);
    } else {
      allLines.shift();
    }
  }
  renderLines();
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function buildTabBar(): string {
  const tabs: Array<{ key: typeof activeChannel; label: string }> = [
    { key: "all", label: "Alle" },
    { key: "local", label: "Lokal" },
    { key: "global", label: "Global" },
    { key: "status", label: "Status" },
  ];
  return tabs.map((t) => {
    const active = t.key === activeChannel;
    return `<button role="tab" aria-selected="${active}" data-chat-tab="${t.key}" style="padding:4px 10px;font-size:11px;border:none;border-bottom:${active ? "2px solid #f27d26" : "2px solid transparent"};background:none;color:${active ? "#ffd38c" : "#8da6d8"};cursor:pointer;">${t.label}</button>`;
  }).join("");
}

function updateTabs(): void {
  const bar = document.getElementById("chat-tab-bar");
  if (bar) bar.innerHTML = buildTabBar();
}

export function initChat(sender: ChatSendFn): void {
  sendChat = sender;
  if (initialized) return;
  initialized = true;

  const existing = document.getElementById("chat-container");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "chat-container";
  container.style.position = "fixed";
  container.style.left = "12px";
  container.style.bottom = "84px";
  container.style.width = "min(360px, 90vw)";
  container.style.zIndex = "6000";
  container.style.pointerEvents = "auto";
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(8,10,16,0.85);border:1px solid rgba(255,255,255,0.15);border-bottom:none;border-radius:10px 10px 0 0;padding:2px 6px;">
      <div id="chat-tab-bar" role="tablist" aria-label="Chat Channels" style="display:flex;gap:2px;">${buildTabBar()}</div>
      <button id="chat-minimize-btn"
        aria-expanded="true"
        aria-controls="chat-body"
        aria-label="Minimize chat"
        style="background:none;border:none;color:#8da6d8;font-size:14px;cursor:pointer;padding:2px 6px;" title="Minimize">_</button>
    </div>
    <div id="chat-body" role="tabpanel" aria-labelledby="chat-tab-bar">
      <div id="chat-log" aria-live="polite" aria-label="Game chat"
        style="height:140px;overflow-y:auto;background:rgba(8,10,16,0.72);border:1px solid rgba(255,255,255,0.15);border-top:none;border-bottom:none;padding:10px;color:#e8ecf5;font:12px/1.4 system-ui,sans-serif;"></div>
      <form id="chat-form" autocomplete="off" style="display:flex;">
        <select id="chat-channel-select" style="background:rgba(8,10,16,0.9);border:1px solid rgba(255,255,255,0.2);border-right:none;border-radius:0;padding:8px 6px;color:#8da6d8;font-size:11px;">
          <option value="local">Lokal</option>
          <option value="global" selected>Global</option>
        </select>
        <input id="chat-input" type="text" maxlength="200" placeholder="Press Enter to chat…"
          aria-label="Chat message"
          style="flex:1;background:rgba(8,10,16,0.9);border:1px solid rgba(255,255,255,0.2);border-radius:0;padding:8px 10px;color:#fff;font-size:13px;outline:none;" />
        <button type="submit"
          style="background:rgba(52,109,77,0.92);border:1px solid rgba(84,180,126,0.58);border-left:none;border-radius:0 0 10px 0;padding:8px 12px;color:#f6fff9;font-size:12px;cursor:pointer;">Send</button>
      </form>
    </div>
  `;

  document.body.appendChild(container);

  chatLogEl = container.querySelector<HTMLDivElement>("#chat-log");
  chatInputEl = container.querySelector<HTMLInputElement>("#chat-input");
  const form = container.querySelector<HTMLFormElement>("#chat-form");
  const channelSelect = container.querySelector<HTMLSelectElement>("#chat-channel-select");
  const chatBody = container.querySelector<HTMLDivElement>("#chat-body");
  const minimizeBtn = container.querySelector<HTMLButtonElement>("#chat-minimize-btn");

  container.addEventListener("click", (e) => {
    const tab = (e.target as HTMLElement).dataset?.chatTab;
    if (tab) {
      activeChannel = tab as typeof activeChannel;
      updateTabs();
      renderLines();
    }
  });

  minimizeBtn?.addEventListener("click", () => {
    chatMinimized = !chatMinimized;
    if (chatBody) chatBody.style.display = chatMinimized ? "none" : "block";
    if (minimizeBtn) {
      minimizeBtn.textContent = chatMinimized ? "+" : "_";
      minimizeBtn.setAttribute("aria-expanded", String(!chatMinimized));
      minimizeBtn.setAttribute("aria-label", chatMinimized ? "Maximize chat" : "Minimize chat");
    }
  });

  // Stop touch events from reaching game canvas
  const stopPropagation = (e: Event) => e.stopPropagation();
  ["touchstart", "touchmove", "pointerdown"].forEach((evt) => {
    container.addEventListener(evt, stopPropagation, { passive: true });
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!chatInputEl || !sendChat) return;
    const text = chatInputEl.value.trim();
    if (!text) return;
    const channel = channelSelect?.value || "global";
    sendChat("chat_send", { channel, text });
    chatInputEl.value = "";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatInputEl) {
      chatInputEl.blur();
      return;
    }
    if (event.key !== "Enter" || !chatInputEl) return;
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
  senderType?: string;
  npcId?: string;
  ts?: number;
  timestamp?: number;
}): void {
  const senderName = (msg.senderName || msg.sender || "Unknown").trim();
  const text = (msg.text || "").trim();
  if (!text) return;
  const ts = Number.isFinite(msg.ts) ? Number(msg.ts) : Number.isFinite(msg.timestamp) ? Number(msg.timestamp) : Date.now();
  const channel = (msg.channel || msg.scope || "global").trim().toLowerCase();
  const senderType = (msg.senderType || "player").trim().toLowerCase();

  let nameColor = "#ffd38c";
  let textColor = "#e6edf9";
  let channelColor = "#9fc8a7";

  if (senderType === "system" || channel === "status") {
    nameColor = "#8da6d8";
    textColor = "#b0bdd6";
    channelColor = "#6b8ab8";
  }

  const channelLabel = `[${escHtml(channel)}] `;

  appendChatLine({
    channel,
    html:
      `<span style="color:#8da6d8;">${formatTimestamp(ts)}</span> ` +
      `<span style="color:${channelColor};">${channelLabel}</span>` +
      `<span style="color:${nameColor};">${escHtml(senderName)}:</span> ` +
      `<span style="color:${textColor};">${escHtml(text)}</span>`,
  });
}
