import { socialState } from "../state/socialState";
import {
  sendGuildCreate,
  sendGuildJoin,
  sendGuildLeave,
} from "../networking/websocketClient";

let panelEl: HTMLDivElement | null = null;
let guildListenerBound = false;

function onGuildSync(): void {
  if (panelEl?.isConnected) render();
}

function ensurePanel(): HTMLDivElement {
  if (panelEl && panelEl.isConnected) return panelEl;
  if (!guildListenerBound) {
    window.addEventListener("areloria:guild-sync", onGuildSync);
    guildListenerBound = true;
  }
  const node = document.createElement("div");
  node.id = "areloria-guild-panel";
  node.style.cssText = [
    "position:fixed",
    "right:12px",
    "top:116px",
    "width:min(320px,calc(100vw - 24px))",
    "max-height:70vh",
    "overflow:auto",
    "background:rgba(12,14,20,0.88)",
    "color:#f4f6ff",
    "border:1px solid rgba(120,140,255,0.35)",
    "border-radius:10px",
    "padding:12px 14px",
    "font:13px/1.45 system-ui,sans-serif",
    "z-index:12040",
    "box-shadow:0 12px 40px rgba(0,0,0,0.45)",
  ].join(";");
  document.body.appendChild(node);
  panelEl = node;
  render();
  return node;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render(): void {
  const root = panelEl;
  if (!root) return;
  const g = socialState.guild as {
    id?: string;
    name?: string;
    rank?: string;
    members?: string[];
  } | null;
  const roster = socialState.guildRoster || [];
  const rows = roster.length
    ? roster
        .map(
          (x) =>
            `<div style="display:flex;justify-content:space-between;gap:8px;margin:4px 0;">
              <span>${escapeHtml(x.name)}</span>
              <button type="button" data-join="${escapeHtml(x.id)}" style="cursor:pointer;padding:2px 8px;border-radius:6px;border:1px solid #6b7cff;background:#1a2038;color:#dbe0ff;">Join</button>
            </div>`,
        )
        .join("")
    : '<p style="opacity:0.75;margin:6px 0;">No public guild roster yet.</p>';

  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
      <strong style="letter-spacing:0.04em;">Guild</strong>
      <button id="gp-close" type="button" style="cursor:pointer;border:none;background:transparent;color:#aab4ff;">✕</button>
    </div>
    ${
      g
        ? `<p><strong>${escapeHtml(g.name || "Guild")}</strong><br/>
            <span style="opacity:0.8;">Rank: ${escapeHtml(g.rank || "member")}</span><br/>
            <span style="opacity:0.8;">Members: ${(g.members || []).length}</span></p>
            <button id="gp-leave" type="button" style="cursor:pointer;width:100%;padding:8px;border-radius:8px;border:1px solid #ff7b7b;background:#301818;color:#ffd6d6;">Leave guild</button>`
        : `<p style="opacity:0.85;">You are not in a guild. Create one or join from the list.</p>
           <label style="display:block;margin:8px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">New guild name</label>
           <input id="gp-name" type="text" maxlength="32" placeholder="e.g. Moonridge Vanguard" style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #3c4560;background:#0f1118;color:#eef1ff;" />
           <button id="gp-create" type="button" style="cursor:pointer;margin-top:10px;width:100%;padding:9px;border-radius:8px;border:1px solid #6bffc8;background:#103024;color:#d8fff0;">Create guild</button>`
    }
    <hr style="border:none;border-top:1px solid rgba(120,140,255,0.25);margin:12px 0;" />
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.14em;opacity:0.75;margin-bottom:6px;">Open guilds</div>
    ${rows}
  `;

  root.querySelector("#gp-close")?.addEventListener("click", () => hideGuildPanel());
  root.querySelector("#gp-create")?.addEventListener("click", () => {
    const inp = root.querySelector("#gp-name") as HTMLInputElement | null;
    const name = inp?.value?.trim() ?? "";
    if (name.length >= 2) sendGuildCreate(name);
  });
  root.querySelector("#gp-leave")?.addEventListener("click", () => sendGuildLeave());
  root.querySelectorAll("button[data-join]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLButtonElement).dataset.join;
      if (id) sendGuildJoin(id);
    });
  });
}

export function renderGuildPanel(): void {
  ensurePanel();
}

export function hideGuildPanel(): void {
  if (panelEl) {
    panelEl.remove();
    panelEl = null;
  }
}
