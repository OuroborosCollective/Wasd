import { sendDialogueChoice } from "../networking/websocketClient";
import { toggleAdminAssetPanel } from "./adminAssetPanel";
import { toggleAssetPipelinePanel } from "./assetPipelinePanel";

// ─── State ───────────────────────────────────────────────────────────────────
let _ws: WebSocket | null = null;
let _myPlayer: any = null;
let _minimapCanvas: HTMLCanvasElement | null = null;
let _minimapCtx: CanvasRenderingContext2D | null = null;

export function setHudWebSocket(ws: WebSocket) { _ws = ws; }

function btnStyle(bg: string, border: string) {
  return `background:${bg};border:1px solid ${border};border-radius:6px;padding:5px 10px;color:#fff;cursor:pointer;font-size:11px;font-family:'Segoe UI',sans-serif;`;
}
function closeBtnStyle() {
  return `background:rgba(200,50,50,0.3);border:1px solid rgba(200,50,50,0.5);border-radius:6px;padding:4px 10px;color:#fff;cursor:pointer;font-size:13px;`;
}
function togglePanel(id: string) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

// ─── Main HUD ─────────────────────────────────────────────────────────────────
export function renderHUD() {
  document.getElementById("main-hud")?.remove();

  // Tooltip
  const tooltip = document.createElement("div");
  tooltip.id = "world-tooltip";
  tooltip.style.cssText = "position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:6px 14px;border-radius:20px;font-family:sans-serif;font-size:13px;pointer-events:none;z-index:900;display:none;border:1px solid rgba(255,255,255,0.2);";
  document.body.appendChild(tooltip);

  // Stats bar (bottom center)
  const statsBar = document.createElement("div");
  statsBar.id = "hud-stats-bar";
  statsBar.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:16px;align-items:center;background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:10px 20px;z-index:800;font-family:'Segoe UI',sans-serif;min-width:520px;justify-content:center;";
  statsBar.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:4px;min-width:150px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#ccc;"><span>HP</span><span id="hud-hp-text">100/100</span></div>
      <div style="background:#333;border-radius:4px;height:10px;overflow:hidden;"><div id="hud-hp-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#c00,#f44);border-radius:4px;transition:width 0.3s;"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#ccc;"><span>SP</span><span id="hud-sp-text">100/100</span></div>
      <div style="background:#333;border-radius:4px;height:8px;overflow:hidden;"><div id="hud-sp-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#f80,#fc0);border-radius:4px;transition:width 0.3s;"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#ccc;"><span>MP</span><span id="hud-mp-text">25/25</span></div>
      <div style="background:#333;border-radius:4px;height:8px;overflow:hidden;"><div id="hud-mp-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#008,#44f);border-radius:4px;transition:width 0.3s;"></div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;min-width:120px;border-left:1px solid rgba(255,255,255,0.15);padding-left:16px;">
      <div style="font-size:13px;color:#ffd700;font-weight:bold;" id="hud-name">Adventurer</div>
      <div style="font-size:11px;color:#aaa;">Lv.<span id="hud-level">1</span> | XP:<span id="hud-xp">0</span></div>
      <div style="font-size:11px;color:#ffd700;">Gold: <span id="hud-gold">0</span></div>
    </div>
    <div style="display:flex;gap:8px;border-left:1px solid rgba(255,255,255,0.15);padding-left:16px;">
      <div id="cd-attack" style="padding:6px 10px;background:rgba(255,60,60,0.2);border:1px solid rgba(255,60,60,0.4);border-radius:6px;font-size:11px;color:#ff6666;text-align:center;min-width:50px;">[F]<br/>Atk</div>
      <div id="cd-interact" style="padding:6px 10px;background:rgba(60,255,60,0.2);border:1px solid rgba(60,255,60,0.4);border-radius:6px;font-size:11px;color:#66ff66;text-align:center;min-width:50px;">[E]<br/>Talk</div>
      <div id="cd-equip" style="padding:6px 10px;background:rgba(60,60,255,0.2);border:1px solid rgba(60,60,255,0.4);border-radius:6px;font-size:11px;color:#6666ff;text-align:center;min-width:50px;">[G]<br/>Equip</div>
    </div>
  `;
  document.body.appendChild(statsBar);

  // Top-left panel
  const topLeft = document.createElement("div");
  topLeft.id = "hud-topleft";
  topLeft.style.cssText = "position:fixed;top:12px;left:12px;z-index:800;display:flex;flex-direction:column;gap:6px;font-family:'Segoe UI',sans-serif;";
  topLeft.innerHTML = `
    <div style="background:rgba(0,0,0,0.8);border:1px solid rgba(255,215,0,0.4);border-radius:8px;padding:8px 14px;color:#ffd700;font-weight:bold;font-size:15px;letter-spacing:2px;">ARELORIA</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button id="btn-inventory" style="${btnStyle("#1a3a1a", "#4CAF50")}">Inv [I]</button>
      <button id="btn-quests" style="${btnStyle("#1a1a3a", "#4488ff")}">Quests [Q]</button>
      <button id="btn-skills" style="${btnStyle("#3a1a1a", "#ff8844")}">Skills [K]</button>
      <button id="btn-map" style="${btnStyle("#1a2a3a", "#44aaff")}">Map [M]</button>
    </div>
    <div style="background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;font-size:11px;color:#aaa;">
      Weapon: <span id="hud-weapon-name" style="color:#fff;">None</span>
    </div>
    <div id="hud-active-quest" style="background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,0,0.2);border-radius:6px;padding:6px 10px;font-size:11px;color:#ffff88;display:none;">
      Quest: <span id="hud-quest-text">None</span>
    </div>
    <button id="btn-admin-assets" style="${btnStyle("#2a2a2a", "#888")}display:none;">Admin</button>
    <button id="btn-asset-pipeline" style="${btnStyle("#1a1a3a", "#7af")}display:none;">🧠 Assets</button>
  `;
  document.body.appendChild(topLeft);

  // Minimap (top right)
  const minimapContainer = document.createElement("div");
  minimapContainer.id = "hud-minimap";
  minimapContainer.style.cssText = "position:fixed;top:12px;right:12px;z-index:800;background:rgba(0,0,0,0.8);border:2px solid rgba(255,215,0,0.4);border-radius:50%;overflow:hidden;width:140px;height:140px;";
  _minimapCanvas = document.createElement("canvas");
  _minimapCanvas.width = 140;
  _minimapCanvas.height = 140;
  _minimapCtx = _minimapCanvas.getContext("2d");
  minimapContainer.appendChild(_minimapCanvas);
  const compass = document.createElement("div");
  compass.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;font-size:9px;color:rgba(255,215,0,0.7);font-family:sans-serif;";
  compass.innerHTML = '<span style="position:absolute;top:2px;left:50%;transform:translateX(-50%)">N</span><span style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%)">S</span><span style="position:absolute;left:2px;top:50%;transform:translateY(-50%)">W</span><span style="position:absolute;right:2px;top:50%;transform:translateY(-50%)">E</span>';
  minimapContainer.appendChild(compass);
  document.body.appendChild(minimapContainer);

  // Chat box (bottom left)
  const chatBox = document.createElement("div");
  chatBox.id = "hud-chat";
  chatBox.style.cssText = "position:fixed;bottom:100px;left:12px;z-index:800;width:300px;font-family:'Segoe UI',sans-serif;";
  chatBox.innerHTML = `
    <div id="chat-messages" role="log" aria-live="polite" style="background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.1);border-radius:8px 8px 0 0;padding:8px;height:110px;overflow-y:auto;font-size:12px;color:#ddd;display:flex;flex-direction:column;gap:2px;"></div>
    <div style="display:flex;">
      <input id="chat-input" type="text" aria-label="Chat message" placeholder="Enter to chat..." maxlength="200" style="flex:1;background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.2);border-top:none;border-radius:0 0 0 8px;padding:6px 10px;color:#fff;font-size:12px;outline:none;"/>
      <button id="chat-send" style="background:rgba(60,120,60,0.8);border:1px solid rgba(60,200,60,0.4);border-top:none;border-radius:0 0 8px 0;padding:6px 10px;color:#fff;cursor:pointer;font-size:12px;">Send</button>
    </div>
  `;
  document.body.appendChild(chatBox);

  // Dialogue box
  const dialogueBox = document.createElement("div");
  dialogueBox.id = "dialogue-box";
  dialogueBox.style.cssText = "position:fixed;bottom:160px;left:50%;transform:translateX(-50%);background:rgba(10,10,20,0.95);border:1px solid rgba(100,150,255,0.4);border-radius:12px;padding:16px 20px;max-width:500px;min-width:300px;z-index:1500;display:none;font-family:'Segoe UI',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.5);";
  dialogueBox.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 id="dialogue-speaker" style="margin:0;color:#fff;"></h3><button aria-label="Close panel" onclick="document.getElementById("dialogue-box").style.display="none"" style="${closeBtnStyle()}">X</button></div><p id="dialogue-text" style="font-size:14px;color:#eee;margin-bottom:15px;line-height:1.5;"></p><div id="dialogue-choices" style="display:flex;flex-direction:column;gap:8px;"></div>`;
  document.body.appendChild(dialogueBox);

  // Inventory panel
  const invPanel = document.createElement("div");
  invPanel.id = "inventory-panel";
  invPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(100,150,255,0.4);border-radius:12px;padding:20px;min-width:360px;max-width:480px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  invPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#4488ff;">Inventory</h3><button aria-label="Close panel" onclick="document.getElementById("inventory-panel").style.display="none"" style="${closeBtnStyle()}">X</button></div><div id="inventory-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:10px;padding:10px;border:1px solid #333;border-radius:8px;min-height:120px;"></div><div style="margin-top:10px;font-size:12px;color:#aaa;">Click item to use/equip. Drag to reorder.</div>`;
  document.body.appendChild(invPanel);

  // Quest panel
  const questPanel = document.createElement("div");
  questPanel.id = "quest-panel";
  questPanel.style.cssText = "position:fixed;top:50%;right:20px;transform:translateY(-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(255,200,50,0.4);border-radius:12px;padding:20px;min-width:320px;max-width:400px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;max-height:70vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  questPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#ffc832;">Quest Log</h3><button aria-label="Close panel" onclick="document.getElementById("quest-panel").style.display="none"" style="${closeBtnStyle()}">X</button></div><div id="quest-list" style="display:flex;flex-direction:column;gap:10px;"></div>`;
  document.body.appendChild(questPanel);

  // Skills panel
  const skillsPanel = document.createElement("div");
  skillsPanel.id = "skills-panel";
  skillsPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(255,120,50,0.4);border-radius:12px;padding:20px;min-width:380px;max-width:520px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  skillsPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#ff8844;">Skills</h3><button aria-label="Close panel" onclick="document.getElementById("skills-panel").style.display="none"" style="${closeBtnStyle()}">X</button></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">`;
  document.body.appendChild(skillsPanel);

  // Map panel
  const mapPanel = document.createElement("div");
  mapPanel.id = "map-panel";
  mapPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(50,150,255,0.4);border-radius:12px;padding:20px;width:600px;height:500px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  mapPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="margin:0;color:#44aaff;">World Map - Areloria</h3><button aria-label="Close panel" onclick="document.getElementById("map-panel").style.display="none"" style="${closeBtnStyle()}">X</button></div><canvas id="world-map-canvas" width="560" height="400" style="border:1px solid #44aaff;"></canvas>`;
  document.body.appendChild(mapPanel);

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
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#ff8844;">Skills</h3><button aria-label="Close panel" onclick="document.getElementById("skills-panel").style.display="none"" style="${closeBtnStyle()}">X</button></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">`;
  for (const [skillId, label, color] of skillDefs) {
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


export function updateCooldowns(skillId: string, durationMs: number) {}
export function showDialogue(speaker: string, text: string, options?: any[]) {}
export function renderInventoryPanel(inventory: any[]) {}
export function createWorldLabel(id: string, text: string, color: string) { return document.createElement('div'); }
export function removeWorldLabel(id: string) {}
export function showFloatingText(text: string, x: number, y: number, color: string) {}
export function showTooltip(text: string) {}
export function hideTooltip() {}
