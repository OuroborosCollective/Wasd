import { initRenderer, setJoystickMoveCallback } from "./engine/renderer";
import { connectSocket, sendMessage, triggerAttack, triggerInteract } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";
import { renderAuthUI, renderLogoutBtn } from "./ui/auth";
import { toggleGMPanel } from "./ui/gmPanel";

// ── Mobile meta tags ─────────────────────────────────────────────────────────
const meta = document.createElement("meta");
meta.name = "viewport";
meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
document.head.appendChild(meta);

const appleMeta = document.createElement("meta");
appleMeta.name = "apple-mobile-web-app-capable";
appleMeta.content = "yes";
document.head.appendChild(appleMeta);

const themeMeta = document.createElement("meta");
themeMeta.name = "theme-color";
themeMeta.content = "#000000";
document.head.appendChild(themeMeta);

// ── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.createElement("canvas");
canvas.id = "game-canvas";
document.body.style.cssText = "margin:0;overflow:hidden;background:#000;touch-action:none;";
document.body.appendChild(canvas);

let gameInitialized = false;

renderAuthUI((displayName: string) => {
  if (!gameInitialized) {
    gameInitialized = true;

    // ── Mobile control callbacks ─────────────────────────────────────────────
    const mobileCallbacks = {
      onAttack: () => triggerAttack(),
      onInteract: () => triggerInteract(),
      onEquip: () => document.getElementById("btn-inventory")?.click(),
      onInventory: () => document.getElementById("btn-inventory")?.click(),
      onQuests: () => document.getElementById("btn-quests")?.click(),
      onSkills: () => document.getElementById("btn-skills")?.click(),
      onMap: () => document.getElementById("btn-map")?.click(),
      onChat: () => {
        const chatInput = document.getElementById("chat-input") as HTMLInputElement;
        if (chatInput) { chatInput.focus(); chatInput.scrollIntoView({ behavior: "smooth" }); }
      },
    };

    // ── Initialize renderer ──────────────────────────────────────────────────
    initRenderer(canvas, displayName, mobileCallbacks);

    // ── Connect WebSocket ────────────────────────────────────────────────────
    connectSocket(displayName);

    // ── Joystick → move_intent ───────────────────────────────────────────────
    setJoystickMoveCallback((dx: number, dy: number) => {
      const len = Math.hypot(dx, dy);
      if (len > 0.1) {
        sendMessage({ type: "move_intent", dx: dx / len, dy: dy / len });
      }
    });

    // ── HUD & Logout ─────────────────────────────────────────────────────────
    renderHUD();
    renderLogoutBtn();

    // ── GM Panel Button (top-left, only for admins) ──────────────────────────
    const gmBtn = document.createElement("button");
    gmBtn.id = "gm-toggle-btn";
    gmBtn.textContent = "⚙️ GM";
    gmBtn.title = "Open GM Panel (F1)";
    gmBtn.style.cssText = `
      position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.7); border: 1px solid rgba(100,180,255,0.4);
      color: #64b4ff; padding: 4px 12px; border-radius: 12px;
      font-size: 11px; font-weight: bold; cursor: pointer; z-index: 2000;
      letter-spacing: 1px; backdrop-filter: blur(4px);
      transition: background 0.2s;
    `;
    gmBtn.addEventListener("click", toggleGMPanel);
    gmBtn.addEventListener("mouseenter", () => { gmBtn.style.background = "rgba(100,180,255,0.15)"; });
    gmBtn.addEventListener("mouseleave", () => { gmBtn.style.background = "rgba(0,0,0,0.7)"; });
    document.body.appendChild(gmBtn);

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    window.addEventListener("keydown", (e) => {
      if (e.key === "F1") { e.preventDefault(); toggleGMPanel(); }
    });
  }
});
