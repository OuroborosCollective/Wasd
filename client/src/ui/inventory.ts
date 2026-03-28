import { getMyPlayer, sendCommand } from "../networking/websocketClient";

export function renderInventory() {
  const player = getMyPlayer();
  if (!player) return;

  let panel = document.getElementById("inventory-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "inventory-panel";
    panel.className = "obsidian-relic panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "inv-title");
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

  let html = `<h2 id="inv-title" class="gold-text font-serif" style="margin-top:0; border-bottom: 1px solid var(--outline-variant); padding-bottom: 10px; text-transform: uppercase;">Inventory</h2>`;

  // Equipment
  html += `<div style="margin-bottom: 20px; border-bottom: 1px solid var(--outline-variant); padding-bottom: 15px;">
    <strong style="font-size: 1.1em; color: var(--on-surface-variant);">Equipped:</strong><br/>
    <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">`;

  const slots = ['head', 'chest', 'legs', 'feet', 'weapon'];
  let hasEquipped = false;

  slots.forEach(slot => {
    if (player.equipment && player.equipment[slot]) {
      hasEquipped = true;
      html += `
      <div style="background: var(--surface-container-low); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--outline-variant);">
        <span style="color: var(--on-surface); text-transform: capitalize;">${slot}: <span style="color: var(--primary-gold); font-weight: bold;">${player.equipment[slot].name}</span></span>
        <button class="inv-btn-unequip btn-gold" data-slot="${slot}" style="padding: 8px 12px; font-size: 12px;">Unequip</button>
      </div>`;
    }
  });

  if (!hasEquipped) {
     html += `<div style="color: var(--on-surface-variant); font-style: italic; font-size: 0.9em;">Nothing equipped.</div>`;
  }

  html += `</div></div>`;

  // Inventory
  html += `<strong style="font-size: 1.1em; color: var(--on-surface-variant);">Items:</strong>
    <ul style="list-style:none; padding:0; margin-top: 10px; overflow-y: auto; flex: 1;">`;

  const inventory = player.inventory || [];
  if (inventory.length === 0) {
    html += `<li style="color: var(--on-surface-variant); font-style: italic; text-align: center; margin-top: 20px;">Your bag is empty.</li>`;
  } else {
    inventory.forEach((item: any) => {
      const isEquippable = item.type === 'weapon' || item.type === 'head' || item.type === 'chest' || item.type === 'legs' || item.type === 'feet';
      html += `<li style="margin-bottom: 10px; background: var(--surface-container-low); border: 1px solid var(--outline-variant); padding: 12px; border-radius: 8px; display:flex; flex-direction: column; gap: 10px;">
        <div style="font-weight: bold; color: var(--primary-gold);">${item.name} <span style="font-weight: normal; color: var(--on-surface-variant); font-size: 0.8em; text-transform: capitalize;">(${item.type})</span></div>
        <div style="display: flex; gap: 10px;">
          ${isEquippable ? `<button class="inv-btn-equip btn-gold" data-id="${item.id}" style="flex: 1; padding: 12px;">Equip</button>` : ''}
          <button class="inv-btn-drop" data-id="${item.id}" style="flex: 1; padding: 12px; background: #880000; color: #fff; border: 1px solid #ff4444; border-radius: 2px; font-weight: 800; text-transform: uppercase;">Drop</button>
        </div>
      </li>`;
    });
  }

  html += `</ul><button id="inv-btn-close" class="btn-gold" style="margin-top:20px; width: 100%; padding: 15px; font-size: 16px;">Close</button>`;

  panel.innerHTML = html;

  // Add event listeners using Event Delegation instead of inline onclick strings
  const unequipBtns = panel.querySelectorAll(".inv-btn-unequip");
  unequipBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const slot = (e.currentTarget as HTMLElement).getAttribute("data-slot");
      if (slot) sendCommand({ type: 'unequip', slot });
    });
  });

  const closeBtn = document.getElementById("inv-btn-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel) panel.remove();
    });
  }

  const equipBtns = panel.querySelectorAll(".inv-btn-equip");
  equipBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const itemId = (e.currentTarget as HTMLElement).getAttribute("data-id");
      if (itemId) sendCommand({ type: 'equip', itemId });
    });
  });

  const dropBtns = panel.querySelectorAll(".inv-btn-drop");
  dropBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const itemId = (e.currentTarget as HTMLElement).getAttribute("data-id");
      if (itemId) sendCommand({ type: 'drop', itemId });
    });
  });
}
