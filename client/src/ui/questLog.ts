import { closeAllPanels } from "./panelManager";

export function renderQuestLog() {
  let panel = document.getElementById('questlog-panel');

  if (panel) {
    if (panel.style.display === 'none') {
      closeAllPanels();
      panel.style.display = 'flex';
    } else {
      panel.style.display = 'none';
    }
    return;
  }

  closeAllPanels();

  panel = document.createElement("div");
  panel.id = "questlog-panel";
  panel.className = "obsidian-relic panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Quest Log");

  panel.style.position = "fixed";
  panel.style.left = "50%";
  panel.style.top = "50%";
  panel.style.transform = "translate(-50%, -50%)";
  panel.style.width = "90vw";
  panel.style.maxWidth = "400px";
  panel.style.height = "80vh";
  panel.style.maxHeight = "600px";
  panel.style.zIndex = "1000";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";

  // Prevent event bubbling
  const stopEvents = (e: Event) => e.stopPropagation();
  ['touchstart', 'touchmove', 'mousedown', 'pointerdown', 'click'].forEach(evt => {
    panel!.addEventListener(evt, stopEvents, { passive: false });
  });

  // Header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "10px";
  header.style.borderBottom = "1px solid var(--outline-variant)";
  header.style.paddingBottom = "5px";

  const title = document.createElement("h2");
  title.textContent = "Quest Log";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.className = "gold-text font-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "X";
  closeBtn.className = "btn-gold";
  closeBtn.style.padding = "2px 8px";
  closeBtn.style.fontSize = "12px";
  closeBtn.setAttribute("aria-label", "Close Quest Log");

  closeBtn.onclick = () => {
    panel!.style.display = "none";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && panel!.style.display !== 'none') {
      panel!.style.display = 'none';
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Content (Placeholder list)
  const content = document.createElement("div");
  content.style.flex = "1";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "10px";
  content.style.overflowY = "auto";
  content.style.padding = "5px";

  const quests = [
    { name: "Slay the Goblins", objective: "0/10 Goblins Slain" },
    { name: "Gather Herbs", objective: "5/5 Herbs Gathered" },
    { name: "Talk to the Elder", objective: "In Progress" }
  ];

  quests.forEach(q => {
    const item = document.createElement("div");
    item.style.padding = "10px";
    item.style.background = "var(--surface-container-high)";
    item.style.border = "1px solid var(--outline-variant)";
    item.style.borderRadius = "4px";

    const qTitle = document.createElement("div");
    qTitle.textContent = q.name;
    qTitle.style.fontWeight = "bold";
    qTitle.style.fontSize = "14px";
    qTitle.style.color = "var(--primary-gold)";
    qTitle.style.marginBottom = "4px";

    const qObj = document.createElement("div");
    qObj.textContent = q.objective;
    qObj.style.fontSize = "12px";
    qObj.style.color = "var(--on-surface-variant)";

    item.appendChild(qTitle);
    item.appendChild(qObj);
    content.appendChild(item);
  });

  panel.appendChild(content);
  document.body.appendChild(panel);
}
