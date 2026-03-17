import { initRenderer, setJoystickMoveCallback } from "./engine/renderer";
import { connectSocket, sendMessage, triggerAttack, triggerInteract } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";
import { renderAuthUI, renderLogoutBtn, getAuthToken } from "./ui/auth";
import { toggleGMPanel } from "./ui/gmPanel";
import { initShopPanel, toggleShop } from "./ui/shopPanel";
import { initGLBManager, toggleGLBManager } from "./ui/glbManager";
import { openCharacterEditor } from "./ui/characterEditor";

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
let currentPlayerId = "";
let currentPlayerName = "";

renderAuthUI((displayName: string, uid?: string) => {
  if (!gameInitialized) {
    gameInitialized = true;
    currentPlayerName = displayName;
    currentPlayerId = uid || displayName;
    
    // Update loading screen
    (window as any).loadingScreen?.setStatus('Connecting to server...');

    // ── Mobile control callbacks ─────────────────────────────────────────────
    const mobileCallbacks = {
      onAttack: () => triggerAttack(),
      onInteract: () => triggerInteract(),
      onEquip: () => document.getElementById("btn-inventory")?.click(),
      onInventory: () => document.getElementById("btn-inventory")?.click(),
      onQuests: () => document.getElementById("btn-quests")?.click(),
      onSkills: () => document.getElementById("btn-skills")?.click(),
      onMap: () => document.getElementById("btn-map")?.click(),
      onShop: () => toggleShop(),
      onGLB: () => toggleGLBManager(),
      onChat: () => {
        const chatInput = document.getElementById("chat-input") as HTMLInputElement;
        if (chatInput) { chatInput.focus(); chatInput.scrollIntoView({ behavior: "smooth" }); }
      },
    };

    // ── Initialize renderer ──────────────────────────────────────────────────
    (window as any).loadingScreen?.setStatus('Initializing renderer...');
    initRenderer(canvas, displayName, mobileCallbacks);

    // ── Connect WebSocket ────────────────────────────────────────────────────
    (window as any).loadingScreen?.setStatus('Connecting to game server...');
    connectSocket(displayName);
    
    // Hide loading screen after a short delay to ensure connection
    setTimeout(() => {
      (window as any).loadingScreen?.hide();
    }, 1000);

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

    // ── Initialize Shop & GLB Manager ────────────────────────────────────────
    initShopPanel(currentPlayerId, currentPlayerName);
    initGLBManager(currentPlayerId, currentPlayerName);

    // ── Character Editor: check if player has appearance saved ───────────────
    (async () => {
      try {
        const res = await fetch(`/api/character/${currentPlayerId}`);
        const data = await res.json();
        if (!data.appearance) {
          // First time: open character editor
          setTimeout(() => {
            openCharacterEditor(currentPlayerId, null, (appearance) => {
              // Update player name in game
              currentPlayerName = appearance.name;
              sendMessage({ type: "set_display_name", name: appearance.name });
              (window as any).showToast(`Willkommen, ${appearance.name}! Dein Abenteuer beginnt!`, "#f0d080");
            });
          }, 1500);
        }
      } catch {
        // Non-fatal: skip character editor on error
      }
    })();

    // ── Character Editor keyboard shortcut (F4) ───────────────────────────────
    // Added to keyboard shortcuts below

    // ── Top Navigation Bar ────────────────────────────────────────────────────
    const topBar = document.createElement("div");
    topBar.id = "top-nav-bar";
    topBar.style.cssText = `
      position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 6px; align-items: center;
      background: rgba(0,0,0,0.75); border: 1px solid rgba(100,180,255,0.3);
      border-radius: 20px; padding: 4px 10px;
      z-index: 2000; backdrop-filter: blur(6px);
    `;

    const navButtons = [
      { id: "gm-toggle-btn", icon: "⚙️", label: "GM", title: "GM Panel (F1)", action: () => toggleGMPanel(), color: "#64b4ff" },
      { id: "shop-toggle-btn", icon: "⚡", label: "Shop", title: "Matrix Shop (F2)", action: () => toggleShop(), color: "#ffaa00" },
      { id: "glb-toggle-btn", icon: "🎨", label: "3D", title: "GLB Manager (F3)", action: () => toggleGLBManager(), color: "#aa44ff" },
      { id: "char-editor-btn", icon: "👤", label: "Char", title: "Charakter Editor (F4)", action: () => openCharacterEditor(currentPlayerId, null, (app) => { sendMessage({ type: "set_display_name", name: app.name }); }), color: "#44ffaa" },
    ];

    navButtons.forEach(({ id, icon, label, title, action, color }) => {
      const btn = document.createElement("button");
      btn.id = id;
      btn.title = title;
      btn.innerHTML = `${icon} <span style="font-size:10px;">${label}</span>`;
      btn.style.cssText = `
        background: transparent; border: none;
        color: ${color}; padding: 4px 10px; border-radius: 12px;
        font-size: 13px; font-weight: bold; cursor: pointer;
        transition: background 0.2s; white-space: nowrap;
      `;
      btn.addEventListener("click", action);
      btn.addEventListener("mouseenter", () => { btn.style.background = `${color}22`; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; });
      topBar.appendChild(btn);
    });

    document.body.appendChild(topBar);

    // ── Matrix Energy Display in top bar ─────────────────────────────────────
    const energyDisplay = document.createElement("div");
    energyDisplay.id = "top-energy-display";
    energyDisplay.style.cssText = `
      color: #ffaa00; font-size: 11px; font-weight: bold;
      padding: 4px 8px; border-left: 1px solid rgba(255,170,0,0.3);
      margin-left: 4px;
    `;
    energyDisplay.innerHTML = `⚡ <span id="top-energy-amount">0</span>`;
    topBar.appendChild(energyDisplay);

    // Refresh energy display every 30 seconds
    const refreshEnergy = async () => {
      try {
        const res = await fetch("/api/player/balance", {
          headers: { "Authorization": `Bearer ${await getAuthToken()}` }
        });
        const data = await res.json();
        const el = document.getElementById("top-energy-amount");
        if (el) el.textContent = (data.matrixEnergy || 0).toLocaleString();
      } catch {}
    };
    refreshEnergy();
    setInterval(refreshEnergy, 30000);

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    window.addEventListener("keydown", (e) => {
      if (e.key === "F1") { e.preventDefault(); toggleGMPanel(); }
      if (e.key === "F2") { e.preventDefault(); toggleShop(); }
      if (e.key === "F3") { e.preventDefault(); toggleGLBManager(); }
      if (e.key === "F4") { e.preventDefault(); openCharacterEditor(currentPlayerId, null, (app) => { sendMessage({ type: "set_display_name", name: app.name }); }); }
      // L = claim land shortcut
      if (e.key === "l" || e.key === "L") {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;
        claimLandAtCurrentPosition();
      }
    });

    // ── Land claim shortcut ───────────────────────────────────────────────────
    async function claimLandAtCurrentPosition() {
      const pos = (window as any).__playerPosition || { x: 0, y: 0, z: 0 };
      const name = prompt("Name für dein Land:", `${currentPlayerName}'s Land`);
      if (!name) return;

      try {
        const res = await fetch("/api/land/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${await getAuthToken()}` },
          body: JSON.stringify({ x: pos.x, y: pos.z, name }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`✅ Land "${name}" beansprucht! (${data.costPaid} Matrix Energy)`, "#44ff44");
        } else {
          showToast(`❌ ${data.error}`, "#ff4444");
        }
      } catch {
        showToast("❌ Verbindungsfehler", "#ff4444");
      }
    }

    // ── Toast notification helper ─────────────────────────────────────────────
    (window as any).showToast = showToast;
    function showToast(msg: string, color = "#00d4ff", duration = 4000) {
      const toast = document.createElement("div");
      toast.style.cssText = `
        position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.9); border: 1px solid ${color};
        border-radius: 8px; padding: 12px 24px;
        color: ${color}; font-size: 14px; font-weight: bold;
        z-index: 99999; text-align: center; max-width: 80vw;
        animation: fadeInUp 0.3s ease;
        box-shadow: 0 0 20px ${color}44;
      `;
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.5s";
        setTimeout(() => toast.remove(), 500);
      }, duration);
    }

    // ── Expose player position for land system ────────────────────────────────
    (window as any).__playerPosition = { x: 0, y: 0, z: 0 };
  }
});
