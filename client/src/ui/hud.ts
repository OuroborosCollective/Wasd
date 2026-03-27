import { sendDialogueChoice, sendChatMessage } from "../networking/websocketClient";
import { toggleAdminAssetPanel } from "./adminAssetPanel";
import "./obsidian-relic.css";

export function renderHUD() {
  // Add global effects
  const grain = document.createElement("div");
  grain.className = "asfalt-grain";
  document.body.appendChild(grain);

  const vignette = document.createElement("div");
  vignette.className = "vignette";
  document.body.appendChild(vignette);

  const hud = document.createElement("div");
  hud.id = "main-hud";
  hud.className = "obsidian-relic";
  hud.style.position = "fixed";
  hud.style.inset = "0";
  hud.style.pointerEvents = "none";
  hud.style.zIndex = "1000";
  
  hud.innerHTML = `
    <!-- Top Left: Character Status -->
    <div class="panel" style="position: absolute; top: 20px; left: 20px; width: 280px; pointer-events: auto;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div style="position: relative;">
          <div style="width: 56px; height: 56px; border-radius: 4px; overflow: hidden; border: 2px solid var(--primary-gold); background: #000;">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDutQjQufVrhJpuNngxO9UDFSEYqpU4sIV-UPjRvnkrwBJSaFrwnTxLeSDXVCME_aSOXUBk6Dlb8PUyeHJeyOA5mgcj7cFiRp53PoOqGBZfpdUwmDCmWh8rt8cRjFxE_WSFYf72K14Z3admY0LmzsDTQt6QJdl7i-EUu3-kDKaPCa6GsX5xG9O82wNSMNyA6s1aGRxobV9Y-05jrYcc3Dl6xeRwJr-HzS7LUAqB9_N3NvrTXfgEYL6U6ytF4ci9vxDpLYYaddyhqxxq" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="position: absolute; bottom: -4px; right: -4px; background: var(--primary-gold); color: #241A00; font-size: 10px; font-weight: 800; padding: 2px 4px; border-radius: 2px;" id="hud-level">1</div>
        </div>
        <div>
          <h2 class="gold-text" style="margin: 0; font-size: 18px; letter-spacing: 1px; text-transform: uppercase;" id="hud-player-name">Arelorian</h2>
          <p style="margin: 0; font-size: 10px; color: var(--on-surface-variant); letter-spacing: 3px; text-transform: uppercase;" id="hud-player-role">Alpha Explorer</p>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Health -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--on-surface-variant);">
            <span>Health</span>
            <span id="hud-health-val">100 / 100</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill health-fill" id="hud-health-bar" style="width: 100%;"></div>
          </div>
        </div>
        <!-- Mana/Energy -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--on-surface-variant);">
            <span>Mana</span>
            <span id="hud-mana-val">50 / 50</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill mana-fill" id="hud-mana-bar" style="width: 100%;"></div>
          </div>
        </div>
        <!-- XP -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--on-surface-variant);">
            <span>Experience</span>
            <span id="hud-xp-val">0%</span>
          </div>
          <div class="progress-bar-container" style="height: 2px;">
            <div class="progress-bar-fill xp-fill" id="hud-xp-bar" style="width: 0%;"></div>
          </div>
        </div>
      </div>

      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; font-size: 12px;">
        <span class="gold-text" id="hud-gold">Gold: 0</span>
        <span id="hud-time" style="color: var(--on-surface-variant);">08:00</span>
      </div>
    </div>

    <!-- Bottom Center: Action Bar -->
    <div style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 12px;">
      <div style="display: flex; gap: 8px; padding: 12px; background: rgba(19, 19, 22, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(233, 195, 73, 0.3); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div class="action-slot" id="cd-attack">
          <span class="material-symbols-outlined">bolt</span>
          <span class="key-hint">F</span>
        </div>
        <div class="action-slot" id="cd-interact">
          <span class="material-symbols-outlined">touch_app</span>
          <span class="key-hint">E</span>
        </div>
        <div class="action-slot" id="cd-equip">
          <span class="material-symbols-outlined">shield</span>
          <span class="key-hint">G</span>
        </div>
        <div class="action-slot">
          <span class="material-symbols-outlined">inventory_2</span>
          <span class="key-hint">I</span>
        </div>
        <div class="action-slot">
          <span class="material-symbols-outlined">map</span>
          <span class="key-hint">M</span>
        </div>
      </div>
      <div style="font-size: 10px; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 2px; opacity: 0.6;">
        WASD: Move | E: Interact | F: Attack | G: Equip
      </div>
    </div>

    <!-- Bottom Left: Chat -->
    <div class="chat-container" style="position: absolute; bottom: 30px; left: 20px; width: 320px; pointer-events: auto;">
      <div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-atomic="false"></div>
      <div class="chat-input-wrapper">
        <input type="text" id="chat-input" class="chat-input" aria-label="Chat message input" placeholder="Whisper to the void..." />
        <button id="chat-send" class="btn-gold" aria-label="Send chat message" style="padding: 8px 12px;">
          <span class="material-symbols-outlined" style="font-size: 18px;">send</span>
        </button>
      </div>
    </div>

    <!-- Right Side: Quests & Inventory -->
    <div style="position: absolute; top: 20px; right: 20px; width: 240px; display: flex; flex-direction: column; gap: 16px; pointer-events: auto;">
      <!-- Quests -->
      <div class="panel" style="border-left: none; border-right: 4px solid var(--primary-gold);">
        <h3 class="gold-text font-serif" style="margin: 0 0 12px 0; font-size: 16px; text-transform: uppercase; text-align: right;">Active Quests</h3>
        <div id="hud-quests" style="font-size: 12px; display: flex; flex-direction: column; gap: 8px; text-align: right;">
          <div style="color: var(--on-surface-variant); font-style: italic;">No active quests</div>
        </div>
      </div>
      <!-- Inventory Summary -->
      <div class="panel" style="border-left: none; border-right: 4px solid var(--on-surface-variant);">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; text-align: right; color: var(--on-surface-variant);">Inventory</h3>
        <div id="hud-inventory" style="font-size: 11px; color: var(--on-surface-variant); text-align: right;">
          Empty
        </div>
      </div>
      
      <button id="btn-admin-assets" class="btn-gold" style="display: none; width: 100%; margin-top: 8px;">Admin Manager</button>
    </div>
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
    e.stopPropagation();
  };
}

export function addChatMessage(source: string, text: string) {
  const chatLog = document.getElementById("chat-log");
  if (!chatLog) return;
  
  const msgEl = document.createElement("div");
  msgEl.style.wordBreak = "break-word";
  
  const sourceSpan = document.createElement("span");
  sourceSpan.className = "gold-text";
  sourceSpan.style.fontWeight = "bold";
  sourceSpan.textContent = source + ":";

  const textSpan = document.createElement("span");
  textSpan.style.color = "var(--on-surface)";
  textSpan.textContent = " " + text;

  msgEl.appendChild(sourceSpan);
  msgEl.appendChild(textSpan);
  
  chatLog.appendChild(msgEl);
  chatLog.scrollTop = chatLog.scrollHeight;
}

export function updateHUD(data: { role?: string, gold: number, xp: number, quests: any[], inventory: any[], equipment?: any, reputation?: any, questStatus?: any[], worldTime?: string, stats?: any }) {
  const btnAdmin = document.getElementById("btn-admin-assets");
  if (btnAdmin && data.role === "admin") {
    btnAdmin.style.display = "block";
  }

  const timeEl = document.getElementById("hud-time");
  if (timeEl && data.worldTime) {
    timeEl.textContent = data.worldTime;
  }

  const goldEl = document.getElementById("hud-gold");
  if (goldEl) {
    goldEl.textContent = `Gold: ${data.gold}`;
  }

  const xpVal = document.getElementById("hud-xp-val");
  const xpBar = document.getElementById("hud-xp-bar");
  if (xpVal && xpBar) {
    const percent = Math.min(100, data.xp % 100); // Simple level logic for UI
    xpVal.textContent = `${percent}%`;
    xpBar.style.width = `${percent}%`;
  }

  const inv = document.getElementById("hud-inventory");
  if (inv) {
    const items = data.inventory.map(i => i.name).join(", ");
    inv.textContent = items || "Empty";
  }
  
  const questContainer = document.getElementById("hud-quests");
  if (questContainer && data.questStatus) {
    if (data.questStatus.length === 0) {
      questContainer.innerHTML = `<div style="color: var(--on-surface-variant); font-style: italic;">No active quests</div>`;
    } else {
      questContainer.innerHTML = data.questStatus.map((q: any) => 
        `<div style="color: ${q.state === 'active' ? 'var(--primary-gold)' : q.state === 'completed' ? 'var(--on-surface-variant)' : '#ffff00'}">
          ${q.title} <span style="font-size: 9px; opacity: 0.7;">[${q.state.toUpperCase()}]</span>
        </div>`
      ).join("");
    }
  }

  // Update Health/Mana if stats provided
  if (data.stats) {
    const hpVal = document.getElementById("hud-health-val");
    const hpBar = document.getElementById("hud-health-bar");
    if (hpVal && hpBar && data.stats.hp !== undefined) {
      const maxHp = data.stats.maxHp || 100;
      hpVal.textContent = `${data.stats.hp} / ${maxHp}`;
      hpBar.style.width = `${(data.stats.hp / maxHp) * 100}%`;
    }

    const mpVal = document.getElementById("hud-mana-val");
    const mpBar = document.getElementById("hud-mana-bar");
    if (mpVal && mpBar && data.stats.mp !== undefined) {
      const maxMp = data.stats.maxMp || 100;
      mpVal.textContent = `${data.stats.mp} / ${maxMp}`;
      mpBar.style.width = `${(data.stats.mp / maxMp) * 100}%`;
    }
  }
}

export function updateCooldowns(cooldowns: { attack: number, interact: number, equip: number }) {
  const now = Date.now();
  
  const updateCd = (id: string, remaining: number) => {
    const el = document.getElementById(id);
    if (el) {
      const icon = el.querySelector('.material-symbols-outlined') as HTMLElement;
      const keyHint = el.querySelector('.key-hint') as HTMLElement;
      
      if (remaining > 0) {
        el.style.borderColor = "rgba(255, 0, 0, 0.5)";
        if (icon) icon.style.opacity = "0.3";
        if (keyHint) {
          keyHint.textContent = (remaining / 1000).toFixed(1) + "s";
          keyHint.style.color = "#ff4444";
        }
      } else {
        el.style.borderColor = "rgba(233, 195, 73, 0.3)";
        if (icon) icon.style.opacity = "1";
        if (keyHint) {
          keyHint.textContent = id === "cd-attack" ? "F" : id === "cd-interact" ? "E" : "G";
          keyHint.style.color = "var(--on-surface-variant)";
        }
      }
    }
  };

  updateCd("cd-attack", Math.max(0, cooldowns.attack - now));
  updateCd("cd-interact", Math.max(0, cooldowns.interact - now));
  updateCd("cd-equip", Math.max(0, cooldowns.equip - now));
}

export function showFloatingText(text: string, x: number, y: number) {
  const div = document.createElement("div");
  div.className = "obsidian-relic font-serif";
  div.style.position = "fixed";
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.color = text.includes("-") ? "#ff4444" : "#44ff44";
  div.style.fontWeight = "800";
  div.style.fontSize = "24px";
  div.style.pointerEvents = "none";
  div.style.zIndex = "1001";
  div.style.textShadow = "0 0 10px rgba(0,0,0,0.8)";
  div.textContent = text;
  document.body.appendChild(div);
  
  div.animate([
    { transform: "translateY(0) scale(1)", opacity: 1 },
    { transform: "translateY(-80px) scale(1.2)", opacity: 0 }
  ], {
    duration: 1200,
    easing: "ease-out"
  }).onfinish = () => div.remove();
}

export function showTooltip(text: string) {
  let tooltip = document.getElementById("interaction-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "interaction-tooltip";
    tooltip.className = "obsidian-relic";
    tooltip.style.position = "fixed";
    tooltip.style.bottom = "140px";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.background = "rgba(19, 19, 22, 0.9)";
    tooltip.style.color = "var(--primary-gold)";
    tooltip.style.padding = "10px 20px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.border = "1px solid var(--primary-gold)";
    tooltip.style.boxShadow = "0 0 20px rgba(233, 195, 73, 0.2)";
    tooltip.style.zIndex = "1000";
    tooltip.style.pointerEvents = "none";
    tooltip.style.textTransform = "uppercase";
    tooltip.style.letterSpacing = "2px";
    tooltip.style.fontSize = "12px";
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
    dialogueBox.className = "obsidian-relic panel";
    dialogueBox.style.position = "fixed";
    dialogueBox.style.bottom = "40px";
    dialogueBox.style.left = "50%";
    dialogueBox.style.transform = "translateX(-50%)";
    dialogueBox.style.width = "90vw";
    dialogueBox.style.maxWidth = "700px";
    dialogueBox.style.zIndex = "2000";
    dialogueBox.style.pointerEvents = "auto";
    document.body.appendChild(dialogueBox);
  }
  
  let html = `
    <div style="margin-bottom: 20px;">
      <strong class="gold-text font-serif" style="font-size: 20px; display: block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">${source}</strong>
      <div style="line-height: 1.6; font-size: 16px; color: var(--on-surface);">${text}</div>
    </div>
  `;
  
  if (choices && choices.length > 0 && npcId) {
    html += `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">`;
    choices.forEach((choice, index) => {
      html += `
        <button 
          class="dialogue-choice-btn" 
          data-npc-id="${npcId}" 
          data-node-id="${choice.nextNodeId}"
          data-choice-id="${choice.id}"
          style="background: var(--surface-container-low); border: 1px solid var(--outline-variant); color: var(--on-surface); padding: 12px 20px; border-radius: 2px; cursor: pointer; text-align: left; transition: all 0.2s; font-size: 14px;"
          onmouseover="this.style.borderColor='var(--primary-gold)'; this.style.background='rgba(233, 195, 73, 0.05)';"
          onmouseout="this.style.borderColor='var(--outline-variant)'; this.style.background='var(--surface-container-low)';"
        >
          <span class="gold-text" style="margin-right: 10px; font-weight: 800;">${index + 1}.</span> ${choice.text}
        </button>
      `;
    });
    html += `</div>`;
  } else {
    html += `<div style="font-size: 10px; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 2px; margin-top: 20px; text-align: center; opacity: 0.5;">Click anywhere to continue</div>`;
    
    const closeHandler = () => {
      dialogueBox!.remove();
      document.removeEventListener('click', closeHandler);
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
  }
  
  dialogueBox.innerHTML = html;

  dialogueBox.querySelectorAll(".dialogue-choice-btn").forEach((btn: any) => {
    btn.onclick = (e: any) => {
      e.stopPropagation();
      const nid = btn.getAttribute("data-npc-id");
      const nodeid = btn.getAttribute("data-node-id");
      const cid = btn.getAttribute("data-choice-id");
      sendDialogueChoice(nid, nodeid, cid);
      dialogueBox!.remove();
    };
  });
}
