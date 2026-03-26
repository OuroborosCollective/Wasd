import { getMyPlayer, sendCommand } from "../networking/websocketClient";

export function renderMapPanel() {
  const player = getMyPlayer();
  if (!player) return;

  let panel = document.getElementById("map-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "map-panel";
    panel.style.position = "fixed";
    panel.style.top = "50%";
    panel.style.left = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.background = "rgba(0, 0, 0, 0.95)";
    panel.style.color = "#fff";
    panel.style.padding = "25px";
    panel.style.borderRadius = "16px";
    panel.style.border = "2px solid #00ff00";
    panel.style.zIndex = "2000";
    panel.style.width = "90vw";
    panel.style.maxWidth = "400px";
    panel.style.boxShadow = "0 10px 30px rgba(0,0,0,0.7)";
    document.body.appendChild(panel);
  }

  // Prevent interactions from bubbling to the canvas
  const stopProp = (e: Event) => e.stopPropagation();
  panel.addEventListener('touchstart', stopProp, { passive: false });
  panel.addEventListener('touchmove', stopProp, { passive: false });
  panel.addEventListener('touchend', stopProp, { passive: false });
  panel.addEventListener('click', stopProp);
  panel.addEventListener('wheel', stopProp);

  let html = `<h2 style="margin-top:0; color: #00ff00; border-bottom: 1px solid #444; padding-bottom: 10px;">World Map</h2>`;

  html += `<div style="text-align: center; margin: 20px 0;">`;
  html += `<div style="font-size: 1.2em; color: #00ccff; font-weight: bold; margin-bottom: 10px;">Current Location</div>`;
  html += `<div style="font-size: 1.5em; background: #222; padding: 15px; border-radius: 8px; border: 1px solid #555;">
             X: ${Math.floor(player.position?.x || 0)}, Y: ${Math.floor(player.position?.y || 0)}
           </div>`;
  html += `</div>`;

  html += `<div style="font-size: 0.9em; opacity: 0.7; text-align: center; margin-bottom: 20px;">(Full interactive map coming soon)</div>`;

  html += `<button id="map-btn-close" style="margin-top:20px; cursor:pointer; width: 100%; padding: 15px; background: #444; color: white; border: none; border-radius: 8px; font-weight: bold;">Close</button>`;

  panel.innerHTML = html;

  const closeBtn = document.getElementById("map-btn-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel) panel.remove();
    });
  }
}
