import { getMyPlayer, sendCommand } from "../networking/websocketClient";

export function renderQuestLog() {
  const player = getMyPlayer();
  if (!player) return;

  let panel = document.getElementById("quests-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "quests-panel";
    panel.className = "obsidian-relic panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "quests-title");
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

  let html = `<h2 id="quests-title" class="gold-text font-serif" style="margin-top:0; border-bottom: 1px solid var(--outline-variant); padding-bottom: 10px; text-transform: uppercase;">Quest Log</h2>`;

  html += `<ul style="list-style:none; padding:0; margin-top: 10px; overflow-y: auto; flex: 1;">`;

  const quests = player.questStatus || player.quests || [];
  if (quests.length === 0) {
    html += `<li style="color: var(--on-surface-variant); font-style: italic; text-align: center; margin-top: 20px;">No active quests.</li>`;
  } else {
    quests.forEach((q: any) => {
      let stateColor = 'var(--outline-variant)';
      if (q.state === 'active') stateColor = 'var(--primary-gold)';
      if (q.state === 'completed') stateColor = 'var(--on-surface-variant)';
      if (q.state === 'available') stateColor = '#ffff00';

      html += `<li style="margin-bottom: 10px; background: var(--surface-container-low); border: 1px solid var(--outline-variant); padding: 16px; border-radius: 8px; display:flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: bold; color: var(--on-surface); font-size: 16px;">${q.title || q.name || q.id} <span style="font-weight: bold; color: ${stateColor}; font-size: 0.8em; margin-left: 5px; text-transform: uppercase;">[${q.state || 'active'}]</span></div>
        ${q.description ? `<div style="font-size: 14px; color: var(--on-surface-variant); line-height: 1.4;">${q.description}</div>` : ''}
      </li>`;
    });
  }

  html += `</ul><button id="quests-btn-close" class="btn-gold" style="margin-top:20px; width: 100%; padding: 15px; font-size: 16px;">Close</button>`;

  panel.innerHTML = html;

  const closeBtn = document.getElementById("quests-btn-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel) panel.remove();
    });
  }
}
