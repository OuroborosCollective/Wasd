type GuildSummary = { id: string; name: string; rank: string } | null;

let panelEl: HTMLDivElement | null = null;
let current: GuildSummary = null;

let guildEventListenerBound = false;

function formatGuildText(g: GuildSummary): string {
  if (!g) return "No guild - use WS guild_create {name}, guild_join {guildId}, guild_leave, guild_disband {guildId}.";
  return `${g.name} (${g.rank})`;
}

function mountPanel(): HTMLDivElement {
  const node = document.createElement("div");
  node.id = "areloria-guild-panel";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "116px";
  node.style.maxWidth = "280px";
  node.style.background = "rgba(8,12,22,0.78)";
  node.style.color = "#e8f0ff";
  node.style.padding = "10px 12px";
  node.style.borderRadius = "10px";
  node.style.border = "1px solid rgba(120, 170, 255, 0.35)";
  node.style.fontFamily = "system-ui, sans-serif";
  node.style.fontSize = "12px";
  node.style.lineHeight = "1.45";
  node.style.zIndex = "5400";
  node.style.boxShadow = "0 6px 24px rgba(0,0,0,0.45)";
  node.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px;opacity:0.95">Guild</div>
    <div id="areloria-guild-panel-body"></div>
    <div style="margin-top:8px;opacity:0.72;font-size:11px">
      WS: <code>guild_create</code> {name}, <code>guild_join</code> {guildId}, <code>guild_leave</code>, <code>guild_disband</code> {guildId}
    </div>
  `;
  document.body.appendChild(node);
  return node;
}

function renderBody() {
  if (!panelEl) return;
  const body = panelEl.querySelector("#areloria-guild-panel-body");
  if (!body) return;
  body.textContent = formatGuildText(current);
}

export function setGuildState(summary: GuildSummary) {
  current = summary;
  if (!panelEl) panelEl = mountPanel();
  renderBody();
}

export function renderGuildPanel() {
  if (!panelEl) panelEl = mountPanel();
  renderBody();
  if (!guildEventListenerBound) {
    guildEventListenerBound = true;
    window.addEventListener("areloria:guild-state", ((ev: CustomEvent<GuildSummary>) => {
      setGuildState(ev.detail ?? null);
    }) as EventListener);
  }
}
