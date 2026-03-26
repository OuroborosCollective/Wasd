import { getMyPlayer, sendCommand } from "../networking/websocketClient";

export function renderSkillsPanel() {
  const player = getMyPlayer();
  if (!player) return;

  let panel = document.getElementById("skills-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "skills-panel";
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

  let html = `<h2 style="margin-top:0; color: #00ff00; border-bottom: 1px solid #444; padding-bottom: 10px;">Skills</h2>`;

  html += `<ul style="list-style:none; padding:0; margin-top: 10px; max-height: 300px; overflow-y: auto;">`;

  const skills = player.skills || [];
  if (skills.length === 0) {
    html += `<li style="opacity: 0.7; text-align: center; margin-top: 20px;">No skills learned yet.</li>`;
  } else {
    skills.forEach((s: any) => {
      html += `<li style="margin-bottom: 10px; background: #222; padding: 12px; border-radius: 8px; display:flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: bold; color: #ffcc00;">${s.name || s.id} <span style="font-weight: normal; opacity: 0.6; font-size: 0.8em;">(Lvl ${s.level || 1})</span></div>
        ${s.description ? `<div style="font-size: 0.9em; opacity: 0.8;">${s.description}</div>` : ''}
      </li>`;
    });
  }

  html += `</ul><button id="skills-btn-close" style="margin-top:20px; cursor:pointer; width: 100%; padding: 15px; background: #444; color: white; border: none; border-radius: 8px; font-weight: bold;">Close</button>`;

  panel.innerHTML = html;

  const closeBtn = document.getElementById("skills-btn-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel) panel.remove();
    });
  }
}
