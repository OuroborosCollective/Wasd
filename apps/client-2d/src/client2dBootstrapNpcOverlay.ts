import { loadClient2DBootstrap, type Client2DBootstrapNpc } from "./client2dBootstrap";

const TILE_W = 96;
const TILE_H = 48;
const OVERLAY_ID = "client2d-bootstrap-npc-overlay";
const STYLE_ID = "client2d-bootstrap-npc-overlay-style";

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    `#${OVERLAY_ID}{position:absolute;inset:0;pointer-events:none;z-index:28;overflow:hidden;}`,
    `.client2d-bootstrap-npc-marker{position:absolute;transform:translate(-50%,-100%);display:grid;place-items:center;gap:2px;min-width:88px;padding:3px 6px 5px;border:1px solid rgba(161,255,177,.48);border-radius:12px;background:linear-gradient(180deg,rgba(5,16,10,.86),rgba(2,6,4,.62));box-shadow:0 0 18px rgba(57,255,20,.16),inset 0 0 10px rgba(255,255,255,.06);color:#fff4cf;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;text-align:center;text-shadow:0 2px 4px #000;white-space:nowrap;}`,
    `.client2d-bootstrap-npc-dot{width:16px;height:16px;border-radius:50%;background:#d4ffd7;border:2px solid #39ff14;box-shadow:0 0 10px rgba(57,255,20,.36);}`,
    `.client2d-bootstrap-npc-marker[data-fixed="true"]{border-color:rgba(255,216,128,.7);box-shadow:0 0 20px rgba(255,184,78,.22),inset 0 0 10px rgba(255,255,255,.08);}`,
    `.client2d-bootstrap-npc-marker[data-role="merchant"] .client2d-bootstrap-npc-dot{background:#ffe7a8;border-color:#ffbe4d;}`,
    `.client2d-bootstrap-npc-marker[data-role="blacksmith"] .client2d-bootstrap-npc-dot{background:#d7dce2;border-color:#f6f7ff;}`,
    `.client2d-bootstrap-npc-name{font-size:10px;font-weight:800;letter-spacing:.02em;}`,
    `.client2d-bootstrap-npc-role{max-width:118px;overflow:hidden;text-overflow:ellipsis;font-size:8px;color:rgba(199,255,211,.82);text-transform:uppercase;}`,
  ].join("\n");
  document.head.appendChild(style);
}

function getWorldHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".az-shell") ?? document.querySelector<HTMLElement>("#root");
}

function ensureOverlay(): HTMLElement | null {
  const host = getWorldHost();
  if (!host) return null;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    host.appendChild(overlay);
  }
  return overlay;
}

function coord(npc: Client2DBootstrapNpc, axis: "x" | "z"): number {
  const value = axis === "x" ? npc.x ?? npc.gridX ?? 0 : npc.z ?? npc.gridZ ?? npc.y ?? 0;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function projectIso(x: number, z: number, width: number, height: number): { left: number; top: number } {
  return {
    left: width / 2 + (x - z) * (TILE_W / 2),
    top: height / 2 + (x + z) * (TILE_H / 2) - 28,
  };
}

function renderNpcMarker(overlay: HTMLElement, npc: Client2DBootstrapNpc, index: number): void {
  const p = projectIso(coord(npc, "x"), coord(npc, "z"), overlay.clientWidth || window.innerWidth, overlay.clientHeight || window.innerHeight);
  const marker = document.createElement("div");
  marker.className = "client2d-bootstrap-npc-marker";
  marker.dataset.id = String(npc.id ?? `server-npc-${index}`);
  marker.dataset.role = String(npc.role ?? "npc");
  marker.dataset.fixed = String(Boolean(npc.fixed || npc.permanent));
  marker.style.left = `${p.left}px`;
  marker.style.top = `${p.top}px`;

  const dot = document.createElement("span");
  dot.className = "client2d-bootstrap-npc-dot";
  const name = document.createElement("span");
  name.className = "client2d-bootstrap-npc-name";
  name.textContent = String(npc.displayName || npc.name || "NPC");
  const role = document.createElement("span");
  role.className = "client2d-bootstrap-npc-role";
  role.textContent = String(npc.currentAction || npc.role || "server npc");

  marker.append(dot, name, role);
  overlay.appendChild(marker);
}

async function renderBootstrapNpcOverlay(): Promise<void> {
  injectStyle();
  const overlay = ensureOverlay();
  if (!overlay) return;
  const bootstrap = await loadClient2DBootstrap();
  if (!bootstrap?.ok || bootstrap.contract !== "client2d-bootstrap-v1" || !Array.isArray(bootstrap.npcs)) return;
  overlay.replaceChildren();
  bootstrap.npcs.forEach((npc, index) => renderNpcMarker(overlay, npc, index));
  window.dispatchEvent(new CustomEvent("areloria:client2d-bootstrap-npcs", { detail: bootstrap }));
}

function scheduleRender(): void {
  window.setTimeout(() => void renderBootstrapNpcOverlay(), 800);
  window.setTimeout(() => void renderBootstrapNpcOverlay(), 2400);
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", scheduleRender, { once: true });
  window.addEventListener("resize", () => void renderBootstrapNpcOverlay());
  scheduleRender();
}
