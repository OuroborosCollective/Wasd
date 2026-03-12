import { sendDialogueChoice } from "../networking/websocketClient";
import { toggleAdminAssetPanel } from "./adminAssetPanel";

export function renderHUD() {
  const hud = document.createElement("div");
  hud.id = "main-hud";
  hud.style.position = "fixed";
  hud.style.top = "15px";
  hud.style.left = "15px";
  hud.style.padding = "15px";
  hud.style.background = "rgba(10, 15, 10, 0.85)";
  hud.style.color = "#e0e0e0";
  hud.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  hud.style.borderRadius = "12px";
  hud.style.display = "flex";
  hud.style.flexDirection = "column";
  hud.style.gap = "8px";
  hud.style.minWidth = "220px";
  hud.style.border = "1px solid rgba(0, 255, 0, 0.3)";
  hud.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";
  hud.style.backdropFilter = "blur(4px)";
  
  hud.innerHTML = `
    <div style="font-weight: bold; border-bottom: 1px solid rgba(0, 255, 0, 0.2); padding-bottom: 6px; margin-bottom: 4px; color: #00ff00; letter-spacing: 1px; text-transform: uppercase; font-size: 0.9em;">Areloria Master</div>
    <div id="hud-world-state" style="font-size: 0.8em; color: #ff9900; margin-bottom: 5px; font-weight: bold;">
      Spring | Clear
    </div>
    <div id="hud-stats" style="font-size: 0.95em; color: #fff;">
      Gold: 0 | XP: 0
    </div>
    <div id="hud-matrix" style="font-size: 0.85em; color: #00ffff; display: flex; align-items: center; gap: 5px;">
      <span style="opacity: 0.7;">Energy:</span> <span id="val-matrix">0</span>
    </div>
    <div id="hud-brain" style="font-size: 0.8em; color: #ffffff; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="opacity: 0.6; margin-bottom: 2px;">World Brain:</div>
      <div id="val-brain-summary" style="font-weight: bold;">Balanced</div>
    </div>
    <div id="hud-dudenregister" style="font-size: 0.75em; color: #ffcc00; opacity: 0.8; margin-top: 4px; max-height: 60px; overflow: hidden; border-left: 2px solid #ffcc00; padding-left: 5px;">
      History: Initializing...
    </div>
    <div id="hud-inventory" style="font-size: 0.85em; color: #ffcc00; margin-top: 5px;">
      Inv: Empty
    </div>
    <div id="hud-reputation" style="font-size: 0.8em; color: #ff99ff;">
      Rep: None
    </div>
    <div id="hud-equipment" style="font-size: 0.8em; color: #00ccff;">
      Equip: None
    </div>
    <div id="hud-quests" style="font-size: 0.85em; color: #aaa; font-style: italic; max-height: 100px; overflow-y: auto; padding-right: 5px;">
      Quests: None
    </div>
    <div id="hud-cooldowns" style="font-size: 0.8em; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
      <span id="cd-attack" style="padding: 3px 8px; border-radius: 4px; background: rgba(0,0,0,0.3); color: #00ff00; opacity: 0.5;">[F] Attack</span>
      <span id="cd-interact" style="padding: 3px 8px; border-radius: 4px; background: rgba(0,0,0,0.3); color: #00ff00; opacity: 0.5;">[E] Interact</span>
      <span id="cd-equip" style="padding: 3px 8px; border-radius: 4px; background: rgba(0,0,0,0.3); color: #00ff00; opacity: 0.5;">[G] Equip</span>
    </div>
    <div style="font-size: 0.75em; margin-top: 10px; opacity: 0.5; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; text-align: center;">
      WASD: Move | I: Inventory
    </div>
    <button id="btn-admin-assets" style="margin-top: 10px; background: #333; color: #00ff00; border: 1px solid #00ff00; padding: 6px; cursor: pointer; border-radius: 4px; display: none; font-size: 0.8em;">Admin Palette</button>
  `;
  
  document.body.appendChild(hud);

  document.getElementById("btn-admin-assets")!.onclick = () => {
    toggleAdminAssetPanel();
  };
}

export function updateHUD(data: { role?: string, gold: number, xp: number, matrixEnergy?: number, quests: any[], inventory: any[], equipment?: any, reputation?: any, questStatus?: any[] }) {
  const btnAdmin = document.getElementById("btn-admin-assets");
  if (btnAdmin && data.role === "admin") {
    btnAdmin.style.display = "block";
  }

  const stats = document.getElementById("hud-stats");
  if (stats) {
    stats.textContent = `Gold: ${data.gold} | XP: ${data.xp}`;
  }

  const matrixVal = document.getElementById("val-matrix");
  if (matrixVal && data.matrixEnergy !== undefined) {
    matrixVal.textContent = data.matrixEnergy.toString();
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
    if (data.questStatus.length === 0) {
      questContainer.textContent = "Quests: None";
    } else {
      questContainer.innerHTML = `<strong>Quests:</strong><br/>` + data.questStatus.map((q: any) =>
        `<div style="color: ${q.state === 'active' ? '#00ff00' : q.state === 'completed' ? '#aaa' : q.state === 'available' ? '#ffff00' : '#ff4444'}; font-size: 0.9em; margin-top: 2px;">
          ${q.title} [${q.state}]
        </div>`
      ).join("");
    }
  }
}

export function updateBrainHUD(state: any) {
  const summaryEl = document.getElementById("val-brain-summary");
  const brainBox = document.getElementById("hud-brain");
  if (summaryEl && brainBox) {
    const anomalies = state.activeAnomalies.length > 0 ? `<div style="color: #ff4444; font-size: 0.85em; margin-top: 4px; font-weight: bold;">⚠️ ${state.activeAnomalies.join(", ")}</div>` : "";
    summaryEl.innerHTML = `${state.summary} (${(state.centerValue * 100).toFixed(1)}%)${anomalies}`;

    if (state.activeAnomalies.length > 0) {
      brainBox.style.borderColor = "#ff4444";
      brainBox.style.boxShadow = "inset 0 0 10px rgba(255,0,0,0.2)";
    } else {
      brainBox.style.borderColor = "rgba(255,255,255,0.1)";
      brainBox.style.boxShadow = "none";
    }
  }
}

export function updateCooldowns(cooldowns: { attack: number, interact: number, equip: number }) {
  const now = Date.now();
  
  const updateCd = (id: string, remaining: number) => {
    const el = document.getElementById(id);
    if (el) {
      if (remaining > 0) {
        el.style.opacity = "1";
        el.style.background = "rgba(255, 68, 68, 0.2)";
        el.textContent = `[${id.split("-")[1].toUpperCase().charAt(0)}] ${(remaining/1000).toFixed(1)}s`;
      } else {
        el.style.opacity = "0.6";
        el.style.background = "rgba(0,0,0,0.3)";
        const label = id === "cd-attack" ? "Attack" : id === "cd-interact" ? "Interact" : "Equip";
        const key = id === "cd-attack" ? "F" : id === "cd-interact" ? "E" : "G";
        el.textContent = `[${key}] ${label}`;
      }
    }
  };

  updateCd("cd-attack", Math.max(0, cooldowns.attack - now));
  updateCd("cd-interact", Math.max(0, cooldowns.interact - now));
  updateCd("cd-equip", Math.max(0, cooldowns.equip - now));
}

export function showFloatingText(text: string, x: number, y: number) {
  // Use engine's showFloatingText if possible, or this fallback
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
  
  div.animate([
    { transform: "translateY(0)", opacity: 1 },
    { transform: "translateY(-50px)", opacity: 0 }
  ], {
    duration: 1000,
    easing: "ease-out"
  }).onfinish = () => div.remove();
}

export function showDialogue(source: string, text: string, choices: any[] = [], npcId?: string) {
  let dialogueBox = document.getElementById("dialogue-box");
  if (!dialogueBox) {
    dialogueBox = document.createElement("div");
    dialogueBox.id = "dialogue-box";
    dialogueBox.style.position = "fixed";
    dialogueBox.style.bottom = "30px";
    dialogueBox.style.left = "50%";
    dialogueBox.style.transform = "translateX(-50%)";
    dialogueBox.style.background = "rgba(15, 20, 15, 0.95)";
    dialogueBox.style.color = "#fff";
    dialogueBox.style.padding = "25px 40px";
    dialogueBox.style.borderRadius = "16px";
    dialogueBox.style.fontFamily = "sans-serif";
    dialogueBox.style.minWidth = "450px";
    dialogueBox.style.maxWidth = "700px";
    dialogueBox.style.textAlign = "left";
    dialogueBox.style.boxShadow = "0 15px 40px rgba(0,0,0,0.8)";
    dialogueBox.style.border = "1px solid #00ff00";
    dialogueBox.style.zIndex = "1500";
    dialogueBox.style.backdropFilter = "blur(10px)";
    document.body.appendChild(dialogueBox);
  }
  
  let html = `<div style="margin-bottom: 15px;"><strong style="color: #00ff00; font-size: 1.2em; letter-spacing: 1px;">${source}</strong><br/><span style="line-height: 1.5; font-size: 1.05em; opacity: 0.9;">${text}</span></div>`;
  
  if (choices && choices.length > 0 && npcId) {
    html += `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px; border-top: 1px solid rgba(0,255,0,0.2); padding-top: 15px;">`;
    choices.forEach((choice, index) => {
      html += `
        <button 
          class="dialogue-choice-btn" 
          data-npc-id="${npcId}" 
          data-node-id="${choice.nextNodeId}"
          data-choice-id="${choice.id}"
          style="background: rgba(0, 255, 0, 0.05); border: 1px solid rgba(0, 255, 0, 0.3); color: #fff; padding: 10px 15px; border-radius: 8px; cursor: pointer; text-align: left; transition: all 0.2s; font-size: 1em;"
          onmouseover="this.style.background='rgba(0, 255, 0, 0.15)'; this.style.borderColor='#00ff00';"
          onmouseout="this.style.background='rgba(0, 255, 0, 0.05)'; this.style.borderColor='rgba(0, 255, 0, 0.3)';"
        >
          <span style="color: #00ff00; margin-right: 10px; font-weight: bold;">${index + 1}.</span> ${choice.text}
        </button>
      `;
    });
    html += `</div>`;
  } else {
    html += `<div style="font-size: 0.85em; opacity: 0.4; margin-top: 15px; text-align: center; font-style: italic;">(Press E to continue)</div>`;
  }
  
  dialogueBox.innerHTML = html;

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
    label.className = "world-label";
    document.body.appendChild(label);
  }
  
  let html = `<div style="color: white; font-size: 13px; text-shadow: 2px 2px 2px black; font-weight: bold; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${text}</div>`;
  if (type === 'npc' && healthPercent !== undefined) {
    const barColor = healthPercent > 0.6 ? "#00ff00" : healthPercent > 0.3 ? "#ffff00" : "#ff0000";
    html += `
      <div style="width: 44px; height: 6px; background: rgba(0,0,0,0.6); margin: 3px auto; border: 1px solid #000; border-radius: 2px; overflow: hidden;">
        <div style="width: ${Math.max(0, Math.min(100, healthPercent * 100))}%; height: 100%; background: ${barColor};"></div>
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
    panel.style.background = "rgba(10, 15, 10, 0.95)";
    panel.style.color = "#fff";
    panel.style.padding = "25px";
    panel.style.borderRadius = "16px";
    panel.style.border = "1px solid #00ff00";
    panel.style.zIndex = "2000";
    panel.style.minWidth = "350px";
    panel.style.boxShadow = "0 20px 60px rgba(0,0,0,0.9)";
    panel.style.backdropFilter = "blur(15px)";
    document.body.appendChild(panel);
  }

  let html = `<h2 style="margin-top:0; color: #00ff00; border-bottom: 1px solid rgba(0,255,0,0.2); padding-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-size: 1.2em;">Character Inventory</h2>`;
  
  html += `<div style="margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
    <strong style="color: #00ccff;">EQUIPPED</strong><br/>
    <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
      <span>Weapon: ${player.equipment.weapon ? `<span style="color: #fff; font-weight: bold;">${player.equipment.weapon.name}</span>` : '<span style="opacity: 0.5;">Empty</span>'}</span>
      ${player.equipment.weapon ? `<button onclick="window.unequip('weapon')" style="cursor:pointer; background:#444; color:#fff; border:1px solid #666; padding:4px 10px; border-radius:4px; font-size: 0.8em;">Unequip</button>` : ''}
    </div>
  </div>`;

  html += `<strong style="color: #ffcc00;">ITEMS</strong><ul style="list-style:none; padding:0; margin-top: 10px; max-height: 300px; overflow-y: auto;">`;
  if (player.inventory.length === 0) {
    html += `<li style="opacity: 0.5; font-style: italic; text-align: center; padding: 20px;">No items in inventory</li>`;
  }
  player.inventory.forEach((item: any) => {
    html += `<li style="margin-bottom: 8px; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items: center;">
      <div style="display: flex; flex-direction: column;">
        <span style="font-weight: bold;">${item.name}</span>
        <span style="font-size: 0.75em; opacity: 0.6;">${item.type}</span>
      </div>
      <div style="display: flex; gap: 5px;">
        ${item.type === 'weapon' ? `<button onclick="window.equip('${item.id}')" style="cursor:pointer; background:#008800; color:#fff; border:none; padding:5px 10px; border-radius:4px; font-size: 0.8em;">Equip</button>` : ''}
        <button onclick="window.drop('${item.id}')" style="cursor:pointer; background:#880000; color:#fff; border:none; padding:5px 10px; border-radius:4px; font-size: 0.8em;">Drop</button>
      </div>
    </li>`;
  });
  html += `</ul><div style="text-align: center; margin-top: 20px;"><button onclick="document.getElementById('inventory-panel').remove()" style="background: transparent; border: 1px solid #555; color: #aaa; padding: 8px 20px; border-radius: 6px; cursor: pointer;">Close Panel</button></div>`;
  
  panel.innerHTML = html;

  (window as any).equip = (itemId: string) => ws.send(JSON.stringify({ type: 'equip', itemId }));
  (window as any).unequip = (slot: string) => ws.send(JSON.stringify({ type: 'unequip', slot }));
  (window as any).drop = (itemId: string) => ws.send(JSON.stringify({ type: 'drop', itemId }));
}

export function updateDudenHUD(history: any[]) {
  const dudenEl = document.getElementById("hud-dudenregister");
  if (dudenEl) {
    if (history.length === 0) {
      dudenEl.textContent = "History: No entries yet.";
    } else {
      dudenEl.innerHTML = history.slice(0, 3).map(h => `<div>[${new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] ${h.detail}</div>`).join("");
    }
  }
}

export function updateWorldStateHUD(state: any) {
  const wsEl = document.getElementById("hud-world-state");
  if (wsEl && state) {
    wsEl.textContent = `${state.season.toUpperCase()} | ${state.weather.toUpperCase()}`;

    // Change color based on weather/season
    if (state.weather === 'storm' || state.weather === 'snow') wsEl.style.color = '#00ccff';
    else if (state.weather === 'heatwave') wsEl.style.color = '#ff4400';
    else wsEl.style.color = '#ff9900';
  }
}
