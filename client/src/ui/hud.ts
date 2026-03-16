import { sendDialogueChoice } from "../networking/websocketClient";
import { toggleAdminAssetPanel } from "./adminAssetPanel";

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
      <button id="btn-inventory" style="${btnStyle('#1a3a1a', '#4CAF50')}">Inv [I]</button>
      <button id="btn-quests" style="${btnStyle('#1a1a3a', '#4488ff')}">Quests [Q]</button>
      <button id="btn-skills" style="${btnStyle('#3a1a1a', '#ff8844')}">Skills [K]</button>
      <button id="btn-map" style="${btnStyle('#1a2a3a', '#44aaff')}">Map [M]</button>
    </div>
    <div style="background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;font-size:11px;color:#aaa;">
      Weapon: <span id="hud-weapon-name" style="color:#fff;">None</span>
    </div>
    <div id="hud-active-quest" style="background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,0,0.2);border-radius:6px;padding:6px 10px;font-size:11px;color:#ffff88;display:none;">
      Quest: <span id="hud-quest-text">None</span>
    </div>
    <button id="btn-admin-assets" style="${btnStyle('#2a2a2a', '#888')}display:none;">Admin</button>
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
    <div id="chat-messages" style="background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.1);border-radius:8px 8px 0 0;padding:8px;height:110px;overflow-y:auto;font-size:12px;color:#ddd;display:flex;flex-direction:column;gap:2px;"></div>
    <div style="display:flex;">
      <input id="chat-input" type="text" placeholder="Enter to chat..." maxlength="200" style="flex:1;background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.2);border-top:none;border-radius:0 0 0 8px;padding:6px 10px;color:#fff;font-size:12px;outline:none;"/>
      <button id="chat-send" style="background:rgba(60,120,60,0.8);border:1px solid rgba(60,200,60,0.4);border-top:none;border-radius:0 0 8px 0;padding:6px 10px;color:#fff;cursor:pointer;font-size:12px;">Send</button>
    </div>
  `;
  document.body.appendChild(chatBox);

  // Dialogue box
  const dialogueBox = document.createElement("div");
  dialogueBox.id = "dialogue-box";
  dialogueBox.style.cssText = "position:fixed;bottom:160px;left:50%;transform:translateX(-50%);background:rgba(10,10,20,0.95);border:1px solid rgba(100,150,255,0.4);border-radius:12px;padding:16px 20px;max-width:500px;min-width:300px;z-index:1500;display:none;font-family:'Segoe UI',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.5);";
  document.body.appendChild(dialogueBox);

  // Inventory panel
  const invPanel = document.createElement("div");
  invPanel.id = "inventory-panel";
  invPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(100,150,255,0.4);border-radius:12px;padding:20px;min-width:360px;max-width:480px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  document.body.appendChild(invPanel);

  // Quest panel
  const questPanel = document.createElement("div");
  questPanel.id = "quest-panel";
  questPanel.style.cssText = "position:fixed;top:50%;right:20px;transform:translateY(-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(255,200,50,0.4);border-radius:12px;padding:20px;min-width:320px;max-width:400px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;max-height:70vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  document.body.appendChild(questPanel);

  // Skills panel
  const skillsPanel = document.createElement("div");
  skillsPanel.id = "skills-panel";
  skillsPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(255,120,50,0.4);border-radius:12px;padding:20px;min-width:380px;max-width:520px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  document.body.appendChild(skillsPanel);

  // Map panel
  const mapPanel = document.createElement("div");
  mapPanel.id = "map-panel";
  mapPanel.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,20,0.97);border:1px solid rgba(50,150,255,0.4);border-radius:12px;padding:20px;width:600px;height:500px;z-index:2000;display:none;font-family:'Segoe UI',sans-serif;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  mapPanel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="margin:0;color:#44aaff;">World Map - Areloria</h3><button aria-label="Close Map" onclick="document.getElementById('map-panel').style.display='none'" style="${closeBtnStyle()}">X</button></div><canvas id="world-map-canvas" width="560" height="420" style="border:1px solid rgba(255,255,255,0.1);border-radius:8px;width:100%;"></canvas>`;
  document.body.appendChild(mapPanel);

  // Event listeners
  document.getElementById("btn-inventory")!.onclick = () => { togglePanel("inventory-panel"); renderInventoryPanelContent(); };
  document.getElementById("btn-quests")!.onclick = () => togglePanel("quest-panel");
  document.getElementById("btn-skills")!.onclick = () => { togglePanel("skills-panel"); renderSkillsPanel(); };
  document.getElementById("btn-map")!.onclick = () => { togglePanel("map-panel"); renderWorldMap(); };
  document.getElementById("btn-admin-assets")!.onclick = () => toggleAdminAssetPanel();

  const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  const doSendChat = () => {
    const text = chatInput.value.trim();
    if (!text || !_ws) return;
    _ws.send(JSON.stringify({ type: "chat", text, channel: "global" }));
    chatInput.value = "";
  };
  document.getElementById("chat-send")!.onclick = doSendChat;
  chatInput.onkeydown = (e) => { if (e.key === "Enter") doSendChat(); };

  window.addEventListener("keydown", (e) => {
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "i" || e.key === "I") { togglePanel("inventory-panel"); renderInventoryPanelContent(); }
    if (e.key === "q" || e.key === "Q") togglePanel("quest-panel");
    if (e.key === "k" || e.key === "K") { togglePanel("skills-panel"); renderSkillsPanel(); }
    if (e.key === "m" || e.key === "M") { togglePanel("map-panel"); renderWorldMap(); }
    if (e.key === "Escape") {
      ["inventory-panel","quest-panel","skills-panel","map-panel","dialogue-box"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
    }
    if (e.key === "Enter") chatInput.focus();
  });

  (window as any).sendDialogueChoice = (npcId: string, nodeId: string, choiceId: string) => sendDialogueChoice(npcId, nodeId, choiceId);
}

// ─── Update HUD ──────────────────────────────────────────────────────────────
export function updateHUD(data: {
  role?: string; gold?: number; xp?: number; level?: number;
  health?: number; maxHealth?: number; stamina?: number; maxStamina?: number;
  mana?: number; maxMana?: number; name?: string;
  quests?: any[]; inventory?: any[]; equipment?: any;
  reputation?: any; questStatus?: any[];
}) {
  _myPlayer = { ..._myPlayer, ...data };

  if (data.role === "admin") {
    const btn = document.getElementById("btn-admin-assets");
    if (btn) btn.style.display = "block";
  }

  if (data.health !== undefined && data.maxHealth !== undefined) {
    const pct = Math.max(0, Math.min(100, (data.health / data.maxHealth) * 100));
    const bar = document.getElementById("hud-hp-bar");
    const txt = document.getElementById("hud-hp-text");
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.style.background = pct > 60 ? "linear-gradient(90deg,#0a0,#0f0)" : pct > 30 ? "linear-gradient(90deg,#880,#ff0)" : "linear-gradient(90deg,#c00,#f44)";
    }
    if (txt) txt.textContent = `${Math.round(data.health)}/${data.maxHealth}`;
  }
  if (data.stamina !== undefined && data.maxStamina !== undefined) {
    const pct = Math.max(0, Math.min(100, (data.stamina / data.maxStamina) * 100));
    const bar = document.getElementById("hud-sp-bar");
    const txt = document.getElementById("hud-sp-text");
    if (bar) bar.style.width = `${pct}%`;
    if (txt) txt.textContent = `${Math.round(data.stamina)}/${data.maxStamina}`;
  }
  if (data.mana !== undefined && data.maxMana !== undefined) {
    const pct = Math.max(0, Math.min(100, (data.mana / data.maxMana) * 100));
    const bar = document.getElementById("hud-mp-bar");
    const txt = document.getElementById("hud-mp-text");
    if (bar) bar.style.width = `${pct}%`;
    if (txt) txt.textContent = `${Math.round(data.mana)}/${data.maxMana}`;
  }

  if (data.name) { const el = document.getElementById("hud-name"); if (el) el.textContent = data.name; }
  if (data.level !== undefined) { const el = document.getElementById("hud-level"); if (el) el.textContent = String(data.level); }
  if (data.xp !== undefined) { const el = document.getElementById("hud-xp"); if (el) el.textContent = String(data.xp); }
  if (data.gold !== undefined) { const el = document.getElementById("hud-gold"); if (el) el.textContent = String(data.gold); }

  if (data.equipment) {
    const el = document.getElementById("hud-weapon-name");
    if (el) el.textContent = data.equipment.weapon ? data.equipment.weapon.name : "None";
  }

  if (data.quests && data.quests.length > 0) {
    const active = data.quests.find((q: any) => !q.completed);
    const el = document.getElementById("hud-active-quest");
    const txt = document.getElementById("hud-quest-text");
    if (el && active) {
      el.style.display = "block";
      if (txt) txt.textContent = active.title || active.name || "Active Quest";
    }
  }

  if (data.questStatus && document.getElementById("quest-panel")?.style.display !== "none") {
    renderQuestPanelContent(data.questStatus);
  }
}

// ─── Cooldowns ───────────────────────────────────────────────────────────────
export function updateCooldowns(cooldowns: { attack: number; interact: number; equip: number }) {
  const now = Date.now();
  const updateCd = (id: string, remaining: number, label: string, key: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (remaining > 0) {
      el.style.opacity = "0.5";
      el.innerHTML = `[${key}]<br/>${(remaining / 1000).toFixed(1)}s`;
    } else {
      el.style.opacity = "1";
      el.innerHTML = `[${key}]<br/>${label}`;
    }
  };
  updateCd("cd-attack", Math.max(0, cooldowns.attack - now), "Atk", "F");
  updateCd("cd-interact", Math.max(0, cooldowns.interact - now), "Talk", "E");
  updateCd("cd-equip", Math.max(0, cooldowns.equip - now), "Equip", "G");
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
export function showTooltip(text: string) {
  const el = document.getElementById("world-tooltip");
  if (el) { el.textContent = text; el.style.display = "block"; }
}
export function hideTooltip() {
  const el = document.getElementById("world-tooltip");
  if (el) el.style.display = "none";
}

// ─── Floating Text ───────────────────────────────────────────────────────────
export function showFloatingText(text: string, x: number, y: number, color = "#ff4444") {
  const div = document.createElement("div");
  div.style.cssText = `position:fixed;left:${x}px;top:${y}px;color:${color};font-weight:bold;font-size:18px;pointer-events:none;z-index:1001;text-shadow:1px 1px 2px #000;font-family:'Segoe UI',sans-serif;`;
  div.textContent = text;
  document.body.appendChild(div);
  div.animate(
    [{ transform: "translateY(0) scale(1.2)", opacity: 1 }, { transform: "translateY(-60px) scale(0.8)", opacity: 0 }],
    { duration: 1200, easing: "ease-out" }
  ).onfinish = () => div.remove();
}

// ─── World Labels ────────────────────────────────────────────────────────────
export function removeWorldLabel(id: string) {
  document.getElementById(`label-${id}`)?.remove();
}

export function createWorldLabel(id: string, text: string, type: "npc" | "loot" | "player", healthPercent?: number) {
  let label = document.getElementById(`label-${id}`);
  if (!label) {
    label = document.createElement("div");
    label.id = `label-${id}`;
    label.style.cssText = "position:fixed;pointer-events:none;z-index:1000;text-align:center;transform:translate(-50%,-100%);";
    document.body.appendChild(label);
  }
  const nameColor = type === "loot" ? "#ffd700" : type === "player" ? "#00ff88" : "#ffffff";
  let html = `<div style="color:${nameColor};font-size:12px;text-shadow:1px 1px 2px #000;font-weight:bold;font-family:'Segoe UI',sans-serif;white-space:nowrap;">${text}</div>`;
  if (type === "npc" && healthPercent !== undefined) {
    const barColor = healthPercent > 0.6 ? "#00cc00" : healthPercent > 0.3 ? "#cccc00" : "#cc0000";
    html += `<div style="width:48px;height:5px;background:#333;margin:2px auto;border-radius:3px;overflow:hidden;"><div style="width:${Math.max(0, Math.min(100, healthPercent * 100))}%;height:100%;background:${barColor};border-radius:3px;"></div></div>`;
  }
  label.innerHTML = html;
  return label;
}

// ─── Dialogue ────────────────────────────────────────────────────────────────
export function showDialogue(source: string, text: string, choices?: any[], npcId?: string) {
  const box = document.getElementById("dialogue-box");
  if (!box) return;
  box.style.display = "block";

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="color:#88aaff;font-weight:bold;font-size:13px;">${source}</div><button aria-label="Close Dialogue" onclick="document.getElementById('dialogue-box').style.display='none'" style="${closeBtnStyle()}">X</button></div><div style="color:#ddd;font-size:13px;line-height:1.5;margin-bottom:12px;">${text}</div>`;

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
  });

  if ((window as any).dialogueTimeout) clearTimeout((window as any).dialogueTimeout);
  if (!choices || choices.length === 0) {
    (window as any).dialogueTimeout = setTimeout(() => { if (box) box.style.display = "none"; }, 6000);
  }
}

// ─── Chat ────────────────────────────────────────────────────────────────────
export function addChatMessage(sender: string, text: string, channel = "global") {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  const colors: Record<string, string> = { global: "#88ccff", local: "#aaffaa", system: "#ffaa44", combat: "#ff6666" };
  const line = document.createElement("div");
  line.style.cssText = `color:${colors[channel] || "#ddd"};word-break:break-word;`;
  const safeText = text.replace(/</g, "&lt;");
  const safeSender = sender.replace(/</g, "&lt;");
  line.innerHTML = `<span style="opacity:0.6;font-size:10px;">[${channel}]</span> <span style="font-weight:bold;">${safeSender}:</span> ${safeText}`;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

// ─── Inventory Panel ─────────────────────────────────────────────────────────
export function renderInventoryPanel(player: any, ws: WebSocket) {
  _ws = ws;
  _myPlayer = { ..._myPlayer, ...player };
  const panel = document.getElementById("inventory-panel");
  if (panel) panel.style.display = "block";
  renderInventoryPanelContent();
}

function renderInventoryPanelContent() {
  const panel = document.getElementById("inventory-panel");
  if (!panel || !_myPlayer) return;
  const player = _myPlayer;
  const rarityColors: Record<string, string> = { common: "#aaa", uncommon: "#1eff00", rare: "#0070dd", epic: "#a335ee", legendary: "#ff8000" };

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#88aaff;">Inventory</h3><button aria-label="Close Inventory" onclick="document.getElementById('inventory-panel').style.display='none'" style="${closeBtnStyle()}">X</button></div>`;
  html += `<div style="margin-bottom:14px;padding:10px;background:rgba(255,255,255,0.05);border-radius:8px;"><div style="font-size:12px;color:#aaa;margin-bottom:6px;font-weight:bold;">EQUIPPED</div><div style="display:flex;gap:8px;">`;
  html += `<div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:8px;min-width:100px;text-align:center;"><div style="font-size:10px;color:#888;">Weapon</div><div style="font-size:12px;color:#fff;margin-top:2px;">${player.equipment?.weapon ? player.equipment.weapon.name : "Empty"}</div>${player.equipment?.weapon ? `<button onclick="window._hudUnequip('weapon')" style="margin-top:4px;background:#440000;border:1px solid #ff4444;border-radius:4px;padding:2px 6px;color:#fff;cursor:pointer;font-size:10px;">Unequip</button>` : ""}</div>`;
  html += `<div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:8px;min-width:100px;text-align:center;"><div style="font-size:10px;color:#888;">Armor</div><div style="font-size:12px;color:#fff;margin-top:2px;">${player.equipment?.armor ? player.equipment.armor.name : "Empty"}</div>${player.equipment?.armor ? `<button onclick="window._hudUnequip('armor')" style="margin-top:4px;background:#440000;border:1px solid #ff4444;border-radius:4px;padding:2px 6px;color:#fff;cursor:pointer;font-size:10px;">Unequip</button>` : ""}</div>`;
  html += `</div></div><div style="font-size:12px;color:#aaa;margin-bottom:8px;font-weight:bold;">ITEMS (${(player.inventory || []).length})</div>`;

  if (!player.inventory || player.inventory.length === 0) {
    html += `<div style="text-align:center;opacity:0.4;padding:20px;font-size:13px;">Inventory is empty</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto;">`;
    player.inventory.forEach((item: any) => {
      const rColor = rarityColors[item.rarity || "common"] || "#aaa";
      html += `<div style="background:rgba(255,255,255,0.05);border:1px solid ${rColor}44;border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:12px;color:${rColor};font-weight:bold;">${item.name || item.id}</div><div style="font-size:10px;color:#888;">${item.type || "item"}${item.damage ? ` | Dmg:${item.damage}` : ""}${item.rarity ? ` | ${item.rarity}` : ""}</div></div><div style="display:flex;gap:4px;">${(item.type === "weapon" || item.type === "armor") ? `<button onclick="window._hudEquip('${item.id}')" style="background:#003300;border:1px solid #00aa00;border-radius:4px;padding:2px 6px;color:#fff;cursor:pointer;font-size:10px;">Equip</button>` : ""}${item.type === "consumable" ? `<button onclick="window._hudUse('${item.id}')" style="background:#002244;border:1px solid #0088ff;border-radius:4px;padding:2px 6px;color:#fff;cursor:pointer;font-size:10px;">Use</button>` : ""}<button onclick="window._hudDrop('${item.id}')" style="background:#330000;border:1px solid #aa0000;border-radius:4px;padding:2px 6px;color:#fff;cursor:pointer;font-size:10px;">Drop</button></div></div>`;
    });
    html += `</div>`;
  }
  html += `<div style="margin-top:12px;font-size:11px;color:#888;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">Gold: ${player.gold || 0} | XP: ${player.xp || 0} | Level: ${player.level || 1}</div>`;
  panel.innerHTML = html;

  (window as any)._hudEquip = (itemId: string) => { if (_ws) _ws.send(JSON.stringify({ type: "equip", itemId })); };
  (window as any)._hudUnequip = (slot: string) => { if (_ws) _ws.send(JSON.stringify({ type: "unequip", slot })); };
  (window as any)._hudDrop = (itemId: string) => { if (_ws) _ws.send(JSON.stringify({ type: "drop", itemId })); };
  (window as any)._hudUse = (itemId: string) => { if (_ws) _ws.send(JSON.stringify({ type: "use_item", itemId })); };
}

// ─── Quest Panel ─────────────────────────────────────────────────────────────
function renderQuestPanelContent(questStatus: any[]) {
  const panel = document.getElementById("quest-panel");
  if (!panel) return;
  const stateColors: Record<string, string> = { active: "#00ff88", completed: "#888", available: "#ffd700", locked: "#ff4444" };
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#ffd700;">Quest Log</h3><button aria-label="Close Quests" onclick="document.getElementById('quest-panel').style.display='none'" style="${closeBtnStyle()}">X</button></div>`;

  if (!questStatus || questStatus.length === 0) {
    html += `<div style="text-align:center;opacity:0.4;padding:20px;">No quests. Talk to NPCs!</div>`;
  } else {
    const groups: Record<string, any[]> = { active: [], available: [], completed: [], locked: [] };
    questStatus.forEach((q: any) => (groups[q.state] || groups.locked).push(q));
    for (const [state, quests] of Object.entries(groups)) {
      if (quests.length === 0) continue;
      html += `<div style="font-size:11px;color:${stateColors[state]};font-weight:bold;margin:10px 0 6px;text-transform:uppercase;letter-spacing:1px;">${state} (${quests.length})</div>`;
      quests.forEach((q: any) => {
        html += `<div style="background:rgba(255,255,255,0.05);border:1px solid ${stateColors[state]}44;border-radius:6px;padding:8px 10px;margin-bottom:6px;"><div style="font-size:12px;color:${stateColors[state]};font-weight:bold;">${q.title || q.name || q.id}</div>${q.description ? `<div style="font-size:11px;color:#888;margin-top:3px;">${q.description}</div>` : ""}${q.reward ? `<div style="font-size:10px;color:#ffd700;margin-top:3px;">Reward: ${q.reward.gold ? `${q.reward.gold}g` : ""} ${q.reward.xp ? `${q.reward.xp}xp` : ""}</div>` : ""}</div>`;
      });
    }
  }
  panel.innerHTML = html;
}

// ─── Skills Panel ────────────────────────────────────────────────────────────
function renderSkillsPanel() {
  const panel = document.getElementById("skills-panel");
  if (!panel) return;
  const skills = _myPlayer?.skills || {};
  const skillDefs: [string, string, string][] = [
    ["attack", "Atk", "#ff6644"], ["defence", "Def", "#4488ff"], ["strength", "Str", "#ff4488"],
    ["hitpoints", "HP", "#ff2222"], ["woodcutting", "WC", "#88cc44"], ["mining", "Min", "#aaaaaa"],
    ["fishing", "Fish", "#44aaff"], ["cooking", "Cook", "#ffaa44"], ["crafting", "Craft", "#cc8844"],
    ["magic", "Mag", "#aa44ff"], ["ranged", "Rng", "#44ff88"], ["prayer", "Pray", "#ffffaa"],
    ["runecrafting", "RC", "#ff44ff"], ["agility", "Agi", "#44ffff"], ["herblore", "Herb", "#44cc44"],
    ["thieving", "Thv", "#884488"], ["slayer", "Slay", "#ff0000"], ["farming", "Farm", "#88aa44"],
    ["smithing", "Smith", "#ff8800"], ["fletching", "Fltch", "#88ff44"],
  ];
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0;color:#ff8844;">Skills</h3><button aria-label="Close Skills" onclick="document.getElementById('skills-panel').style.display='none'" style="${closeBtnStyle()}">X</button></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">`;
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
