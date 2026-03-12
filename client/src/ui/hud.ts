import { sendDialogueChoice } from "../networking/websocketClient";
import { toggleAdminAssetPanel } from "./adminAssetPanel";

export function renderHUD() {
  const hud = document.createElement("div");
  hud.id = "main-hud";
  hud.style.position = "fixed";
  hud.style.top = "12px";
  hud.style.left = "12px";
  hud.style.padding = "12px";
  hud.style.background = "rgba(0,0,0,0.7)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  hud.style.borderRadius = "8px";
  hud.style.display = "flex";
  hud.style.flexDirection = "column";
  hud.style.gap = "6px";
  hud.style.minWidth = "200px";
  hud.style.border = "1px solid rgba(255,255,255,0.1)";
  
  hud.innerHTML = `
    <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px; margin-bottom: 4px; color: #00ff00;">Areloria Alpha</div>
    <div id="hud-stats" style="font-size: 0.9em;">
      Gold: 0 | XP: 0
    </div>
    <div id="hud-inventory" style="font-size: 0.8em; color: #ffcc00;">
      Inv: Empty
    </div>
    <div id="hud-reputation" style="font-size: 0.8em; color: #ff99ff;">
      Rep: None
    </div>
    <div id="hud-equipment" style="font-size: 0.8em; color: #00ccff;">
      Equip: None
    </div>
    <div id="hud-quests" style="font-size: 0.85em; color: #aaa; font-style: italic;">
      Active Quest: None
    </div>
    <div id="hud-cooldowns" style="font-size: 0.8em; margin-top: 4px; display: flex; gap: 8px;">
      <span id="cd-attack" style="color: #00ff00; opacity: 0.5;">[F] Attack</span>
      <span id="cd-interact" style="color: #00ff00; opacity: 0.5;">[E] Interact</span>
      <span id="cd-equip" style="color: #00ff00; opacity: 0.5;">[G] Equip</span>
    </div>
    <div style="font-size: 0.75em; margin-top: 6px; opacity: 0.6; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
      WASD: Move | E: Interact | F: Attack | G: Equip First | H: Unequip
    </div>
    <button id="btn-admin-assets" style="margin-top: 10px; background: #444; color: white; border: none; padding: 5px; cursor: pointer; display: none;">Admin Assets</button>
  `;
  
  document.body.appendChild(hud);

  document.getElementById("btn-admin-assets")!.onclick = () => {
    toggleAdminAssetPanel();
  };
}

export function updateHUD(data: { role?: string, gold: number, xp: number, quests: any[], inventory: any[], equipment?: any, reputation?: any, questStatus?: any[] }) {
  const btnAdmin = document.getElementById("btn-admin-assets");
  if (btnAdmin && data.role === "admin") {
    btnAdmin.style.display = "block";
  }

  const stats = document.getElementById("hud-stats");
  if (stats) {
    stats.textContent = `Gold: ${data.gold} | XP: ${data.xp}`;
  }

  const inv = document.getElementById("hud-inventory");
  if (inv) {
    const items = data.inventory.map(i => i.name).join(", ");
    inv.textContent = items ? `Inv: ${items}` : "Inv: Empty";
  }

  const rep = document.getElementById("hud-reputation");
  if (rep) {
    const repStr = data.reputation ? Object.entries(data.reputation).map(([k, v]) => `${k}: ${v}`).join(", ") : "None";
    rep.textContent = `Rep: ${repStr}`;
  }

  const equip = document.getElementById("hud-equipment");
  if (equip && data.equipment) {
    const weapon = data.equipment.weapon ? data.equipment.weapon.name : "None";
    equip.textContent = `Weapon: ${weapon}`;
  }
  
  const questContainer = document.getElementById("hud-quests");
  if (questContainer && data.questStatus) {
    questContainer.innerHTML = `<strong>Quests:</strong><br/>` + data.questStatus.map((q: any) => 
      `<div style="color: ${q.state === 'active' ? '#00ff00' : q.state === 'completed' ? '#aaa' : q.state === 'available' ? '#ffff00' : '#ff4444'}">
        ${q.title} [${q.state}]
      </div>`
    ).join("");
  }
}

export function updateCooldowns(cooldowns: { attack: number, interact: number, equip: number }) {
  const now = Date.now();
  
  const updateCd = (id: string, remaining: number) => {
    const el = document.getElementById(id);
    if (el) {
      if (remaining > 0) {
        el.style.opacity = "1";
        el.style.color = "#ff4444";
        el.style.fontWeight = "bold";
        // Show percentage or just dimmed
        const percent = Math.ceil((remaining / 1000) * 10) / 10;
        el.textContent = `[${id.split("-")[1].toUpperCase().charAt(0)}] ${remaining > 100 ? (remaining/1000).toFixed(1) + "s" : "..."}`;
      } else {
        el.style.opacity = "0.5";
        el.style.color = "#00ff00";
        el.style.fontWeight = "normal";
        const label = id === "cd-attack" ? "Attack" : id === "cd-interact" ? "Interact" : "Equip";
        const key = id === "cd-attack" ? "F" : id === "cd-interact" ? "E" : "G";
        el.textContent = `[${key}] ${label}`;
      }
    }
  };

  const attackRemaining = Math.max(0, cooldowns.attack - now);
  const interactRemaining = Math.max(0, cooldowns.interact - now);
  const equipRemaining = Math.max(0, cooldowns.equip - now);

  updateCd("cd-attack", attackRemaining);
  updateCd("cd-interact", interactRemaining);
  updateCd("cd-equip", equipRemaining);
}

export function showFloatingText(text: string, x: number, y: number) {
  const div = document.createElement("div");
  div.style.position = "fixed";
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.color = "#ff0000";
  div.style.fontWeight = "bold";
  div.style.fontSize = "20px";
  div.style.pointerEvents = "none";
  div.style.zIndex = "1001";
  div.textContent = text;
  document.body.appendChild(div);
  
  // Animate and remove
  div.animate([
    { transform: "translateY(0)", opacity: 1 },
    { transform: "translateY(-50px)", opacity: 0 }
  ], {
    duration: 1000,
    easing: "ease-out"
  }).onfinish = () => div.remove();
}

export function showTooltip(text: string) {
  let tooltip = document.getElementById("interaction-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "interaction-tooltip";
    tooltip.style.position = "fixed";
    tooltip.style.bottom = "100px";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.background = "rgba(0, 0, 0, 0.8)";
    tooltip.style.color = "#fff";
    tooltip.style.padding = "8px 16px";
    tooltip.style.borderRadius = "6px";
    tooltip.style.border = "1px solid #00ff00";
    tooltip.style.zIndex = "1000";
    tooltip.style.pointerEvents = "none";
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = text;
}

export function hideTooltip() {
  const tooltip = document.getElementById("interaction-tooltip");
  if (tooltip && tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
  }
}

export function showDialogue(source: string, text: string, choices: any[] = [], npcId?: string) {
  let dialogueBox = document.getElementById("dialogue-box");
  if (!dialogueBox) {
    dialogueBox = document.createElement("div");
    dialogueBox.id = "dialogue-box";
    dialogueBox.style.position = "fixed";
    dialogueBox.style.bottom = "20px";
    dialogueBox.style.left = "50%";
    dialogueBox.style.transform = "translateX(-50%)";
    dialogueBox.style.background = "rgba(0, 0, 0, 0.9)";
    dialogueBox.style.color = "#fff";
    dialogueBox.style.padding = "20px 30px";
    dialogueBox.style.borderRadius = "12px";
    dialogueBox.style.fontFamily = "sans-serif";
    dialogueBox.style.minWidth = "400px";
    dialogueBox.style.maxWidth = "600px";
    dialogueBox.style.textAlign = "left";
    dialogueBox.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
    dialogueBox.style.border = "1px solid rgba(255,255,255,0.1)";
    dialogueBox.style.zIndex = "1000";
    document.body.appendChild(dialogueBox);
  }
  
  let html = `<div style="margin-bottom: 12px;"><strong style="color: #00ff00; font-size: 1.1em;">${source}:</strong> <span style="line-height: 1.4;">${text}</span></div>`;
  
  if (choices && choices.length > 0 && npcId) {
    html += `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">`;
    choices.forEach((choice, index) => {
      html += `
        <button 
          class="dialogue-choice-btn" 
          data-npc-id="${npcId}" 
          data-node-id="${choice.nextNodeId}"
          data-choice-id="${choice.id}"
          style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 12px; border-radius: 6px; cursor: pointer; text-align: left; transition: all 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.15)'; this.style.borderColor='#00ff00';"
          onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.2)';"
        >
          ${index + 1}. ${choice.text}
        </button>
      `;
    });
    html += `</div>`;
  } else {
    html += `<div style="font-size: 0.8em; opacity: 0.5; margin-top: 12px; text-align: center;">(Press E to continue)</div>`;
  }
  
  dialogueBox.innerHTML = html;

  // Add event listeners to buttons
  const buttons = dialogueBox.querySelectorAll(".dialogue-choice-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const nid = target.getAttribute("data-npc-id");
      const node = target.getAttribute("data-node-id");
      const choiceId = target.getAttribute("data-choice-id");
      if (nid && node && choiceId) {
        (window as any).sendDialogueChoice(nid, node, choiceId);
      }
    });
  });
  
  // Auto-hide after 10 seconds if no choices
  if ((window as any).dialogueTimeout) {
    clearTimeout((window as any).dialogueTimeout);
  }
  
  if (!choices || choices.length === 0) {
    (window as any).dialogueTimeout = setTimeout(() => {
      if (dialogueBox && dialogueBox.parentNode) {
        dialogueBox.parentNode.removeChild(dialogueBox);
      }
    }, 5000);
  }
}

export function removeWorldLabel(id: string) {
  const label = document.getElementById(`label-${id}`);
  if (label) label.remove();
}

export function createWorldLabel(id: string, text: string, type: 'npc' | 'loot', healthPercent?: number) {
  let label = document.getElementById(`label-${id}`);
  if (!label) {
    label = document.createElement("div");
    label.id = `label-${id}`;
    label.style.position = "fixed";
    label.style.pointerEvents = "none";
    label.style.zIndex = "1000";
    label.style.textAlign = "center";
    document.body.appendChild(label);
  }
  
  let html = `<div style="color: white; font-size: 12px; text-shadow: 1px 1px 1px black; font-weight: bold;">${text}</div>`;
  if (type === 'npc' && healthPercent !== undefined) {
    html += `
      <div style="width: 40px; height: 6px; background: #333; margin: 2px auto; border: 1px solid #000;">
        <div style="width: ${Math.max(0, Math.min(100, healthPercent * 100))}%; height: 100%; background: #00ff00;"></div>
      </div>
    `;
  }
  label.innerHTML = html;
  return label;
}

export function renderInventoryPanel(player: any, ws: WebSocket) {
  let panel = document.getElementById("inventory-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "inventory-panel";
    panel.style.position = "fixed";
    panel.style.top = "50%";
    panel.style.left = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.background = "rgba(0, 0, 0, 0.9)";
    panel.style.color = "#fff";
    panel.style.padding = "20px";
    panel.style.borderRadius = "12px";
    panel.style.border = "1px solid #00ff00";
    panel.style.zIndex = "2000";
    panel.style.minWidth = "300px";
    document.body.appendChild(panel);
  }

  let html = `<h2 style="margin-top:0; color: #00ff00;">Inventory</h2>`;
  
  // Equipment
  html += `<div style="margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
    <strong>Equipped:</strong><br/>
    Weapon: ${player.equipment.weapon ? `${player.equipment.weapon.name} <button onclick="window.unequip('weapon')" style="cursor:pointer; background:#555; color:#fff; border:none; padding:2px 5px; border-radius:3px;">Unequip</button>` : 'None'}
  </div>`;

  // Inventory
  html += `<strong>Items:</strong><ul style="list-style:none; padding:0;">`;
  player.inventory.forEach((item: any) => {
    html += `<li style="margin-bottom: 5px; background: #222; padding: 5px; border-radius: 4px; display:flex; justify-content:space-between;">
      ${item.name} (${item.type})
      <div>
        ${item.type === 'weapon' ? `<button onclick="window.equip('${item.id}')" style="cursor:pointer; background:#008800; color:#fff; border:none; padding:2px 5px; border-radius:3px;">Equip</button>` : ''}
        <button onclick="window.drop('${item.id}')" style="cursor:pointer; background:#880000; color:#fff; border:none; padding:2px 5px; border-radius:3px;">Drop</button>
      </div>
    </li>`;
  });
  html += `</ul><button onclick="document.getElementById('inventory-panel').remove()" style="margin-top:10px; cursor:pointer;">Close</button>`;
  
  panel.innerHTML = html;

  // Define global actions for buttons
  (window as any).equip = (itemId: string) => ws.send(JSON.stringify({ type: 'equip', itemId }));
  (window as any).unequip = (slot: string) => ws.send(JSON.stringify({ type: 'unequip', slot }));
  (window as any).drop = (itemId: string) => ws.send(JSON.stringify({ type: 'drop', itemId }));
}
