import { closeAllPanels } from "./panelManager";

export function renderInventory() {
  let panel = document.getElementById('inventory-panel');

  if (panel) {
    // Toggle visibility if it already exists
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
  panel.id = "inventory-panel";
  panel.className = "obsidian-relic panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Inventory");

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
  title.textContent = "Inventory";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.className = "gold-text font-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "X";
  closeBtn.className = "btn-gold";
  closeBtn.style.padding = "2px 8px";
  closeBtn.style.fontSize = "12px";
  closeBtn.setAttribute("aria-label", "Close Inventory");

  closeBtn.onclick = () => {
    panel!.style.display = "none";
  };

  // Close with Escape key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && panel!.style.display !== 'none') {
      panel!.style.display = 'none';
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Content (Placeholder grid)
  const content = document.createElement("div");
  content.style.flex = "1";
  content.style.display = "grid";
  content.style.gridTemplateColumns = "repeat(4, 1fr)";
  content.style.gap = "8px";
  content.style.overflowY = "auto";
  content.style.padding = "5px";

  for (let i = 0; i < 16; i++) {
    const slot = document.createElement("div");
    slot.className = "action-slot";
    slot.style.width = "100%";
    slot.style.height = "auto";
    slot.style.aspectRatio = "1";
    content.appendChild(slot);
  }

  panel.appendChild(content);
  document.body.appendChild(panel);
}
