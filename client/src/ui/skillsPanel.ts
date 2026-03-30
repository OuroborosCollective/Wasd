export function renderSkillsPanel() {
  let panel = document.getElementById('skills-panel');

  if (panel) {
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
    return;
  }

  panel = document.createElement("div");
  panel.id = "skills-panel";
  panel.className = "obsidian-relic panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Skills Panel");

  panel.style.position = "fixed";
  panel.style.left = "20px";
  panel.style.bottom = "80px";
  panel.style.width = "300px";
  panel.style.height = "250px";
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
  title.textContent = "Skills";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.className = "gold-text font-serif";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "X";
  closeBtn.className = "btn-gold";
  closeBtn.style.padding = "2px 8px";
  closeBtn.style.fontSize = "12px";
  closeBtn.setAttribute("aria-label", "Close Skills Panel");

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
  content.style.gap = "8px";
  content.style.overflowY = "auto";
  content.style.padding = "5px";

  const skillNames = ["Fireball", "Heal", "Dash", "Slash"];
  skillNames.forEach(name => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "10px";
    row.style.padding = "5px";
    row.style.background = "var(--surface-container-high)";
    row.style.border = "1px solid var(--outline-variant)";
    row.style.borderRadius = "4px";

    const icon = document.createElement("div");
    icon.className = "action-slot";
    icon.style.width = "32px";
    icon.style.height = "32px";

    const nameLabel = document.createElement("span");
    nameLabel.textContent = name;
    nameLabel.style.fontSize = "14px";
    nameLabel.style.color = "var(--on-surface)";

    row.appendChild(icon);
    row.appendChild(nameLabel);
    content.appendChild(row);
  });

  panel.appendChild(content);
  document.body.appendChild(panel);
}
