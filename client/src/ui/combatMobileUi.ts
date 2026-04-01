/**
 * Mobile-first combat UX: nearby loot chips + death / respawn overlay.
 */

import { isMobile, setMobileCombatActionsEnabled } from "./mobileControls";
import { sendRespawn, sendPickupLoot } from "../networking/websocketClient";
import {
  getPlayerDead,
  getPlayerHealth,
  getPlayerMaxHealth,
  getRespawnAvailableAt,
  subscribePlayerState,
} from "../state/playerState";

const LOOT_INTERACT_MAX = 12;
const LOOT_CHIP_MAX_D2 = 14 * 14;

let lootStrip: HTMLDivElement | null = null;
let deathOverlay: HTMLDivElement | null = null;
let deathBtn: HTMLButtonElement | null = null;
let deathHint: HTMLSpanElement | null = null;
let lastEntities: import("../engine/bridge/EntityViewModel").EntityViewModel[] = [];
let localId: string | null = null;
let rafScheduled = false;
let deathTick: ReturnType<typeof setInterval> | null = null;

function ensureLootStrip() {
  if (lootStrip) return;
  lootStrip = document.createElement("div");
  lootStrip.id = "combat-loot-strip";
  lootStrip.setAttribute("aria-label", "Nearby loot");
  document.body.appendChild(lootStrip);
  injectStyles();
}

function ensureDeathOverlay() {
  if (deathOverlay) return;
  deathOverlay = document.createElement("div");
  deathOverlay.id = "combat-death-overlay";
  deathOverlay.style.cssText = [
    "display:none",
    "position:fixed",
    "inset:0",
    "z-index:12000",
    "background:rgba(8,6,14,0.88)",
    "align-items:center",
    "justify-content:center",
    "flex-direction:column",
    "padding:24px",
    "box-sizing:border-box",
  ].join(";");
  deathOverlay.innerHTML = `
    <div style="text-align:center;max-width:340px;font-family:system-ui,sans-serif;color:#e8eaf0;">
      <h2 style="margin:0 0 12px;font-size:1.35rem;">Defeated</h2>
      <p id="death-hint" style="margin:0 0 20px;font-size:0.95rem;line-height:1.45;opacity:0.9;">
        You can respawn at your last checkpoint.
      </p>
      <button id="death-respawn-btn" type="button"
        style="min-height:48px;min-width:220px;padding:14px 24px;font-size:1rem;font-weight:600;
        border-radius:12px;border:none;cursor:pointer;
        background:linear-gradient(180deg,#3a7bd5,#2a5599);color:#fff;
        box-shadow:0 4px 18px rgba(0,0,0,0.45);touch-action:manipulation;">
        Respawn
      </button>
    </div>
  `;
  document.body.appendChild(deathOverlay);
  deathBtn = deathOverlay.querySelector("#death-respawn-btn") as HTMLButtonElement;
  deathHint = deathOverlay.querySelector("#death-hint") as HTMLSpanElement;
  const onRespawn = () => sendRespawn();
  deathBtn.addEventListener("click", onRespawn);
  deathBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    onRespawn();
  });
}

function injectStyles() {
  if (document.getElementById("combat-mobile-ui-styles")) return;
  const s = document.createElement("style");
  s.id = "combat-mobile-ui-styles";
  s.textContent = `
    #combat-loot-strip {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 200px;
      z-index: 1100;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      pointer-events: auto;
      max-height: 120px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    @media (min-width: 901px) and (pointer: fine) {
      #combat-loot-strip { bottom: 100px; }
    }
    .loot-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      min-height: 44px;
      border-radius: 12px;
      background: rgba(20, 28, 48, 0.92);
      border: 1px solid rgba(120, 180, 255, 0.35);
      color: #e0e8ff;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      box-shadow: 0 2px 12px rgba(0,0,0,0.35);
    }
    .loot-chip:active { transform: scale(0.96); background: rgba(50, 80, 140, 0.95); }
    .loot-chip-gold { border-color: rgba(255, 200, 80, 0.5); }
  `;
  document.head.appendChild(s);
}

function pxPyFromEntity(e: import("../engine/bridge/EntityViewModel").EntityViewModel) {
  return { px: e.position.x, py: e.position.z };
}

function scheduleRefresh() {
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    refreshLootChips();
    refreshDeathUi();
  });
}

function refreshLootChips() {
  if (!lootStrip || !localId) return;
  const me = lastEntities.find((e) => e.id === localId);
  if (!me || getPlayerDead()) {
    lootStrip.replaceChildren();
    return;
  }
  const { px, py } = pxPyFromEntity(me);
  const loots = lastEntities
    .filter((e) => e.type === "loot")
    .map((e) => {
      const lx = e.position.x;
      const lz = e.position.z;
      const dx = lx - px;
      const dy = lz - py;
      return { e, d2: dx * dx + dy * dy };
    })
    .filter((x) => x.d2 <= LOOT_CHIP_MAX_D2)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, LOOT_INTERACT_MAX);

  lootStrip.replaceChildren();
  for (const { e } of loots) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "loot-chip" + (e.lootKind === "gold" ? " loot-chip-gold" : "");
    const label =
      e.lootKind === "gold" && typeof e.goldAmount === "number"
        ? `Gold ×${e.goldAmount}`
        : e.name || e.modelUrl || "Loot";
    chip.textContent = `Take: ${label}`;
    chip.addEventListener("click", () => sendPickupLoot(e.id));
    chip.addEventListener("touchend", (ev) => {
      ev.preventDefault();
      sendPickupLoot(e.id);
    });
    lootStrip.appendChild(chip);
  }
}

function refreshDeathUi() {
  ensureDeathOverlay();
  if (!deathOverlay || !deathBtn) return;
  const dead = getPlayerDead();
  deathOverlay.style.display = dead ? "flex" : "none";
  setMobileCombatActionsEnabled(!dead);
  if (dead) {
    if (!deathTick) {
      deathTick = setInterval(scheduleRefresh, 500);
    }
    const t = getRespawnAvailableAt();
    const now = Date.now();
    const left = Math.max(0, Math.ceil((t - now) / 1000));
    deathBtn.disabled = now < t;
    if (deathHint) {
      deathHint.textContent =
        left > 0
          ? `Respawn available in ${left}s…`
          : "Tap Respawn to return at your last checkpoint.";
    }
    deathBtn.textContent = left > 0 ? `Respawn (${left}s)` : "Respawn";
  } else if (deathTick) {
    clearInterval(deathTick);
    deathTick = null;
  }
}

/** Call on each entity_sync after core.syncEntities */
export function onEntitySyncForCombatUi(entities: import("../engine/bridge/EntityViewModel").EntityViewModel[]) {
  lastEntities = entities;
  scheduleRefresh();
}

export function setCombatUiLocalPlayerId(id: string | null) {
  localId = id;
  scheduleRefresh();
}

export function initCombatMobileUi() {
  ensureLootStrip();
  ensureDeathOverlay();
  injectStyles();
  subscribePlayerState(scheduleRefresh);
  if (!isMobile() && typeof window !== "undefined" && !window.matchMedia("(pointer:coarse)").matches) {
    lootStrip!.style.bottom = "88px";
  }
}
