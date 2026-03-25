import { sendDialogueChoice, sendChatMessage } from "../networking/websocketClient";
import { toggleAdminAssetPanel } from "./adminAssetPanel";

export function renderHUD() {
  const hud = document.createElement("div");
  hud.id = "main-hud";
  hud.style.position = "fixed";
  hud.style.top = "10px";
  hud.style.left = "10px";
  hud.style.padding = "15px";
  hud.style.background = "rgba(0,0,0,0.85)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "sans-serif";
  hud.style.borderRadius = "12px";
  hud.style.display = "flex";
  hud.style.flexDirection = "column";
  hud.style.gap = "8px";
  hud.style.width = "auto";
  hud.style.maxWidth = "300px";
  hud.style.border = "2px solid rgba(0,255,0,0.3)";
  hud.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
  hud.style.zIndex = "1000";
  
  hud.innerHTML = `
    <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 6px; margin-bottom: 4px; color: #00ff00; font-size: 1.1em;">Areloria Alpha</div>
    <div id="hud-time" style="font-size: 0.9em; color: #ffff00; margin-bottom: 4px;">Time: 08:00</div>
    <div id="hud-stats" style="font-size: 1em; font-weight: bold;">
      Gold: 0 | XP: 0
    </div>
    <div id="hud-inventory" style="font-size: 0.9em; color: #ffcc00; margin-top: 4px;">
      Inv: Empty
    </div>
    <div id="hud-reputation" style="font-size: 0.9em; color: #ff99ff;">
      Rep: None
    </div>
    <div id="hud-equipment" style="font-size: 0.9em; color: #00ccff;">
      Equip: None
    </div>
    <div id="hud-quests" style="font-size: 0.9em; color: #aaa; font-style: italic; margin-top: 4px;">
      Active Quest: None
    </div>
    <div id="hud-cooldowns" style="font-size: 0.9em; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 10px;">
      <span id="cd-attack" style="color: #00ff00; opacity: 0.5; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">[F] Attack</span>
      <span id="cd-interact" style="color: #00ff00; opacity: 0.5; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">[E] Interact</span>
      <span id="cd-equip" style="color: #00ff00; opacity: 0.5; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">[G] Equip</span>
    </div>
    <div style="font-size: 0.8em; margin-top: 10px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
      WASD: Move | E: Interact | F: Attack | G: Equip | H: Unequip
    </div>
    <div id="chat-log" role="log" aria-live="polite" aria-atomic="false" style="margin-top: 10px; max-height: 120px; overflow-y: auto; font-size: 0.9em; display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px;"></div>
    <div style="margin-top: 8px; display: flex; gap: 6px;">
      <input type="text" id="chat-input" aria-label="Chat message input" placeholder="Type /build..." style="flex: 1; padding: 10px; background: #222; color: #fff; border: 1px solid #555; border-radius: 6px; font-size: 16px;" />
      <button id="chat-send" aria-label="Send chat message" style="padding: 10px 15px; background: #008800; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Send</button>
    </div>
    <button id="btn-admin-assets" style="margin-top: 12px; background: #444; color: white; border: 1px solid #666; padding: 12px; border-radius: 8px; cursor: pointer; display: none; font-weight: bold; width: 100%;">Admin Asset Manager</button>
  `;
  
  document.body.appendChild(hud);

  document.getElementById("btn-admin-assets")!.onclick = () => {
    toggleAdminAssetPanel();
  };

  const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  const chatSend = document.getElementById("chat-send") as HTMLButtonElement;

  const handleSend = () => {
    const text = chatInput.value.trim();
    if (text) {
      sendChatMessage(text);
      chatInput.value = "";
    }
  };

  chatSend.onclick = handleSend;
  chatInput.onkeydown = (e) => {
    if (e.key === "Enter") handleSend();
    e.stopPropagation(); // Prevent WASD movement when typing
  };
}

export function addChatMessage(source: string, text: string) {
  const chatLog = document.getElementById("chat-log");
  if (!chatLog) return;
  
  const msgEl = document.createElement("div");
  msgEl.style.wordBreak = "break-word";

  const sourceSpan = document.createElement("span");
  sourceSpan.style.color = "#00ccff";
  sourceSpan.style.fontWeight = "bold";
  sourceSpan.textContent = source + ":";

  const textNode = document.createTextNode(" " + text);

  msgEl.appendChild(sourceSpan);
  msgEl.appendChild(textNode);
  
  chatLog.appendChild(msgEl);
  chatLog.scrollTop = chatLog.scrollHeight;
}

export function updateHUD(data: { role?: string, gold: number, xp: number, quests: any[], inventory: any[], equipment?: any, reputation?: any, questStatus?: any[], worldTime?: string }) {
  const btnAdmin = document.getElementById("btn-admin-assets");
  if (btnAdmin && data.role === "admin") {
    btnAdmin.style.display = "block";
  }

  const timeEl = document.getElementById("hud-time");
  if (timeEl && data.worldTime) {
    timeEl.textContent = `Time: ${data.worldTime}`;
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
    dialogueBox.style.padding = "25px 35px";
    dialogueBox.style.borderRadius = "16px";
    dialogueBox.style.fontFamily = "sans-serif";
    dialogueBox.style.width = "90vw";
    dialogueBox.style.maxWidth = "600px";
    dialogueBox.style.textAlign = "left";
    dialogueBox.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
    dialogueBox.style.border = "2px solid rgba(0,255,0,0.2)";
    dialogueBox.style.zIndex = "2000";
    document.body.appendChild(dialogueBox);
  }
  
  let html = `<div style="margin-bottom: 15px;"><strong style="color: #00ff00; font-size: 1.2em;">${source}:</strong> <span style="line-height: 1.5; font-size: 1.1em;">${text}</span></div>`;
  
  if (choices && choices.length > 0 && npcId) {
    html += `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">`;
    choices.forEach((choice, index) => {
      html += `
        <button 
          class="dialogue-choice-btn" 
          data-npc-id="${npcId}" 
          data-node-id="${choice.nextNodeId}"
          data-choice-id="${choice.id}"
          style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 15px 20px; border-radius: 10px; cursor: pointer; text-align: left; transition: all 0.2s; font-size: 1.1em;"
          onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='#00ff00';"
          onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(255,255,255,0.3)';"
        >
          ${index + 1}. ${choice.text}
        </button>
      `;
    });
    html += `</div>`;
  } else {
    html += `<div style="font-size: 0.9em; opacity: 0.6; margin-top: 15px; text-align: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">(Tap here or press E to continue)</div>`;
  }
  
  dialogueBox.innerHTML = html;
  
  // Add click listener to the whole box for "continue" if no choices
  if (!choices || choices.length === 0) {
    dialogueBox.onclick = () => {
      if (dialogueBox && dialogueBox.parentNode) {
        dialogueBox.parentNode.removeChild(dialogueBox);
      }
    };
  } else {
    dialogueBox.onclick = null;
  }

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

  let html = `<h2 style="margin-top:0; color: #00ff00; border-bottom: 1px solid #444; padding-bottom: 10px;">Inventory</h2>`;
  
  // Equipment
  html += `<div style="margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 15px;">
    <strong style="font-size: 1.1em;">Equipped:</strong><br/>
    <div style="margin-top: 10px; background: #222; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
      <span>Weapon: ${player.equipment.weapon ? player.equipment.weapon.name : 'None'}</span>
      ${player.equipment.weapon ? `<button onclick="window.unequip('weapon')" style="cursor:pointer; background:#ff4444; color:#fff; border:none; padding:8px 12px; border-radius:6px; font-weight: bold;">Unequip</button>` : ''}
    </div>
  </div>`;

  // Inventory
  html += `<strong style="font-size: 1.1em;">Items:</strong><ul style="list-style:none; padding:0; margin-top: 10px; max-height: 300px; overflow-y: auto;">`;
  player.inventory.forEach((item: any) => {
    html += `<li style="margin-bottom: 10px; background: #222; padding: 12px; border-radius: 8px; display:flex; flex-direction: column; gap: 10px;">
      <div style="font-weight: bold;">${item.name} <span style="font-weight: normal; opacity: 0.6; font-size: 0.8em;">(${item.type})</span></div>
      <div style="display: flex; gap: 10px;">
        ${item.type === 'weapon' ? `<button onclick="window.equip('${item.id}')" style="flex: 1; cursor:pointer; background:#008800; color:#fff; border:none; padding:10px; border-radius:6px; font-weight: bold;">Equip</button>` : ''}
        <button onclick="window.drop('${item.id}')" style="flex: 1; cursor:pointer; background:#880000; color:#fff; border:none; padding:10px; border-radius:6px; font-weight: bold;">Drop</button>
      </div>
    </li>`;
  });
  html += `</ul><button onclick="document.getElementById('inventory-panel').remove()" style="margin-top:20px; cursor:pointer; width: 100%; padding: 15px; background: #444; color: white; border: none; border-radius: 8px; font-weight: bold;">Close</button>`;
  
  panel.innerHTML = html;

  // Define global actions for buttons
  (window as any).equip = (itemId: string) => ws.send(JSON.stringify({ type: 'equip', itemId }));
  (window as any).unequip = (slot: string) => ws.send(JSON.stringify({ type: 'unequip', slot }));
  (window as any).drop = (itemId: string) => ws.send(JSON.stringify({ type: 'drop', itemId }));
}
