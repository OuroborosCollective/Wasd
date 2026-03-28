import { getMyPlayer, sendCommand } from "../networking/websocketClient";

export function renderSkillsPanel() {
  const player = getMyPlayer();
  if (!player) return;

  let panel = document.getElementById("skills-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "skills-panel";
    panel.className = "obsidian-relic panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "skills-title");
    panel.style.position = "fixed";
    panel.style.top = "50%";
    panel.style.left = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.zIndex = "2000";
    panel.style.width = "90vw";
    panel.style.maxWidth = "400px";
    panel.style.maxHeight = "90vh";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    document.body.appendChild(panel);
  }

  // Prevent interactions from bubbling to the canvas
  const stopProp = (e: Event) => e.stopPropagation();
  panel.addEventListener('touchstart', stopProp, { passive: false });
  panel.addEventListener('touchmove', stopProp, { passive: false });
  panel.addEventListener('touchend', stopProp, { passive: false });
  panel.addEventListener('click', stopProp);
  panel.addEventListener('wheel', stopProp);

  let html = `<h2 id="skills-title" class="gold-text font-serif" style="margin-top:0; border-bottom: 1px solid var(--outline-variant); padding-bottom: 10px; text-transform: uppercase;">Skills</h2>`;

  html += `<ul style="list-style:none; padding:0; margin-top: 10px; overflow-y: auto; flex: 1;">`;

  const skills = player.skills || [];
  if (skills.length === 0) {
    html += `<li style="color: var(--on-surface-variant); font-style: italic; text-align: center; margin-top: 20px;">No skills learned yet.</li>`;
  } else {
    skills.forEach((s: any) => {
      html += `<li style="margin-bottom: 10px; background: var(--surface-container-low); border: 1px solid var(--outline-variant); padding: 16px; border-radius: 8px; display:flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: bold; color: var(--primary-gold); font-size: 16px;">${s.name || s.id} <span style="font-weight: normal; color: var(--on-surface-variant); font-size: 0.8em;">(Lvl ${s.level || 1})</span></div>
        ${s.description ? `<div style="font-size: 14px; color: var(--on-surface); line-height: 1.4;">${s.description}</div>` : ''}
      </li>`;
    });
  }

  html += `</ul><button id="skills-btn-close" class="btn-gold" style="margin-top:20px; width: 100%; padding: 15px; font-size: 16px;">Close</button>`;

  panel.innerHTML = html;

  const closeBtn = document.getElementById("skills-btn-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel) panel.remove();
    });
  }
}
