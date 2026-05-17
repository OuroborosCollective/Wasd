let guildPanelEl: HTMLDivElement | null = null;

function formatGuild(g: unknown): string {
  if (!g || typeof g !== "object") return "No guild";
  const o = g as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : "";
  const id = typeof o.id === "string" ? o.id : "";
  const rank = typeof o.rank === "string" ? o.rank : "";
  const members = Array.isArray(o.members) ? o.members.length : 0;
  return [name && `«${name}»`, id && `#${id.slice(0, 10)}`, rank && `(${rank})`, members && `${members} members`]
    .filter(Boolean)
    .join(" ");
}

export function renderGuildPanel() {
  if (guildPanelEl) {
    guildPanelEl.remove();
    guildPanelEl = null;
  }

  const node = document.createElement("div");
  guildPanelEl = node;
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "116px";
  node.style.width = "220px";
  node.style.background = "rgba(0,0,0,0.72)";
  node.style.color = "#fff";
  node.style.padding = "10px 12px";
  node.style.borderRadius = "8px";
  node.style.fontSize = "13px";
  node.style.lineHeight = "1.35";
  node.style.zIndex = "1200";
  node.style.border = "1px solid rgba(255,255,255,0.12)";

  const title = document.createElement("div");
  title.textContent = "Guild";
  title.style.fontWeight = "700";
  title.style.marginBottom = "6px";

  const status = document.createElement("div");
  status.textContent = formatGuild(null);
  status.id = "guild-panel-status";

  const hint = document.createElement("div");
  hint.style.marginTop = "8px";
  hint.style.opacity = "0.75";
  hint.style.fontSize = "11px";
  hint.textContent =
    "Use chat or GM tools to send WS: guild_create { guildName }, guild_join { guildId }, guild_leave.";

  node.appendChild(title);
  node.appendChild(status);
  node.appendChild(hint);
  document.body.appendChild(node);

  const onSync = (ev: Event) => {
    const detail = (ev as CustomEvent<unknown>).detail;
    const el = document.getElementById("guild-panel-status");
    if (el) el.textContent = formatGuild(detail);
  };
  window.addEventListener("areloria:guild-sync", onSync as EventListener);

  (node as any)._guildUnsub = () => {
    window.removeEventListener("areloria:guild-sync", onSync as EventListener);
  };
}

export function destroyGuildPanel() {
  if (guildPanelEl && (guildPanelEl as any)._guildUnsub) {
    (guildPanelEl as any)._guildUnsub();
  }
  guildPanelEl?.remove();
  guildPanelEl = null;
}
