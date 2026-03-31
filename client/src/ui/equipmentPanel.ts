export function renderEquipmentPanel() {
  let panel = document.getElementById('equipment-panel');

  if (panel) {
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
    return;
  }

  panel = document.createElement("div");
  panel.id = "equipment-panel";
  panel.className = "obsidian-relic panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Equipment Panel");

  panel.style.position = "fixed";
  panel.style.right = "clamp(320px, 32vw, 420px)"; // Positioned next to inventory
  panel.style.top = "10%";
  panel.style.width = "clamp(250px, 20vw, 300px)";
  panel.style.height = "clamp(400px, 60vh, 600px)";
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
  title.textContent = "Equipment";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.className = "gold-text font-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "X";
  closeBtn.className = "btn-gold";
  closeBtn.style.padding = "2px 8px";
  closeBtn.style.fontSize = "12px";
  closeBtn.setAttribute("aria-label", "Close Equipment Panel");

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

  // Content
  const content = document.createElement("div");
  content.style.flex = "1";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.alignItems = "center";
  content.style.gap = "15px";
  content.style.overflowY = "auto";
  content.style.padding = "5px";

  const slots = [
    { name: "Head" },
    { name: "Chest" },
    { name: "Hands" },
    { name: "Legs" },
    { name: "Feet" },
    { name: "Main Hand" },
    { name: "Off Hand" }
  ];

  slots.forEach(slotData => {
    const slotContainer = document.createElement("div");
    slotContainer.style.display = "flex";
    slotContainer.style.flexDirection = "column";
    slotContainer.style.alignItems = "center";
    slotContainer.style.gap = "4px";

    const slotLabel = document.createElement("span");
    slotLabel.textContent = slotData.name;
    slotLabel.style.fontSize = "12px";
    slotLabel.style.color = "var(--on-surface-variant)";

    const slot = document.createElement("div");
    slot.className = "action-slot";
    slot.style.width = "48px";
    slot.style.height = "48px";

    slotContainer.appendChild(slotLabel);
    slotContainer.appendChild(slot);
    content.appendChild(slotContainer);
  });

  panel.appendChild(content);
  document.body.appendChild(panel);
}
