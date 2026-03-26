import { getMyPlayer, sendCommand } from "../networking/websocketClient";

export function renderInventory() {
  const player = getMyPlayer();
  if (!player) return;

  let panel = document.getElementById("inventory-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "inventory-panel";
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

  let html = `<h2 style="margin-top:0; color: #00ff00; border-bottom: 1px solid #444; padding-bottom: 10px;">Inventory</h2>`;

  // Equipment
  html += `<div style="margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
    <strong style="font-size: 1.1em;">Equipped:</strong><br/>
    <div style="margin-top: 10px; background: #222; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
      <span>Weapon: ${player.equipment?.weapon ? player.equipment.weapon.name : 'None'}</span>
      ${player.equipment?.weapon ? `<button id="inv-btn-unequip-weapon" style="cursor:pointer; background:#ff4444; color:#fff; border:none; padding:8px 12px; border-radius:6px; font-weight: bold;">Unequip</button>` : ''}
    </div>
  </div>`;

  // Inventory
  html += `<strong style="font-size: 1.1em;">Items:</strong><ul style="list-style:none; padding:0; margin-top: 10px; max-height: 300px; overflow-y: auto;">`;

  const inventory = player.inventory || [];
  inventory.forEach((item: any) => {
    html += `<li style="margin-bottom: 10px; background: #222; padding: 12px; border-radius: 8px; display:flex; flex-direction: column; gap: 10px;">
      <div style="font-weight: bold;">${item.name} <span style="font-weight: normal; opacity: 0.6; font-size: 0.8em;">(${item.type})</span></div>
      <div style="display: flex; gap: 10px;">
        ${item.type === 'weapon' ? `<button class="inv-btn-equip" data-id="${item.id}" style="flex: 1; cursor:pointer; background:#008800; color:#fff; border:none; padding:10px; border-radius:6px; font-weight: bold;">Equip</button>` : ''}
        <button class="inv-btn-drop" data-id="${item.id}" style="flex: 1; cursor:pointer; background:#880000; color:#fff; border:none; padding:10px; border-radius:6px; font-weight: bold;">Drop</button>
      </div>
    </li>`;
  });
  html += `</ul><button id="inv-btn-close" style="margin-top:20px; cursor:pointer; width: 100%; padding: 15px; background: #444; color: white; border: none; border-radius: 8px; font-weight: bold;">Close</button>`;

  panel.innerHTML = html;

  // Add event listeners using Event Delegation instead of inline onclick strings
  const unequipBtn = document.getElementById("inv-btn-unequip-weapon");
  if (unequipBtn) {
    unequipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sendCommand({ type: 'unequip', slot: 'weapon' });
    });
  }

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
