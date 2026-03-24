/**
 * GM / Admin Panel - No-Code World Editor for Areloria MMORPG
 * Features: Quest Builder, NPC Spawner, GLB Manager, Economy Dashboard,
 *           Weather/Time Control, Player Management, Nations/Diplomacy,
 *           World Events, Chat Broadcast, Territory Control
 */

import { sendMessage } from "../networking/websocketClient";

let panelOpen = false;
let activeTab = "world";

// ── STYLES ────────────────────────────────────────────────────────────────────
const GM_STYLES = `
  #gm-panel {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
    z-index: 9999; display: none; flex-direction: column;
    font-family: 'Segoe UI', sans-serif; color: #c8d8f0;
    overflow: hidden;
  }
  #gm-panel.open { display: flex; }
  #gm-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px; background: rgba(0,20,50,0.9);
    border-bottom: 1px solid rgba(100,180,255,0.3);
    flex-shrink: 0;
  }
  #gm-header h1 {
    margin: 0; font-size: 18px; color: #64b4ff;
    text-shadow: 0 0 10px rgba(100,180,255,0.5);
    letter-spacing: 2px;
  }
  #gm-close {
    background: rgba(200,50,50,0.3); border: 1px solid rgba(200,50,50,0.5);
    color: #ff8080; padding: 6px 14px; border-radius: 6px; cursor: pointer;
    font-size: 14px; transition: background 0.2s;
  }
  #gm-close:hover { background: rgba(200,50,50,0.6); }
  #gm-tabs {
    display: flex; gap: 2px; padding: 8px 20px 0;
    background: rgba(0,15,40,0.8); flex-shrink: 0;
    overflow-x: auto; flex-wrap: nowrap;
  }
  .gm-tab {
    padding: 8px 16px; border-radius: 6px 6px 0 0; cursor: pointer;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(100,180,255,0.15);
    border-bottom: none; font-size: 12px; white-space: nowrap;
    transition: background 0.2s; color: #8ab0d0;
  }
  .gm-tab:hover { background: rgba(100,180,255,0.1); color: #c8d8f0; }
  .gm-tab.active { background: rgba(100,180,255,0.15); color: #64b4ff; border-color: rgba(100,180,255,0.4); }
  #gm-content {
    flex: 1; overflow-y: auto; padding: 20px;
    background: rgba(0,10,30,0.7);
  }
  .gm-section {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(100,180,255,0.15);
    border-radius: 8px; padding: 16px; margin-bottom: 16px;
  }
  .gm-section h3 {
    margin: 0 0 12px; font-size: 13px; color: #64b4ff;
    text-transform: uppercase; letter-spacing: 1px;
    border-bottom: 1px solid rgba(100,180,255,0.2); padding-bottom: 8px;
  }
  .gm-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; align-items: center; }
  .gm-label { font-size: 11px; color: #8ab0d0; min-width: 80px; }
  .gm-input {
    background: rgba(0,0,0,0.4); border: 1px solid rgba(100,180,255,0.25);
    color: #c8d8f0; padding: 6px 10px; border-radius: 4px; font-size: 12px;
    flex: 1; min-width: 100px; max-width: 200px;
  }
  .gm-input:focus { outline: none; border-color: rgba(100,180,255,0.6); }
  .gm-input-wide { max-width: 400px; }
  .gm-textarea {
    background: rgba(0,0,0,0.4); border: 1px solid rgba(100,180,255,0.25);
    color: #c8d8f0; padding: 8px 10px; border-radius: 4px; font-size: 12px;
    width: 100%; min-height: 80px; resize: vertical; box-sizing: border-box;
  }
  .gm-textarea:focus { outline: none; border-color: rgba(100,180,255,0.6); }
  .gm-select {
    background: rgba(0,0,0,0.4); border: 1px solid rgba(100,180,255,0.25);
    color: #c8d8f0; padding: 6px 10px; border-radius: 4px; font-size: 12px;
  }
  .gm-btn {
    padding: 7px 16px; border-radius: 5px; cursor: pointer; font-size: 12px;
    border: 1px solid rgba(100,180,255,0.3); background: rgba(100,180,255,0.1);
    color: #c8d8f0; transition: background 0.2s; white-space: nowrap;
  }
  .gm-btn:hover { background: rgba(100,180,255,0.25); }
  .gm-btn-green { border-color: rgba(80,200,100,0.4); background: rgba(80,200,100,0.1); }
  .gm-btn-green:hover { background: rgba(80,200,100,0.3); }
  .gm-btn-red { border-color: rgba(200,80,80,0.4); background: rgba(200,80,80,0.1); }
  .gm-btn-red:hover { background: rgba(200,80,80,0.3); }
  .gm-btn-orange { border-color: rgba(255,160,40,0.4); background: rgba(255,160,40,0.1); }
  .gm-btn-orange:hover { background: rgba(255,160,40,0.3); }
  .gm-btn-gold { border-color: rgba(255,215,0,0.4); background: rgba(255,215,0,0.1); color: #ffd700; }
  .gm-btn-gold:hover { background: rgba(255,215,0,0.25); }
  .gm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .gm-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .gm-status {
    font-size: 11px; padding: 6px 10px; border-radius: 4px;
    background: rgba(80,200,100,0.1); border: 1px solid rgba(80,200,100,0.3);
    color: #80c880; margin-top: 8px; display: none;
  }
  .gm-status.visible { display: block; }
  .gm-status.error { background: rgba(200,80,80,0.1); border-color: rgba(200,80,80,0.3); color: #c88080; }
  .gm-badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 10px; font-weight: bold; margin-left: 6px;
  }
  .gm-badge-admin { background: rgba(255,100,100,0.2); color: #ff8080; border: 1px solid rgba(255,100,100,0.3); }
  .gm-badge-gm { background: rgba(100,200,100,0.2); color: #80c880; border: 1px solid rgba(100,200,100,0.3); }
  .gm-player-row {
    display: flex; align-items: center; gap: 10px; padding: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px;
  }
  .gm-player-row:hover { background: rgba(255,255,255,0.03); }
  .gm-slider { width: 150px; accent-color: #64b4ff; }
  .gm-checkbox { accent-color: #64b4ff; width: 16px; height: 16px; }
  .gm-divider { border: none; border-top: 1px solid rgba(100,180,255,0.1); margin: 12px 0; }
  .gm-tag {
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    background: rgba(100,180,255,0.1); border: 1px solid rgba(100,180,255,0.2);
    font-size: 11px; margin: 2px; cursor: pointer;
  }
  .gm-tag:hover { background: rgba(100,180,255,0.2); }
  @media (max-width: 700px) {
    .gm-grid-2, .gm-grid-3 { grid-template-columns: 1fr; }
    .gm-input { max-width: 100%; }
  }
`;

// ── HELPER ────────────────────────────────────────────────────────────────────
function showStatus(id: string, msg: string, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `gm-status visible${isError ? " error" : ""}`;
  setTimeout(() => el.classList.remove("visible"), 3000);
}

function gm(msg: any) {
  sendMessage(msg);
}

// ── TAB CONTENTS ──────────────────────────────────────────────────────────────
function renderWorldTab(): string {
  return `
    <div class="gm-grid-2">
      <div class="gm-section">
        <h3>🌤️ Weather Control</h3>
        <div class="gm-row">
          <span class="gm-label">Weather</span>
          <select class="gm-select" id="gm-weather">
            <option value="clear">☀️ Clear</option>
            <option value="cloudy">☁️ Cloudy</option>
            <option value="rain">🌧️ Rain</option>
            <option value="storm">⛈️ Storm</option>
            <option value="snow">❄️ Snow</option>
            <option value="fog">🌫️ Fog</option>
            <option value="sandstorm">🌪️ Sandstorm</option>
          </select>
          <button class="gm-btn gm-btn-green" onclick="gmSetWeather()">Apply</button>
        </div>
      </div>
      <div class="gm-section">
        <h3>🕐 Time of Day</h3>
        <div class="gm-row">
          <span class="gm-label">Hour (0-24)</span>
          <input type="range" class="gm-slider" id="gm-time" min="0" max="24" step="1" value="12"
            oninput="document.getElementById('gm-time-val').textContent=this.value">
          <span id="gm-time-val" style="min-width:30px;text-align:center">12</span>
          <button class="gm-btn gm-btn-green" onclick="gmSetTime()">Apply</button>
        </div>
      </div>
    </div>

    <div class="gm-section">
      <h3>⚙️ World Settings</h3>
      <div class="gm-row">
        <label><input type="checkbox" class="gm-checkbox" id="gm-pvp" checked> PvP Enabled</label>
        <label><input type="checkbox" class="gm-checkbox" id="gm-ff"> Friendly Fire</label>
        <label><input type="checkbox" class="gm-checkbox" id="gm-inf-world" checked> Infinite World</label>
        <label><input type="checkbox" class="gm-checkbox" id="gm-econ-sim" checked> Economy Simulation</label>
        <label><input type="checkbox" class="gm-checkbox" id="gm-npc-ai" checked> NPC AI Active</label>
        <button class="gm-btn gm-btn-green" onclick="gmSaveWorldSettings()">Save Settings</button>
      </div>
    </div>

    <div class="gm-section">
      <h3>📢 World Events</h3>
      <div class="gm-row">
        <input class="gm-input" id="gm-event-id" placeholder="event_id (e.g. dragon_raid)">
        <input class="gm-input" id="gm-event-title" placeholder="Event Title">
        <input class="gm-input gm-input-wide" id="gm-event-desc" placeholder="Description">
        <button class="gm-btn gm-btn-orange" onclick="gmTriggerWorldEvent()">🌍 Trigger Event</button>
      </div>
      <div class="gm-row" style="flex-wrap:wrap;gap:6px">
        <span style="font-size:11px;color:#8ab0d0">Quick Events:</span>
        <span class="gm-tag" onclick="gmQuickEvent('dragon_raid','Dragon Raid!','A dragon attacks the village!')">🐉 Dragon Raid</span>
        <span class="gm-tag" onclick="gmQuickEvent('bandit_attack','Bandit Attack!','Bandits are raiding the roads!')">⚔️ Bandit Attack</span>
        <span class="gm-tag" onclick="gmQuickEvent('merchant_caravan','Merchant Caravan','A merchant caravan has arrived!')">🛒 Merchant Caravan</span>
        <span class="gm-tag" onclick="gmQuickEvent('treasure_hunt','Treasure Hunt','A treasure map has been found!')">💎 Treasure Hunt</span>
        <span class="gm-tag" onclick="gmQuickEvent('festival','Festival!','A grand festival begins!')">🎉 Festival</span>
      </div>
    </div>

    <div class="gm-section">
      <h3>📍 Object Placement</h3>
      <div class="gm-row">
        <span class="gm-label">Object Type</span>
        <select class="gm-select" id="gm-obj-type">
          <option value="chest">💰 Treasure Chest</option>
          <option value="campfire">🔥 Campfire</option>
          <option value="sign">📋 Sign</option>
          <option value="tree">🌲 Tree</option>
          <option value="rock">🪨 Rock</option>
          <option value="portal">🌀 Portal</option>
          <option value="shrine">⛩️ Shrine</option>
        </select>
        <span class="gm-label">X</span>
        <input class="gm-input" id="gm-obj-x" type="number" placeholder="X" style="max-width:80px">
        <span class="gm-label">Y</span>
        <input class="gm-input" id="gm-obj-y" type="number" placeholder="Y" style="max-width:80px">
        <button class="gm-btn gm-btn-green" onclick="gmPlaceObject()">📍 Place</button>
      </div>
    </div>
    <div id="gm-world-status" class="gm-status"></div>
  `;
}

function renderNPCTab(): string {
  return `
    <div class="gm-section">
      <h3>👤 Spawn NPC</h3>
      <div class="gm-row">
        <span class="gm-label">NPC ID</span>
        <input class="gm-input" id="gm-npc-id" placeholder="e.g. wolf, bandit, npc_1">
        <span class="gm-label">Name</span>
        <input class="gm-input" id="gm-npc-name" placeholder="Display Name">
      </div>
      <div class="gm-row">
        <span class="gm-label">X</span>
        <input class="gm-input" id="gm-npc-x" type="number" placeholder="X pos" style="max-width:80px">
        <span class="gm-label">Y</span>
        <input class="gm-input" id="gm-npc-y" type="number" placeholder="Y pos" style="max-width:80px">
        <span class="gm-label">Level</span>
        <input class="gm-input" id="gm-npc-level" type="number" value="1" style="max-width:60px">
        <span class="gm-label">HP</span>
        <input class="gm-input" id="gm-npc-hp" type="number" value="100" style="max-width:80px">
      </div>
      <div class="gm-row">
        <button class="gm-btn gm-btn-green" onclick="gmSpawnNPC()">✨ Spawn NPC</button>
        <button class="gm-btn gm-btn-orange" onclick="gmSpawnNPCAtSelf()">📍 Spawn at My Position</button>
        <button class="gm-btn gm-btn-red" onclick="gmRemoveNPC()">🗑️ Remove NPC</button>
      </div>
      <div class="gm-row" style="flex-wrap:wrap;gap:6px">
        <span style="font-size:11px;color:#8ab0d0">Quick Spawn:</span>
        <span class="gm-tag" onclick="gmQuickSpawn('wolf','Wolf')">🐺 Wolf</span>
        <span class="gm-tag" onclick="gmQuickSpawn('bandit','Bandit')">⚔️ Bandit</span>
        <span class="gm-tag" onclick="gmQuickSpawn('skeleton','Skeleton')">💀 Skeleton</span>
        <span class="gm-tag" onclick="gmQuickSpawn('boar','Boar')">🐗 Boar</span>
        <span class="gm-tag" onclick="gmQuickSpawn('dragon','Dragon')">🐉 Dragon</span>
        <span class="gm-tag" onclick="gmQuickSpawn('merchant','Merchant')">🛒 Merchant</span>
        <span class="gm-tag" onclick="gmQuickSpawn('guard','Guard')">🛡️ Guard</span>
        <span class="gm-tag" onclick="gmQuickSpawn('wizard','Wizard')">🧙 Wizard</span>
      </div>
    </div>

    <div class="gm-section">
      <h3>💬 NPC Dialogue Editor</h3>
      <div class="gm-row">
        <span class="gm-label">NPC ID</span>
        <input class="gm-input" id="gm-dlg-npc" placeholder="NPC ID">
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#8ab0d0;display:block;margin-bottom:4px">Dialogue Text</label>
        <textarea class="gm-textarea" id="gm-dlg-text" placeholder="Enter the NPC's dialogue text..."></textarea>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#8ab0d0;display:block;margin-bottom:4px">Choices (JSON array, optional)</label>
        <textarea class="gm-textarea" id="gm-dlg-choices" placeholder='[{"id":"yes","text":"Yes, I will help."},{"id":"no","text":"Not now."}]' style="min-height:60px"></textarea>
      </div>
      <button class="gm-btn gm-btn-green" onclick="gmSaveDialogue()">💾 Save Dialogue</button>
    </div>
    <div id="gm-npc-status" class="gm-status"></div>
  `;
}

function renderQuestTab(): string {
  return `
    <div class="gm-section">
      <h3>📜 Quest Builder</h3>
      <div class="gm-row">
        <span class="gm-label">Quest ID</span>
        <input class="gm-input" id="gm-q-id" placeholder="unique_quest_id">
        <span class="gm-label">Title</span>
        <input class="gm-input gm-input-wide" id="gm-q-title" placeholder="Quest Title">
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#8ab0d0;display:block;margin-bottom:4px">Description</label>
        <textarea class="gm-textarea" id="gm-q-desc" placeholder="Quest description..."></textarea>
      </div>
      <div class="gm-row">
        <span class="gm-label">Category</span>
        <select class="gm-select" id="gm-q-cat">
          <option value="main">⭐ Main Story</option>
          <option value="side">📖 Side Quest</option>
          <option value="daily">📅 Daily</option>
          <option value="guild">🏰 Guild</option>
          <option value="world">🌍 World Event</option>
          <option value="hidden">🔍 Hidden</option>
        </select>
        <span class="gm-label">Level Req</span>
        <input class="gm-input" id="gm-q-level" type="number" value="1" style="max-width:60px">
        <label><input type="checkbox" class="gm-checkbox" id="gm-q-rep"> Repeatable</label>
      </div>
      <div class="gm-row">
        <span class="gm-label">Giver NPC</span>
        <input class="gm-input" id="gm-q-giver" placeholder="NPC ID">
        <span class="gm-label">XP Reward</span>
        <input class="gm-input" id="gm-q-xp" type="number" value="100" style="max-width:80px">
        <span class="gm-label">Gold Reward</span>
        <input class="gm-input" id="gm-q-gold" type="number" value="50" style="max-width:80px">
        <span class="gm-label">Item Reward</span>
        <input class="gm-input" id="gm-q-item" placeholder="item_id (optional)">
      </div>
      <button class="gm-btn gm-btn-green" onclick="gmCreateQuest()">✨ Create Quest</button>
    </div>

    <div class="gm-section">
      <h3>📋 Quest Templates</h3>
      <div class="gm-row" style="flex-wrap:wrap;gap:6px">
        <span class="gm-tag" onclick="gmQuestTemplate('kill')">⚔️ Kill Quest</span>
        <span class="gm-tag" onclick="gmQuestTemplate('collect')">🎒 Collect Quest</span>
        <span class="gm-tag" onclick="gmQuestTemplate('talk')">💬 Talk Quest</span>
        <span class="gm-tag" onclick="gmQuestTemplate('explore')">🗺️ Explore Quest</span>
        <span class="gm-tag" onclick="gmQuestTemplate('escort')">🛡️ Escort Quest</span>
        <span class="gm-tag" onclick="gmQuestTemplate('craft')">⚒️ Craft Quest</span>
      </div>
    </div>
    <div id="gm-quest-status" class="gm-status"></div>
  `;
}

function renderGLBTab(): string {
  return `
    <div class="gm-section">
      <h3>📦 GLB Model Registry</h3>
      <p style="font-size:11px;color:#8ab0d0;margin:0 0 12px">
        Register 3D GLB models and assign them to NPCs, objects, or player characters.
        Place GLB files in <code style="color:#64b4ff">server/public/models/</code> first.
      </p>
      <div class="gm-row">
        <span class="gm-label">Model Path</span>
        <input class="gm-input gm-input-wide" id="gm-glb-path" placeholder="/models/wolf.glb">
        <span class="gm-label">Name</span>
        <input class="gm-input" id="gm-glb-name" placeholder="wolf">
        <span class="gm-label">Category</span>
        <select class="gm-select" id="gm-glb-cat">
          <option value="npc">👤 NPC</option>
          <option value="monster">👹 Monster</option>
          <option value="player">🧑 Player</option>
          <option value="object">🪨 Object</option>
          <option value="building">🏠 Building</option>
          <option value="item">💎 Item</option>
        </select>
        <button class="gm-btn gm-btn-green" onclick="gmRegisterGLB()">📦 Register</button>
      </div>
      <hr class="gm-divider">
      <div class="gm-row">
        <button class="gm-btn" onclick="gmListGLB()">📋 List All Models</button>
        <button class="gm-btn" onclick="gmScanGLB()">🔍 Scan Model Folder</button>
      </div>
      <div id="gm-glb-list" style="margin-top:10px;font-size:11px;color:#8ab0d0"></div>
    </div>

    <div class="gm-section">
      <h3>🔗 Assign Model to NPC/Object</h3>
      <div class="gm-row">
        <span class="gm-label">GLB Path</span>
        <input class="gm-input" id="gm-link-path" placeholder="/models/wolf.glb">
        <span class="gm-label">Target Type</span>
        <select class="gm-select" id="gm-link-type">
          <option value="npc_single">Single NPC</option>
          <option value="npc_group">NPC Group (by role)</option>
          <option value="monster_group">Monster Group</option>
          <option value="object_single">Single Object</option>
          <option value="object_group">Object Group</option>
        </select>
        <span class="gm-label">Target ID</span>
        <input class="gm-input" id="gm-link-target" placeholder="npc_id or role">
        <button class="gm-btn gm-btn-green" onclick="gmLinkGLB()">🔗 Link</button>
        <button class="gm-btn gm-btn-red" onclick="gmUnlinkGLB()">🔓 Unlink</button>
      </div>
    </div>
    <div id="gm-glb-status" class="gm-status"></div>
  `;
}

function renderEconomyTab(): string {
  return `
    <div class="gm-grid-2">
      <div class="gm-section">
        <h3>💰 Item Prices</h3>
        <div class="gm-row">
          <span class="gm-label">Item ID</span>
          <input class="gm-input" id="gm-price-item" placeholder="health_potion">
          <span class="gm-label">Buy Price</span>
          <input class="gm-input" id="gm-price-buy" type="number" placeholder="50" style="max-width:80px">
          <span class="gm-label">Sell Price</span>
          <input class="gm-input" id="gm-price-sell" type="number" placeholder="20" style="max-width:80px">
          <button class="gm-btn gm-btn-green" onclick="gmSetPrice()">Set</button>
        </div>
        <button class="gm-btn gm-btn-orange" onclick="gmResetPrices()">🔄 Reset All Prices</button>
      </div>
      <div class="gm-section">
        <h3>📊 Economy Events</h3>
        <div class="gm-row">
          <select class="gm-select" id="gm-econ-event">
            <option value="inflation">📈 Inflation (+50% prices)</option>
            <option value="deflation">📉 Deflation (-30% prices)</option>
            <option value="trade_boom">🚀 Trade Boom (2x sell)</option>
            <option value="shortage">⚠️ Item Shortage</option>
            <option value="gold_rush">💛 Gold Rush</option>
          </select>
          <input class="gm-input" id="gm-econ-dur" type="number" value="300" placeholder="Duration (s)" style="max-width:100px">
          <button class="gm-btn gm-btn-orange" onclick="gmTriggerEconEvent()">Trigger</button>
        </div>
      </div>
    </div>
    <div id="gm-econ-status" class="gm-status"></div>
  `;
}

function renderPlayersTab(): string {
  return `
    <div class="gm-section">
      <h3>👥 Online Players</h3>
      <div class="gm-row">
        <button class="gm-btn" onclick="gmGetPlayers()">🔄 Refresh Player List</button>
      </div>
      <div id="gm-player-list" style="margin-top:10px"></div>
    </div>

    <div class="gm-grid-2">
      <div class="gm-section">
        <h3>🎁 Give / Take Items</h3>
        <div class="gm-row">
          <span class="gm-label">Player</span>
          <input class="gm-input" id="gm-give-player" placeholder="Player Name">
          <span class="gm-label">Item</span>
          <input class="gm-input" id="gm-give-item" placeholder="item_id or 'gold'">
          <span class="gm-label">Amount</span>
          <input class="gm-input" id="gm-give-amount" type="number" value="1" style="max-width:70px">
        </div>
        <div class="gm-row">
          <button class="gm-btn gm-btn-green" onclick="gmGiveItem()">🎁 Give</button>
          <button class="gm-btn gm-btn-red" onclick="gmTakeItem()">🗑️ Take</button>
        </div>
      </div>
      <div class="gm-section">
        <h3>✏️ Edit Player Stats</h3>
        <div class="gm-row">
          <span class="gm-label">Player</span>
          <input class="gm-input" id="gm-edit-player" placeholder="Player Name">
          <span class="gm-label">HP</span>
          <input class="gm-input" id="gm-edit-hp" type="number" placeholder="100" style="max-width:70px">
          <span class="gm-label">Gold</span>
          <input class="gm-input" id="gm-edit-gold" type="number" placeholder="0" style="max-width:80px">
          <span class="gm-label">XP</span>
          <input class="gm-input" id="gm-edit-xp" type="number" placeholder="0" style="max-width:80px">
        </div>
        <div class="gm-row">
          <button class="gm-btn gm-btn-green" onclick="gmEditPlayer()">💾 Save</button>
          <button class="gm-btn gm-btn-orange" onclick="gmRevivePlayer()">💚 Revive</button>
        </div>
      </div>
    </div>

    <div class="gm-section">
      <h3>🔨 Moderation</h3>
      <div class="gm-row">
        <input class="gm-input" id="gm-mod-player" placeholder="Player Name">
        <button class="gm-btn gm-btn-orange" onclick="gmKick()">👢 Kick</button>
        <button class="gm-btn gm-btn-red" onclick="gmBan()">🚫 Ban</button>
        <button class="gm-btn" onclick="gmMute()">🔇 Mute</button>
        <button class="gm-btn gm-btn-gold" onclick="gmTeleport()">🌀 Teleport Here</button>
        <button class="gm-btn gm-btn-green" onclick="gmPromote()">⭐ Promote to GM</button>
      </div>
      <div class="gm-row">
        <span class="gm-label">Teleport X</span>
        <input class="gm-input" id="gm-tp-x" type="number" placeholder="X" style="max-width:80px">
        <span class="gm-label">Y</span>
        <input class="gm-input" id="gm-tp-y" type="number" placeholder="Y" style="max-width:80px">
      </div>
    </div>

    <div class="gm-section">
      <h3>📢 Broadcast Message</h3>
      <div class="gm-row">
        <select class="gm-select" id="gm-bc-channel">
          <option value="system">📢 System</option>
          <option value="global">🌍 Global</option>
          <option value="announcement">📣 Announcement</option>
        </select>
        <input class="gm-input gm-input-wide" id="gm-bc-msg" placeholder="Message to all players...">
        <input class="gm-input" id="gm-bc-color" value="#ffd700" placeholder="#ffd700" style="max-width:80px">
        <button class="gm-btn gm-btn-gold" onclick="gmBroadcast()">📢 Send</button>
      </div>
    </div>
    <div id="gm-players-status" class="gm-status"></div>
  `;
}

function renderNationsTab(): string {
  return `
    <div class="gm-section">
      <h3>🏰 Found a Nation</h3>
      <div class="gm-row">
        <span class="gm-label">Nation Name</span>
        <input class="gm-input" id="gm-nat-name" placeholder="Kingdom of Areloria">
        <span class="gm-label">Leader</span>
        <input class="gm-input" id="gm-nat-leader" placeholder="Player Name">
      </div>
      <div class="gm-row">
        <span class="gm-label">Capital X</span>
        <input class="gm-input" id="gm-nat-cx" type="number" placeholder="X" style="max-width:80px">
        <span class="gm-label">Capital Y</span>
        <input class="gm-input" id="gm-nat-cy" type="number" placeholder="Y" style="max-width:80px">
        <span class="gm-label">Radius</span>
        <input class="gm-input" id="gm-nat-radius" type="number" value="200" style="max-width:80px">
        <button class="gm-btn gm-btn-green" onclick="gmCreateNation()">🏰 Found Nation</button>
      </div>
    </div>

    <div class="gm-section">
      <h3>🤝 Diplomacy</h3>
      <div class="gm-row">
        <span class="gm-label">Nation A</span>
        <input class="gm-input" id="gm-dip-a" placeholder="Nation A">
        <span class="gm-label">Nation B</span>
        <input class="gm-input" id="gm-dip-b" placeholder="Nation B">
        <span class="gm-label">Relation</span>
        <select class="gm-select" id="gm-dip-rel">
          <option value="allied">🤝 Allied</option>
          <option value="neutral">⚖️ Neutral</option>
          <option value="hostile">⚔️ Hostile</option>
          <option value="war">💀 War</option>
          <option value="trade_pact">🛒 Trade Pact</option>
          <option value="vassal">👑 Vassal</option>
        </select>
        <button class="gm-btn gm-btn-green" onclick="gmSetDiplomacy()">Set</button>
      </div>
    </div>

    <div class="gm-section">
      <h3>🗺️ Territory Control</h3>
      <div class="gm-row">
        <span class="gm-label">Region</span>
        <input class="gm-input" id="gm-terr-region" placeholder="Region name or ID">
        <span class="gm-label">Owner</span>
        <input class="gm-input" id="gm-terr-owner" placeholder="Nation or Guild name">
        <button class="gm-btn gm-btn-green" onclick="gmClaimTerritory()">🏴 Claim</button>
      </div>
    </div>
    <div id="gm-nations-status" class="gm-status"></div>
  `;
}

// ── MAIN RENDER ───────────────────────────────────────────────────────────────
export function initGMPanel() {
  if (document.getElementById("gm-panel")) return;

  // Inject styles
  const style = document.createElement("style");
  style.id = "gm-panel-styles";
  style.textContent = GM_STYLES;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "gm-panel";
  panel.innerHTML = `
    <div id="gm-header">
      <h1>⚙️ ARELORIA GM PANEL <span class="gm-badge gm-badge-admin">ADMIN</span></h1>
      <div style="display:flex;gap:10px;align-items:center">
        <span style="font-size:11px;color:#8ab0d0">Press F1 to toggle</span>
        <button id="gm-close">✕ Close</button>
      </div>
    </div>
    <div id="gm-tabs">
      <div class="gm-tab active" data-tab="world">🌍 World</div>
      <div class="gm-tab" data-tab="npc">👤 NPCs</div>
      <div class="gm-tab" data-tab="quest">📜 Quests</div>
      <div class="gm-tab" data-tab="glb">📦 3D Models</div>
      <div class="gm-tab" data-tab="economy">💰 Economy</div>
      <div class="gm-tab" data-tab="players">👥 Players</div>
      <div class="gm-tab" data-tab="nations">🏰 Nations</div>
    </div>
    <div id="gm-content"></div>
  `;
  document.body.appendChild(panel);

  // Tab switching
  panel.querySelectorAll(".gm-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      panel.querySelectorAll(".gm-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = (tab as HTMLElement).dataset.tab || "world";
      renderActiveTab();
    });
  });

  document.getElementById("gm-close")!.addEventListener("click", toggleGMPanel);

  // Prevent game key events when typing in GM panel
  panel.addEventListener("keydown", e => e.stopPropagation());
  panel.addEventListener("keyup", e => e.stopPropagation());

  renderActiveTab();
  registerGMFunctions();
}

function renderActiveTab() {
  const content = document.getElementById("gm-content");
  if (!content) return;
  switch (activeTab) {
    case "world": content.innerHTML = renderWorldTab(); break;
    case "npc": content.innerHTML = renderNPCTab(); break;
    case "quest": content.innerHTML = renderQuestTab(); break;
    case "glb": content.innerHTML = renderGLBTab(); break;
    case "economy": content.innerHTML = renderEconomyTab(); break;
    case "players": content.innerHTML = renderPlayersTab(); break;
    case "nations": content.innerHTML = renderNationsTab(); break;
  }
}

export function toggleGMPanel() {
  const panel = document.getElementById("gm-panel");
  if (!panel) { initGMPanel(); toggleGMPanel(); return; }
  panelOpen = !panelOpen;
  panel.classList.toggle("open", panelOpen);
}

export function closeGMPanel() {
  const panel = document.getElementById("gm-panel");
  if (panel && panelOpen) {
    panelOpen = false;
    panel.classList.remove("open");
  }
}

// ── GM FUNCTIONS (attached to window for onclick handlers) ────────────────────
function registerGMFunctions() {
  const w = window as any;

  w.gmSetWeather = () => {
    const weather = (document.getElementById("gm-weather") as HTMLSelectElement).value;
    gm({ type: "gm_set_weather", weather });
    showStatus("gm-world-status", `Weather set to: ${weather}`);
  };

  w.gmSetTime = () => {
    const time = parseInt((document.getElementById("gm-time") as HTMLInputElement).value);
    gm({ type: "gm_set_time", time });
    showStatus("gm-world-status", `Time set to: ${time}:00`);
  };

  w.gmSaveWorldSettings = () => {
    const settings = {
      pvp: (document.getElementById("gm-pvp") as HTMLInputElement).checked,
      friendlyFire: (document.getElementById("gm-ff") as HTMLInputElement).checked,
      infiniteWorld: (document.getElementById("gm-inf-world") as HTMLInputElement).checked,
      economySim: (document.getElementById("gm-econ-sim") as HTMLInputElement).checked,
      npcAI: (document.getElementById("gm-npc-ai") as HTMLInputElement).checked,
    };
    gm({ type: "gm_world_settings", settings });
    showStatus("gm-world-status", "World settings saved!");
  };

  w.gmTriggerWorldEvent = () => {
    const eventId = (document.getElementById("gm-event-id") as HTMLInputElement).value;
    const title = (document.getElementById("gm-event-title") as HTMLInputElement).value;
    const description = (document.getElementById("gm-event-desc") as HTMLInputElement).value;
    if (!eventId) { showStatus("gm-world-status", "Event ID required!", true); return; }
    gm({ type: "gm_world_event", eventId, title, description });
    showStatus("gm-world-status", `World event triggered: ${title}`);
  };

  w.gmQuickEvent = (eventId: string, title: string, description: string) => {
    gm({ type: "gm_world_event", eventId, title, description });
    showStatus("gm-world-status", `Event triggered: ${title}`);
  };

  w.gmPlaceObject = () => {
    const objectType = (document.getElementById("gm-obj-type") as HTMLSelectElement).value;
    const x = parseFloat((document.getElementById("gm-obj-x") as HTMLInputElement).value) || 0;
    const y = parseFloat((document.getElementById("gm-obj-y") as HTMLInputElement).value) || 0;
    gm({ type: "gm_place_object", objectType, x, y });
    showStatus("gm-world-status", `Placed ${objectType} at (${x}, ${y})`);
  };

  w.gmSpawnNPC = () => {
    const npcId = (document.getElementById("gm-npc-id") as HTMLInputElement).value;
    const name = (document.getElementById("gm-npc-name") as HTMLInputElement).value;
    const x = parseFloat((document.getElementById("gm-npc-x") as HTMLInputElement).value) || 40;
    const y = parseFloat((document.getElementById("gm-npc-y") as HTMLInputElement).value) || 40;
    const level = parseInt((document.getElementById("gm-npc-level") as HTMLInputElement).value) || 1;
    const hp = parseInt((document.getElementById("gm-npc-hp") as HTMLInputElement).value) || 100;
    if (!npcId) { showStatus("gm-npc-status", "NPC ID required!", true); return; }
    gm({ type: "gm_spawn_npc", npcId, name: name || npcId, x, y, level, hp });
    showStatus("gm-npc-status", `Spawned ${name || npcId} at (${x}, ${y})`);
  };

  w.gmSpawnNPCAtSelf = () => {
    const npcId = (document.getElementById("gm-npc-id") as HTMLInputElement).value;
    if (!npcId) { showStatus("gm-npc-status", "NPC ID required!", true); return; }
    gm({ type: "gm_spawn_npc_at_self", npcId });
    showStatus("gm-npc-status", `Spawned ${npcId} at your position`);
  };

  w.gmRemoveNPC = () => {
    const npcId = (document.getElementById("gm-npc-id") as HTMLInputElement).value;
    if (!npcId) { showStatus("gm-npc-status", "NPC ID required!", true); return; }
    gm({ type: "gm_remove_npc", npcId });
    showStatus("gm-npc-status", `Removed NPC: ${npcId}`);
  };

  w.gmQuickSpawn = (npcId: string, name: string) => {
    gm({ type: "gm_spawn_npc_at_self", npcId, name });
    showStatus("gm-npc-status", `Spawned ${name} near you`);
  };

  w.gmSaveDialogue = () => {
    const npcId = (document.getElementById("gm-dlg-npc") as HTMLInputElement).value;
    const text = (document.getElementById("gm-dlg-text") as HTMLTextAreaElement).value;
    const choicesRaw = (document.getElementById("gm-dlg-choices") as HTMLTextAreaElement).value;
    if (!npcId || !text) { showStatus("gm-npc-status", "NPC ID and text required!", true); return; }
    let choices = [];
    try { if (choicesRaw) choices = JSON.parse(choicesRaw); } catch {}
    gm({ type: "gm_save_dialogue", npcId, text, choices });
    showStatus("gm-npc-status", `Dialogue saved for ${npcId}`);
  };

  w.gmCreateQuest = () => {
    const questId = (document.getElementById("gm-q-id") as HTMLInputElement).value;
    const title = (document.getElementById("gm-q-title") as HTMLInputElement).value;
    const description = (document.getElementById("gm-q-desc") as HTMLTextAreaElement).value;
    const category = (document.getElementById("gm-q-cat") as HTMLSelectElement).value;
    const level = parseInt((document.getElementById("gm-q-level") as HTMLInputElement).value) || 1;
    const repeatable = (document.getElementById("gm-q-rep") as HTMLInputElement).checked;
    const giverNpc = (document.getElementById("gm-q-giver") as HTMLInputElement).value;
    const xp = parseInt((document.getElementById("gm-q-xp") as HTMLInputElement).value) || 100;
    const gold = parseInt((document.getElementById("gm-q-gold") as HTMLInputElement).value) || 50;
    const itemId = (document.getElementById("gm-q-item") as HTMLInputElement).value;
    if (!questId || !title) { showStatus("gm-quest-status", "Quest ID and title required!", true); return; }
    gm({ type: "gm_create_quest", questId, title, description, category, level, repeatable, giverNpc,
         rewards: { xp, gold, ...(itemId ? { itemId } : {}) } });
    showStatus("gm-quest-status", `Quest created: ${title}`);
  };

  w.gmQuestTemplate = (type: string) => {
    const templates: Record<string, any> = {
      kill: { id: "kill_quest_1", title: "Slay the Wolves", desc: "Kill 5 wolves threatening the village.", giver: "village_elder", xp: 150, gold: 75 },
      collect: { id: "collect_quest_1", title: "Gather Herbs", desc: "Collect 10 herb bundles.", giver: "herbalist", xp: 100, gold: 50 },
      talk: { id: "talk_quest_1", title: "Deliver the Message", desc: "Speak to the merchant in town.", giver: "innkeeper", xp: 80, gold: 30 },
      explore: { id: "explore_quest_1", title: "Map the Ruins", desc: "Explore the ancient ruins to the north.", giver: "cartographer", xp: 200, gold: 100 },
      escort: { id: "escort_quest_1", title: "Safe Passage", desc: "Escort the merchant safely to the next town.", giver: "merchant", xp: 250, gold: 150 },
      craft: { id: "craft_quest_1", title: "The Blacksmith's Request", desc: "Craft an iron sword for the blacksmith.", giver: "blacksmith", xp: 120, gold: 60 },
    };
    const t = templates[type];
    if (!t) return;
    (document.getElementById("gm-q-id") as HTMLInputElement).value = t.id;
    (document.getElementById("gm-q-title") as HTMLInputElement).value = t.title;
    (document.getElementById("gm-q-desc") as HTMLTextAreaElement).value = t.desc;
    (document.getElementById("gm-q-giver") as HTMLInputElement).value = t.giver;
    (document.getElementById("gm-q-xp") as HTMLInputElement).value = t.xp;
    (document.getElementById("gm-q-gold") as HTMLInputElement).value = t.gold;
    showStatus("gm-quest-status", `Template loaded: ${t.title}`);
  };

  w.gmRegisterGLB = () => {
    const path = (document.getElementById("gm-glb-path") as HTMLInputElement).value;
    const name = (document.getElementById("gm-glb-name") as HTMLInputElement).value;
    const category = (document.getElementById("gm-glb-cat") as HTMLSelectElement).value;
    if (!path || !name) { showStatus("gm-glb-status", "Path and name required!", true); return; }
    gm({ type: "gm_register_glb", path, name, category });
    showStatus("gm-glb-status", `Registered: ${name} → ${path}`);
  };

  w.gmListGLB = () => {
    gm({ type: "admin_glb_list" });
    showStatus("gm-glb-status", "Requesting model list...");
  };

  w.gmScanGLB = () => {
    gm({ type: "admin_glb_scan" });
    showStatus("gm-glb-status", "Scanning model folder...");
  };

  w.gmLinkGLB = () => {
    const glbPath = (document.getElementById("gm-link-path") as HTMLInputElement).value;
    const targetType = (document.getElementById("gm-link-type") as HTMLSelectElement).value;
    const targetId = (document.getElementById("gm-link-target") as HTMLInputElement).value;
    if (!glbPath || !targetId) { showStatus("gm-glb-status", "Path and target required!", true); return; }
    gm({ type: "admin_glb_link", glbPath, targetType, targetId });
    showStatus("gm-glb-status", `Linked ${glbPath} → ${targetType}:${targetId}`);
  };

  w.gmUnlinkGLB = () => {
    const targetType = (document.getElementById("gm-link-type") as HTMLSelectElement).value;
    const targetId = (document.getElementById("gm-link-target") as HTMLInputElement).value;
    if (!targetId) { showStatus("gm-glb-status", "Target required!", true); return; }
    gm({ type: "admin_glb_unlink", targetType, targetId });
    showStatus("gm-glb-status", `Unlinked ${targetType}:${targetId}`);
  };

  w.gmSetPrice = () => {
    const itemId = (document.getElementById("gm-price-item") as HTMLInputElement).value;
    const buy = parseInt((document.getElementById("gm-price-buy") as HTMLInputElement).value) || 0;
    const sell = parseInt((document.getElementById("gm-price-sell") as HTMLInputElement).value) || 0;
    if (!itemId) { showStatus("gm-econ-status", "Item ID required!", true); return; }
    gm({ type: "gm_set_price", itemId, buy, sell });
    showStatus("gm-econ-status", `Price set: ${itemId} buy=${buy} sell=${sell}`);
  };

  w.gmResetPrices = () => {
    gm({ type: "gm_reset_prices" });
    showStatus("gm-econ-status", "All prices reset to defaults");
  };

  w.gmTriggerEconEvent = () => {
    const eventType = (document.getElementById("gm-econ-event") as HTMLSelectElement).value;
    const duration = parseInt((document.getElementById("gm-econ-dur") as HTMLInputElement).value) || 300;
    gm({ type: "gm_economy_event", eventType, duration });
    showStatus("gm-econ-status", `Economy event triggered: ${eventType}`);
  };

  w.gmGetPlayers = () => {
    gm({ type: "gm_get_players" });
    showStatus("gm-players-status", "Requesting player list...");
  };

  w.gmGiveItem = () => {
    const player = (document.getElementById("gm-give-player") as HTMLInputElement).value;
    const item = (document.getElementById("gm-give-item") as HTMLInputElement).value;
    const amount = parseInt((document.getElementById("gm-give-amount") as HTMLInputElement).value) || 1;
    if (!player || !item) { showStatus("gm-players-status", "Player and item required!", true); return; }
    gm({ type: "gm_give_item", player, item, amount });
    showStatus("gm-players-status", `Gave ${amount}x ${item} to ${player}`);
  };

  w.gmTakeItem = () => {
    const player = (document.getElementById("gm-give-player") as HTMLInputElement).value;
    const item = (document.getElementById("gm-give-item") as HTMLInputElement).value;
    const amount = parseInt((document.getElementById("gm-give-amount") as HTMLInputElement).value) || 1;
    if (!player || !item) { showStatus("gm-players-status", "Player and item required!", true); return; }
    gm({ type: "gm_take_item", player, item, amount });
    showStatus("gm-players-status", `Took ${amount}x ${item} from ${player}`);
  };

  w.gmEditPlayer = () => {
    const player = (document.getElementById("gm-edit-player") as HTMLInputElement).value;
    const hp = parseInt((document.getElementById("gm-edit-hp") as HTMLInputElement).value);
    const gold = parseInt((document.getElementById("gm-edit-gold") as HTMLInputElement).value);
    const xp = parseInt((document.getElementById("gm-edit-xp") as HTMLInputElement).value);
    if (!player) { showStatus("gm-players-status", "Player name required!", true); return; }
    gm({ type: "gm_edit_player", player, hp: isNaN(hp) ? undefined : hp, gold: isNaN(gold) ? undefined : gold, xp: isNaN(xp) ? undefined : xp });
    showStatus("gm-players-status", `Updated stats for ${player}`);
  };

  w.gmRevivePlayer = () => {
    const player = (document.getElementById("gm-edit-player") as HTMLInputElement).value;
    if (!player) { showStatus("gm-players-status", "Player name required!", true); return; }
    gm({ type: "gm_revive", player });
    showStatus("gm-players-status", `Revived ${player}`);
  };

  w.gmKick = () => {
    const player = (document.getElementById("gm-mod-player") as HTMLInputElement).value;
    if (!player) { showStatus("gm-players-status", "Player name required!", true); return; }
    gm({ type: "gm_kick", player });
    showStatus("gm-players-status", `Kicked ${player}`);
  };

  w.gmBan = () => {
    const player = (document.getElementById("gm-mod-player") as HTMLInputElement).value;
    if (!player) { showStatus("gm-players-status", "Player name required!", true); return; }
    if (!confirm(`Ban player "${player}"?`)) return;
    gm({ type: "gm_ban", player });
    showStatus("gm-players-status", `Banned ${player}`);
  };

  w.gmMute = () => {
    const player = (document.getElementById("gm-mod-player") as HTMLInputElement).value;
    if (!player) { showStatus("gm-players-status", "Player name required!", true); return; }
    gm({ type: "gm_mute", player });
    showStatus("gm-players-status", `Muted ${player}`);
  };

  w.gmTeleport = () => {
    const player = (document.getElementById("gm-mod-player") as HTMLInputElement).value;
    const x = parseFloat((document.getElementById("gm-tp-x") as HTMLInputElement).value) || 0;
    const y = parseFloat((document.getElementById("gm-tp-y") as HTMLInputElement).value) || 0;
    if (!player) { showStatus("gm-players-status", "Player name required!", true); return; }
    gm({ type: "gm_teleport", player, x, y });
    showStatus("gm-players-status", `Teleported ${player} to (${x}, ${y})`);
  };

  w.gmPromote = () => {
    const player = (document.getElementById("gm-mod-player") as HTMLInputElement).value;
    if (!player) { showStatus("gm-players-status", "Player name required!", true); return; }
    if (!confirm(`Promote "${player}" to GM?`)) return;
    gm({ type: "gm_promote", player });
    showStatus("gm-players-status", `Promoted ${player} to GM`);
  };

  w.gmBroadcast = () => {
    const channel = (document.getElementById("gm-bc-channel") as HTMLSelectElement).value;
    const message = (document.getElementById("gm-bc-msg") as HTMLInputElement).value;
    const color = (document.getElementById("gm-bc-color") as HTMLInputElement).value;
    if (!message) { showStatus("gm-players-status", "Message required!", true); return; }
    gm({ type: "gm_broadcast", channel, message, color });
    showStatus("gm-players-status", "Broadcast sent!");
  };

  w.gmCreateNation = () => {
    const name = (document.getElementById("gm-nat-name") as HTMLInputElement).value;
    const leader = (document.getElementById("gm-nat-leader") as HTMLInputElement).value;
    const capitalX = parseFloat((document.getElementById("gm-nat-cx") as HTMLInputElement).value) || 0;
    const capitalY = parseFloat((document.getElementById("gm-nat-cy") as HTMLInputElement).value) || 0;
    const radius = parseInt((document.getElementById("gm-nat-radius") as HTMLInputElement).value) || 200;
    if (!name) { showStatus("gm-nations-status", "Nation name required!", true); return; }
    gm({ type: "gm_create_nation", name, leader, capitalX, capitalY, radius });
    showStatus("gm-nations-status", `Nation "${name}" founded!`);
  };

  w.gmSetDiplomacy = () => {
    const nationA = (document.getElementById("gm-dip-a") as HTMLInputElement).value;
    const nationB = (document.getElementById("gm-dip-b") as HTMLInputElement).value;
    const relation = (document.getElementById("gm-dip-rel") as HTMLSelectElement).value;
    if (!nationA || !nationB) { showStatus("gm-nations-status", "Both nations required!", true); return; }
    gm({ type: "gm_diplomacy", nationA, nationB, relation });
    showStatus("gm-nations-status", `${nationA} ↔ ${nationB}: ${relation}`);
  };

  w.gmClaimTerritory = () => {
    const region = (document.getElementById("gm-terr-region") as HTMLInputElement).value;
    const owner = (document.getElementById("gm-terr-owner") as HTMLInputElement).value;
    if (!region) { showStatus("gm-nations-status", "Region required!", true); return; }
    gm({ type: "gm_claim_territory", region, owner });
    showStatus("gm-nations-status", `${region} claimed by ${owner}`);
  };
}

// ── Handle incoming GM responses ──────────────────────────────────────────────
export function handleGMMessage(msg: any) {
  if (msg.type === "admin_glb_list_result") {
    const el = document.getElementById("gm-glb-list");
    if (!el) return;
    if (!msg.links || msg.links.length === 0) {
      el.innerHTML = "<em>No models registered yet.</em>";
      return;
    }
    el.innerHTML = msg.links.map((l: any) =>
      `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="color:#64b4ff">${l.glbPath}</span>
        → <span style="color:#80c880">${l.targetType}:${l.targetId}</span>
      </div>`
    ).join("");
  }

  if (msg.type === "admin_glb_scan_result") {
    const el = document.getElementById("gm-glb-list");
    if (!el) return;
    if (!msg.models || msg.models.length === 0) {
      el.innerHTML = "<em>No GLB files found in models folder.</em>";
      return;
    }
    el.innerHTML = "<strong style='color:#64b4ff'>Found models:</strong><br>" +
      msg.models.map((m: string) => `<span class="gm-tag">${m}</span>`).join("");
  }

  if (msg.type === "gm_player_list") {
    const el = document.getElementById("gm-player-list");
    if (!el) return;
    if (!msg.players || msg.players.length === 0) {
      el.innerHTML = "<em style='color:#8ab0d0'>No players online.</em>";
      return;
    }
    el.innerHTML = msg.players.map((p: any) =>
      `<div class="gm-player-row">
        <span style="color:#c8d8f0;min-width:120px">${p.name}</span>
        <span style="color:#8ab0d0">Lv.${p.level}</span>
        <span style="color:#ff8080">HP: ${p.hp}</span>
        <span style="color:#ffd700">Gold: ${p.gold}</span>
        <button class="gm-btn" style="padding:3px 8px;font-size:10px" onclick="document.getElementById('gm-mod-player').value='${p.name}'">Select</button>
      </div>`
    ).join("");
  }
}
