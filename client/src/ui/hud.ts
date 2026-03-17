import { sendDialogueChoice } from "../networking/websocketClient";
import { toggleAdminAssetPanel } from "./adminAssetPanel";
import { toggleAssetPipelinePanel } from "./assetPipelinePanel";

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
  `;

  // Top-left panel
  const topLeft = document.createElement("div");
  topLeft.id = "hud-topleft";
  topLeft.className = "top-left-menu";
  topLeft.innerHTML = `
    <div style="background:rgba(0,0,0,0.8);border:1px solid rgba(255,215,0,0.4);border-radius:8px;padding:8px 14px;color:#ffd700;font-weight:bold;font-size:15px;letter-spacing:2px;">ARELORIA</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button id="btn-inventory" style="${btnStyle(\'#1a3a1a\'), \'#4CAF50\')}">Inv [I]</button>
      <button id="btn-quests" style="${btnStyle(\'#1a1a3a\'), \'#4488ff\')}">Quests [Q]</button>
      <button id="btn-skills" style="${btnStyle(\'#3a1a1a\'), \'#ff8844\')}">Skills [K]</button>
      <button id="btn-map" style="${btnStyle(\'#1a2a3a\'), \'#44aaff\')}">Map [M]</button>
    </div>
    <div class="hud-info-box">
      Weapon: <span id="hud-weapon-name" style="color:#fff;font-weight:bold;">None</span>
    </div>
    <div id="hud-active-quest" class="hud-info-box quest" style="display:none;">
      Quest: <span id="hud-quest-text">None</span>
    </div>
    <button id="btn-admin-assets" style="${btnStyle(\'#2a2a2a\'), \'#888\')}display:none;">Admin</button>
    <button id="btn-asset-pipeline" style="${btnStyle(\'#1a1a3a\'), \'#7af\')}display:none;">🧠 Assets</button>
  `;
  document.body.appendChild(topLeft);

  // Minimap (top right)
  const minimapContainer = document.createElement("div");
  minimapContainer.id = "hud-minimap";
  minimapContainer.className = "minimap-container";
  _minimapCanvas = document.createElement("canvas");
  _minimapCanvas.width = 150;
  _minimapCanvas.height = 150;
  _minimapCtx = _minimapCanvas.getContext("2d");
  minimapContainer.appendChild(_minimapCanvas);
  const compass = document.createElement("div");
  compass.className = "minimap-compass";
  compass.innerHTML = '<span style="position:absolute;top:2px;left:50%;transform:translateX(-50%)">N</span><span style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%)">S</span><span style="position:absolute;left:2px;top:50%;transform:translateY(-50%)">W</span><span style="position:absolute;right:2px;top:50%;transform:translateY(-50%)">E</span>';
  minimapContainer.appendChild(compass);
  document.body.appendChild(minimapContainer);

  // Chat box (bottom left)
  const chatBox = document.createElement("div");
  chatBox.id = "hud-chat";
  chatBox.className = "chat-container";
  chatBox.innerHTML = `
    <div id="chat-messages" class="chat-messages"></div>
    <div class="chat-input-row">
      <input id="chat-input" class="chat-input" type="text" aria-label="Chat message" placeholder="Enter to chat..." maxlength="200" />
      <button id="chat-send" class="chat-send">Send</button>
    </div>
  `;
  document.body.appendChild(chatBox);

  // Dialogue box
  const dialogueBox = document.createElement("div");
  dialogueBox.id = "dialogue-box";
  dialogueBox.style.cssText = "position:fixed;bottom:160px;left:50%;transform:translateX(-50%);background:rgba(10,10,20,0.95);border:1px solid rgba(100,150,255,0.4);border-radius:12px;padding:16px 20px;max-width:500px;min-width:300px;z-index:1500;display:none;font-family:'Segoe UI',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.5);";
  dialogueBox.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 id="dialogue-speaker" style="margin:0;color:#fff;"></h3><button aria-label="Close panel" onclick="document.getElementById(\'dialogue-box\').style.display=\'none\'" style="${closeBtnStyle()}">X</button></div><p id="dialogue-text" style="font-size:14px;color:#eee;margin-bottom:15px;line-height:1.5;"></p><div id="dialogue-choices" style="display:flex;flex-direction:column;gap:8px;"></div>`;
  document.body.appendChild(dialogueBox);

  // Inventory panel
  const invPanel = document.createElement("div");
  invPanel.id = "inventory-panel";
  invPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(100,150,255,0.4);border-radius:12px;padding:20px;min-width:360px;max-width:480px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  invPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#4488ff;">Inventory</h3><button aria-label="Close panel" onclick="document.getElementById(\'inventory-panel\').style.display=\'none\'" style="${closeBtnStyle()}">X</button></div><div id="inventory-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:10px;padding:10px;border:1px solid #333;border-radius:8px;min-height:120px;"></div><div style="margin-top:10px;font-size:12px;color:#aaa;">Click item to use/equip. Drag to reorder.</div>`;
  document.body.appendChild(invPanel);

  // Quest panel
  const questPanel = document.createElement("div");
  questPanel.id = "quest-panel";
  questPanel.style.cssText = "position:fixed;top:50%;right:20px;transform:translateY(-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(255,200,50,0.4);border-radius:12px;padding:20px;min-width:320px;max-width:400px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;max-height:70vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  questPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#ffc832;">Quest Log</h3><button aria-label="Close panel" onclick="document.getElementById(\'quest-panel\').style.display=\'none\'" style="${closeBtnStyle()}">X</button></div><div id="quest-list" style="display:flex;flex-direction:column;gap:10px;"></div>`;
  document.body.appendChild(questPanel);

  // Skills panel
  const skillsPanel = document.createElement("div");
  skillsPanel.id = "skills-panel";
  skillsPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(255,120,50,0.4);border-radius:12px;padding:20px;min-width:380px;max-width:520px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  skillsPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#ff8844;">Skills</h3><button aria-label="Close panel" onclick="document.getElementById(\'skills-panel\').style.display=\'none\'" style="${closeBtnStyle()}">X</button></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">`;
  document.body.appendChild(skillsPanel);

  // Map panel
  const mapPanel = document.createElement("div");
  mapPanel.id = "map-panel";
  mapPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(50,150,255,0.4);border-radius:12px;padding:20px;width:600px;height:500px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
mapPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="margin:0;color:#44aaff;">World Map - Areloria</h3><button aria-label="Close panel" onclick="document.getElementById(\'map-panel\').style.display=\'none\'" style="${closeBtnStyle()}">X</button></div><canvas id="world-map-canvas" width="560" height="400" style="border:1px solid #44aaff;"></canvas>`;  document.body.appendChild(mapPanel);

  // Event Listeners for buttons
  document.getElementById("btn-inventory")?.addEventListener("click", () => togglePanel("inventory-panel"));
  document.getElementById("btn-quests")?.addEventListener("click", () => togglePanel("quest-panel"));
  document.getElementById("btn-skills")?.addEventListener("click", () => togglePanel("skills-panel"));
  document.getElementById("btn-map")?.addEventListener("click", () => togglePanel("map-panel"));

  // Admin button visibility
  onAuthStateChanged(auth, (user) => {
    const adminBtn = document.getElementById("btn-admin-assets");
    const assetPipelineBtn = document.getElementById("btn-asset-pipeline");
    if (user && user.email && ["thosu87@gmail.com", "jules@google.com"].includes(user.email)) {
      if (adminBtn) adminBtn.style.display = "inline-block";
      if (assetPipelineBtn) assetPipelineBtn.style.display = "inline-block";
    } else {
      if (adminBtn) adminBtn.style.display = "none";
      if (assetPipelineBtn) assetPipelineBtn.style.display = "none";
    }
=======
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

// ─── Dialogue ────────────────────────────────────────────────────────────────
export function showDialogue(source: string, text: string, choices?: any[], npcId?: string) {
  const box = document.getElementById("dialogue-box");
  if (!box) return;
  box.style.display = "block";

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="color:#88aaff;font-weight:bold;font-size:13px;">${source}</div><button class="btn btn-close" aria-label="Close Dialogue" onclick="document.getElementById('dialogue-box').style.display='none'">X</button></div><div style="color:#ddd;font-size:13px;line-height:1.5;margin-bottom:12px;">${text}</div>`;

  if (choices && choices.length > 0) {
    html += `<div style="display:flex;flex-direction:column;gap:6px;">`;
    choices.forEach((choice: any, index: number) => {
      html += `<button class="dialogue-choice-btn" data-npc-id="${npcId || ""}" data-node-id="${choice.nextNodeId || choice.nodeId || ""}" data-choice-id="${choice.id}" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 12px;border-radius:6px;cursor:pointer;text-align:left;font-size:12px;font-family:'Segoe UI',sans-serif;" onmouseover="this.style.background='rgba(100,150,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">${index + 1}. ${choice.text}</button>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="font-size:11px;opacity:0.5;text-align:center;">(Press E or X to close)</div>`;
  }

  box.innerHTML = html;
  box.querySelectorAll(".dialogue-choice-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const t = e.currentTarget as HTMLButtonElement;
      sendDialogueChoice(t.getAttribute("data-npc-id") || "", t.getAttribute("data-node-id") || "", t.getAttribute("data-choice-id") || "");
    });
>>>>>>> 9e51ccd215b7939ff10eca1eb94f74863a0f0852
  });

  document.getElementById("btn-admin-assets")?.addEventListener("click", toggleAdminAssetPanel);
  document.getElementById("btn-asset-pipeline")?.addEventListener("click", toggleAssetPipelinePanel);

  // Chat functionality
  const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  const chatSendBtn = document.getElementById("chat-send") as HTMLButtonElement;
  const chatMessages = document.getElementById("chat-messages") as HTMLDivElement;

  chatSendBtn.onclick = () => {
    const text = chatInput.value.trim();
    if (text && _ws) {
      _ws.send(JSON.stringify({ type: "chat", message: text }));
      chatInput.value = "";
    }
  };

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      chatSendBtn.click();
    }
  });

  // Initial render of panels
  renderInventory();
  renderQuestLog();
  renderSkills();
  renderWorldMap();
}

export function updateHUD(player: any, worldState: any) {
  _myPlayer = player;
  document.getElementById("hud-hp-text")!.innerText = `${player.hp}/${player.maxHp}`;
  document.getElementById("hud-hp-bar")!.style.width = `${(player.hp / player.maxHp) * 100}%`;
  document.getElementById("hud-sp-text")!.innerText = `${player.sp}/${player.maxSp}`;
  document.getElementById("hud-sp-bar")!.style.width = `${(player.sp / player.maxSp) * 100}%`;
  document.getElementById("hud-mp-text")!.innerText = `${player.mp}/${player.maxMp}`;
  document.getElementById("hud-mp-bar")!.style.width = `${(player.mp / player.maxMp) * 100}%`;
  document.getElementById("hud-level")!.innerText = player.level;
  document.getElementById("hud-xp")!.innerText = player.xp;
  document.getElementById("hud-gold")!.innerText = player.gold;
  document.getElementById("hud-name")!.innerText = player.displayName;

  if (player.weapon) {
    document.getElementById("hud-weapon-name")!.innerText = player.weapon.name;
  } else {
    document.getElementById("hud-weapon-name")!.innerText = "None";
  }

  // Update active quest display
  const activeQuestDiv = document.getElementById("hud-active-quest");
  if (player.activeQuest && activeQuestDiv) {
    activeQuestDiv.style.display = "block";
    document.getElementById("hud-quest-text")!.innerText = player.activeQuest.name;
  } else if (activeQuestDiv) {
    activeQuestDiv.style.display = "none";
  }

  updateMinimap(worldState, player.id);
  renderInventory(player.inventory);
  renderQuestLog(player.quests);
  renderSkills(player.skills);
}

export function addChatMessage(message: string, type: "system" | "chat" | "error" = "chat") {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const msgEl = document.createElement("div");
  msgEl.style.wordWrap = "break-word";
  msgEl.style.maxWidth = "100%";

  if (type === "system") {
    msgEl.style.color = "#88aaff";
    msgEl.innerText = `[SYSTEM] ${message}`;
  } else if (type === "error") {
    msgEl.style.color = "#ff8888";
    msgEl.innerText = `[ERROR] ${message}`;
  } else {
    msgEl.style.color = "#ddd";
    msgEl.innerText = message;
  }

  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─── Inventory Panel ─────────────────────────────────────────────────────────
function renderInventory(inventory: any[] = []) {
  const panel = document.getElementById("inventory-panel");
  if (!panel) return;

  const grid = panel.querySelector("#inventory-grid") as HTMLDivElement;
  if (!grid) return;

  grid.innerHTML = ""; // Clear existing items
  if (inventory.length === 0) {
    grid.innerHTML = "<div style=\"color:#aaa;text-align:center;grid-column:1/-1;\">Inventory is empty.</div>";
    return;
  }

  inventory.forEach(item => {
    const itemEl = document.createElement("div");
    itemEl.style.cssText = `
      background:rgba(255,255,255,0.08);
      border:1px solid rgba(255,255,255,0.2);
      border-radius:6px;
      padding:5px;
      text-align:center;
      font-size:10px;
      color:#fff;
      cursor:pointer;
      position:relative;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      min-height:60px;
    `;
    itemEl.innerHTML = `
      <div style="font-weight:bold;margin-bottom:2px;">${item.name}</div>
      <div style="color:#aaa;">${item.type}</div>
      ${item.quantity > 1 ? `<div style="position:absolute;bottom:2px;right:4px;background:#333;padding:1px 4px;border-radius:3px;font-size:9px;">${item.quantity}</div>` : ''}
    `;
    itemEl.title = `${item.name} (${item.type})\nDamage: ${item.damage || 0}\nDefense: ${item.defense || 0}\nQuantity: ${item.quantity || 1}`;
    itemEl.onclick = () => {
      if (_ws) {
        _ws.send(JSON.stringify({ type: "useItem", itemId: item.id }));
      }
    };
    grid.appendChild(itemEl);
  });
}

// ─── Quest Log Panel ─────────────────────────────────────────────────────────
function renderQuestLog(quests: any[] = []) {
  const panel = document.getElementById("quest-panel");
  if (!panel) return;

  const list = panel.querySelector("#quest-list") as HTMLDivElement;
  if (!list) return;

  list.innerHTML = ""; // Clear existing quests

  if (quests.length === 0) {
    list.innerHTML = "<div style=\"color:#aaa;text-align:center;\">No active quests.</div>";
    return;
  }

  quests.forEach(quest => {
    const questEl = document.createElement("div");
    questEl.style.cssText = `
      background:rgba(255,255,255,0.08);
      border:1px solid rgba(255,255,255,0.2);
      border-radius:6px;
      padding:10px;
      color:#fff;
    `;
    questEl.innerHTML = `
      <div style="font-weight:bold;color:#ffc832;margin-bottom:5px;">${quest.name}</div>
      <div style="font-size:12px;color:#eee;margin-bottom:8px;">${quest.description}</div>
      <div style="font-size:11px;color:#88aaff;">Status: ${quest.status}</div>
    `;
    list.appendChild(questEl);
  });
}

// ─── Skills Panel ────────────────────────────────────────────────────────────
function renderSkills(skills: any = {}) {
  const panel = document.getElementById("skills-panel");
  if (!panel) return;

  const skillDefs = [
    ["mining", "Mine", "#8888ff"], ["woodcutting", "Wood", "#88ff88"], ["fishing", "Fish", "#44aaff"],
    ["combat", "Cmbat", "#ff4444"], ["magic", "Magic", "#8844ff"], ["archery", "Arch", "#ff88ff"],
    ["runecrafting", "RC", "#ff44ff"], ["agility", "Agi", "#44ffff"], ["herblore", "Herb", "#44cc44"],
    ["thieving", "Thv", "#884488"], ["slayer", "Slay", "#ff0000"], ["farming", "Farm", "#88aa44"],
    ["smithing", "Smith", "#ff8800"], ["fletching", "Fltch", "#88ff44"],
  ];
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#ff8844;">Skills</h3><button aria-label="Close panel" onclick="document.getElementById(\'skills-panel\').style.display=\'none\'" style="${closeBtnStyle()}">X</button></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">`;  for (const [skillId, label, color] of skillDefs) {
    const sd = skills[skillId] || { level: 1, xp: 0 };
    const level = sd.level || 1;
    const xp = sd.xp || 0;
    const nextXp = Math.floor(100 * Math.pow(1.15, level));
    const progress = Math.min(100, (xp / nextXp) * 100);
    html += `<div style="background:rgba(255,255,255,0.05);border:1px solid ${color}44;border-radius:8px;padding:8px;text-align:center;"><div style="font-size:10px;color:${color};font-weight:bold;text-transform:uppercase;">${label}</div><div style="font-size:18px;color:#fff;font-weight:bold;">${level}</div><div style="background:#333;border-radius:3px;height:4px;margin-top:4px;overflow:hidden;"><div style="width:${progress}%;height:100%;background:${color};border-radius:3px;"></div></div></div>`;
  }
  html += `</div>`;
  panel.innerHTML = html;
}

// ─── World Map ───────────────────────────────────────────────────────────────
function renderWorldMap() {
  const canvas = document.getElementById("world-map-canvas") as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0a1520";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = canvas.width / 700;
  const zones = [
    { name: "Areloria Town", x: 32, y: 32, w: 128, h: 128, color: "#1a4a1a" },
    { name: "Darkwood Forest", x: 200, y: 50, w: 150, h: 200, color: "#0a2a0a" },
    { name: "Crystal Caves", x: 400, y: 200, w: 100, h: 100, color: "#1a1a4a" },
    { name: "Bandit Outpost", x: 500, y: 500, w: 64, h: 64, color: "#4a1a1a" },
    { name: "Ancient Ruins", x: 300, y: 400, w: 80, h: 80, color: "#3a2a0a" },
  ];
  zones.forEach(z => {
    ctx.fillStyle = z.color;
    ctx.fillRect(z.x * scale, z.y * scale, z.w * scale, z.h * scale);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(z.x * scale, z.y * scale, z.w * scale, z.h * scale);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `${Math.max(8, 9 * scale)}px sans-serif`;
    ctx.fillText(z.name, (z.x + 4) * scale, (z.y + 14) * scale);
  });
  if (_myPlayer?.position) {
    const px = _myPlayer.position.x * scale;
    const py = _myPlayer.position.y * scale;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#00ff88";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
// ─── Minimap Update ──────────────────────────────────────────────────────────
export function updateMinimap(worldState: any, myPlayerId: string | null) {
  if (!_minimapCtx || !_minimapCanvas) return;
  const ctx = _minimapCtx;
  const w = _minimapCanvas.width;
  const h = _minimapCanvas.height;
  const range = 150;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0a1520";
  ctx.fillRect(0, 0, w, h);
  const myPlayer = worldState.players?.find((p: any) => p.id === myPlayerId);
  const cx = myPlayer?.position?.x || 0;
  const cy = myPlayer?.position?.y || 0;
  const toScreen = (wx: number, wy: number) => ({ x: (wx - cx) / range * w + w / 2, y: (wy - cy) / range * h + h / 2 });
  for (const npc of worldState.npcs || []) {
    const { x, y } = toScreen(npc.position.x, npc.position.y);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = npc.role === "monster" ? "#ff4444" : "#ffaa44";
    ctx.fill();
  }
  for (const p of worldState.players || []) {
    if (p.id === myPlayerId) continue;
    const { x, y } = toScreen(p.position.x, p.position.y);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#4488ff";
    ctx.fill();
  }
  for (const loot of worldState.loot || []) {
    const { x, y } = toScreen(loot.position.x, loot.position.y);
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd700";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#00ff88";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
