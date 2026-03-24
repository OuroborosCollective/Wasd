import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";
import { renderAuthUI, renderLogoutBtn } from "./ui/auth";

// Global error logger for debugging white screen
window.onerror = (msg, url, line, col, error) => {
  const errDiv = document.createElement("div");
  errDiv.style.position = "fixed";
  errDiv.style.top = "0";
  errDiv.style.left = "0";
  errDiv.style.width = "100%";
  errDiv.style.padding = "20px";
  errDiv.style.background = "red";
  errDiv.style.color = "white";
  errDiv.style.zIndex = "9999";
  errDiv.style.fontFamily = "monospace";
  errDiv.style.whiteSpace = "pre-wrap";
  errDiv.innerText = `CLIENT ERROR: ${msg}\nAt: ${url}:${line}:${col}\nStack: ${error?.stack}`;
  document.body.appendChild(errDiv);
};

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.style.backgroundColor = "#111"; // Set a dark background so we know if script started
document.body.appendChild(canvas);

console.log("Main script starting...");

let gameInitialized = false;

// ── Keyboard shortcuts ───────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Hide panels if they exist
    const panels = ["inventory-panel", "skills-panel", "quests-panel", "map-panel", "dialogue-box"];
    panels.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }
});

try {
  renderAuthUI((token) => {
    console.log("Auth UI callback triggered with token:", !!token);
    if (!gameInitialized) {
      gameInitialized = true;
      try {
        const callbacks = {
          onAttack: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true })),
          onInteract: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "e", bubbles: true })),
          onEquip: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "g", bubbles: true })),
          onInventory: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true })),
          onQuests: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true })),
          onSkills: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", bubbles: true })),
          onMap: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "m", bubbles: true })),
          onChat: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "t", bubbles: true }))
        };
        initRenderer(canvas, "Player", callbacks);
        connectSocket(token);
        renderHUD();
        renderLogoutBtn();
        console.log("Game systems initialized successfully");
      } catch (e: any) {
        console.error("Initialization error:", e);
        window.onerror?.(e.message, "", 0, 0, e);
      }
    }
  });
} catch (e: any) {
  console.error("Auth UI render error:", e);
  window.onerror?.(e.message, "", 0, 0, e);
}
