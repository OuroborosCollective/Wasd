/**
 * GLB Manager – Upload, manage and place 3D models on player land
 */

let glbManagerVisible = false;
let currentPlayerId = "";
let currentPlayerName = "";
let myModels: any[] = [];
let myLand: any = null;

export function initGLBManager(playerId: string, playerName: string) {
  currentPlayerId = playerId;
  currentPlayerName = playerName;
  createGLBManagerUI();
}

function createGLBManagerUI() {
  const existing = document.getElementById("glb-manager");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "glb-manager";
  panel.style.cssText = `
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(800px, 96vw);
    max-height: 90vh;
    background: linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 100%);
    border: 2px solid #aa44ff;
    border-radius: 16px;
    box-shadow: 0 0 40px rgba(170,68,255,0.3);
    z-index: 10000;
    overflow-y: auto;
    font-family: 'Segoe UI', sans-serif;
    color: #e0e8ff;
  `;

  panel.innerHTML = `
    <div style="padding:24px;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #2a1a4a; padding-bottom:16px;">
        <div>
          <h2 style="margin:0; font-size:22px; color:#aa44ff;">🎨 GLB Modell-Manager</h2>
          <p style="margin:4px 0 0; font-size:12px; color:#7a6a9a;">Lade eigene 3D-Modelle hoch und platziere sie auf deinem Land</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <div id="glb-sub-badge" style="font-size:12px; padding:4px 10px; border-radius:6px; border:1px solid #555;"></div>
          <button onclick="document.getElementById('glb-manager').style.display='none'"
            style="background:none; border:1px solid #ff4444; color:#ff4444; border-radius:6px; padding:6px 12px; cursor:pointer;">✕</button>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex; gap:8px; margin-bottom:20px;">
        <button class="glb-tab active-glb" data-tab="upload" onclick="switchGLBTab('upload')"
          style="flex:1; padding:10px; background:#1a0a3a; border:1px solid #aa44ff; border-radius:8px; color:#aa44ff; cursor:pointer; font-size:13px;">
          📤 Hochladen
        </button>
        <button class="glb-tab" data-tab="models" onclick="switchGLBTab('models')"
          style="flex:1; padding:10px; background:#0a1520; border:1px solid #3a2a5c; border-radius:8px; color:#7a6a9a; cursor:pointer; font-size:13px;">
          📦 Meine Modelle
        </button>
        <button class="glb-tab" data-tab="land" onclick="switchGLBTab('land')"
          style="flex:1; padding:10px; background:#0a1520; border:1px solid #3a2a5c; border-radius:8px; color:#7a6a9a; cursor:pointer; font-size:13px;">
          🏗️ Mein Land
        </button>
        <button class="glb-tab" data-tab="sell" onclick="switchGLBTab('sell')"
          style="flex:1; padding:10px; background:#0a1520; border:1px solid #3a2a5c; border-radius:8px; color:#7a6a9a; cursor:pointer; font-size:13px;">
          💰 Verkaufen
        </button>
      </div>

      <!-- Upload Tab -->
      <div id="glb-tab-upload" class="glb-tab-content">
        <div id="glb-no-sub-warning" style="display:none; background:#2a0a0a; border:1px solid #ff4444; border-radius:8px; padding:16px; margin-bottom:16px; text-align:center;">
          <p style="color:#ff6666; margin:0 0 12px;">❌ Du benötigst den GLB Creator Pass um Modelle hochzuladen.</p>
          <button onclick="openShopForGLB()"
            style="background:#aa44ff; border:none; color:white; padding:10px 24px; border-radius:8px; cursor:pointer; font-size:14px;">
            🛒 GLB Creator Pass kaufen (15€/Monat)
          </button>
        </div>

        <div id="glb-upload-form">
          <div id="glb-drop-zone"
            style="border:2px dashed #aa44ff; border-radius:12px; padding:40px; text-align:center; cursor:pointer; transition:all 0.2s; margin-bottom:16px;"
            onclick="document.getElementById('glb-file-input').click()"
            ondragover="event.preventDefault(); this.style.background='#1a0a3a'"
            ondragleave="this.style.background='transparent'"
            ondrop="handleGLBDrop(event)">
            <div style="font-size:48px; margin-bottom:12px;">📁</div>
            <p style="color:#aa44ff; font-size:16px; margin:0 0 8px;">GLB/GLTF Datei hier ablegen</p>
            <p style="color:#7a6a9a; font-size:12px; margin:0;">oder klicken zum Auswählen · Max. 50 MB</p>
          </div>
          <input type="file" id="glb-file-input" accept=".glb,.gltf" style="display:none" onchange="handleGLBFileSelect(this)">

          <div style="display:flex; gap:12px; margin-bottom:16px;">
            <input id="glb-model-name" type="text" placeholder="Modell-Name (optional)"
              style="flex:1; background:#0d2a3a; border:1px solid #2a1a5c; border-radius:8px; padding:10px; color:#e0e8ff; font-size:13px;">
            <button id="glb-upload-btn" onclick="uploadGLBModel()" disabled
              style="background:#3a1a6a; border:1px solid #aa44ff; color:#aa44ff; border-radius:8px; padding:10px 20px; cursor:not-allowed; font-size:13px; opacity:0.5;">
              📤 Hochladen
            </button>
          </div>

          <div id="glb-upload-progress" style="display:none; margin-bottom:16px;">
            <div style="background:#0d2a3a; border-radius:8px; overflow:hidden; height:8px;">
              <div id="glb-progress-bar" style="height:100%; background:#aa44ff; width:0%; transition:width 0.3s;"></div>
            </div>
            <p id="glb-upload-status" style="color:#7a6a9a; font-size:12px; margin:8px 0 0; text-align:center;"></p>
          </div>
        </div>
      </div>

      <!-- My Models Tab -->
      <div id="glb-tab-models" class="glb-tab-content" style="display:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="color:#7a6a9a; font-size:13px;" id="model-count">Lade...</span>
          <button onclick="loadMyModels()" style="background:#0d2a3a; border:1px solid #aa44ff; color:#aa44ff; border-radius:6px; padding:6px 12px; cursor:pointer; font-size:12px;">🔄 Aktualisieren</button>
        </div>
        <div id="my-models-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:12px;"></div>
      </div>

      <!-- Land Tab -->
      <div id="glb-tab-land" class="glb-tab-content" style="display:none;">
        <div id="land-info"></div>
        <div id="land-structures"></div>
      </div>

      <!-- Sell Tab -->
      <div id="glb-tab-sell" class="glb-tab-content" style="display:none;">
        <p style="font-size:13px; color:#7a9ab5; margin-bottom:16px;">
          Wähle ein Modell aus deiner Bibliothek und setze einen Preis in Matrix Energy.
          Käufer erhalten eine Kopie des Modells. Du erhältst 90% des Verkaufspreises.
        </p>
        <div id="sell-models-list"></div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Inject globals
  (window as any).switchGLBTab = switchGLBTab;
  (window as any).handleGLBDrop = handleGLBDrop;
  (window as any).handleGLBFileSelect = handleGLBFileSelect;
  (window as any).uploadGLBModel = uploadGLBModel;
  (window as any).loadMyModels = loadMyModels;
  (window as any).deleteGLBModel = deleteGLBModel;
  (window as any).listModelForSale = listModelForSale;
  (window as any).openShopForGLB = () => {
    document.getElementById("glb-manager")!.style.display = "none";
    import("./shopPanel.js").then(m => m.openShop("glb"));
  };

  checkGLBSubscription();
}

let selectedFile: File | null = null;

function handleGLBDrop(e: DragEvent) {
  e.preventDefault();
  const dropZone = document.getElementById("glb-drop-zone")!;
  dropZone.style.background = "transparent";
  const file = e.dataTransfer?.files[0];
  if (file) setGLBFile(file);
}

function handleGLBFileSelect(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (file) setGLBFile(file);
}

function setGLBFile(file: File) {
  selectedFile = file;
  const dropZone = document.getElementById("glb-drop-zone")!;
  const uploadBtn = document.getElementById("glb-upload-btn") as HTMLButtonElement;
  const nameInput = document.getElementById("glb-model-name") as HTMLInputElement;

  dropZone.innerHTML = `
    <div style="font-size:32px; margin-bottom:8px;">✅</div>
    <p style="color:#44ff44; font-size:14px; margin:0 0 4px;">${file.name}</p>
    <p style="color:#7a9ab5; font-size:12px; margin:0;">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
  `;

  if (!nameInput.value) {
    nameInput.value = file.name.replace(/\.(glb|gltf)$/i, "");
  }

  uploadBtn.disabled = false;
  uploadBtn.style.opacity = "1";
  uploadBtn.style.cursor = "pointer";
  uploadBtn.style.background = "#6a1aaa";
}

async function uploadGLBModel() {
  if (!selectedFile) return;

  const nameInput = document.getElementById("glb-model-name") as HTMLInputElement;
  const progressDiv = document.getElementById("glb-upload-progress")!;
  const progressBar = document.getElementById("glb-progress-bar")!;
  const statusEl = document.getElementById("glb-upload-status")!;
  const uploadBtn = document.getElementById("glb-upload-btn") as HTMLButtonElement;

  progressDiv.style.display = "block";
  uploadBtn.disabled = true;
  statusEl.textContent = "Lade hoch...";

  const formData = new FormData();
  formData.append("model", selectedFile);
  formData.append("name", nameInput.value || selectedFile.name);

  try {
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 10, 90);
      progressBar.style.width = progress + "%";
    }, 200);

    const res = await fetch("/api/glb/upload", {
      method: "POST",
      headers: { "x-player-id": currentPlayerId },
      body: formData,
    });

    clearInterval(progressInterval);
    progressBar.style.width = "100%";

    const data = await res.json();

    if (data.success) {
      statusEl.textContent = `✅ "${data.name}" erfolgreich hochgeladen!`;
      statusEl.style.color = "#44ff44";
      selectedFile = null;
      nameInput.value = "";
      setTimeout(() => {
        progressDiv.style.display = "none";
        progressBar.style.width = "0%";
        statusEl.style.color = "#7a6a9a";
        document.getElementById("glb-drop-zone")!.innerHTML = `
          <div style="font-size:48px; margin-bottom:12px;">📁</div>
          <p style="color:#aa44ff; font-size:16px; margin:0 0 8px;">GLB/GLTF Datei hier ablegen</p>
          <p style="color:#7a6a9a; font-size:12px; margin:0;">oder klicken zum Auswählen · Max. 50 MB</p>
        `;
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = "0.5";
      }, 2000);
    } else {
      statusEl.textContent = `❌ Fehler: ${data.error}`;
      statusEl.style.color = "#ff4444";
    }
  } catch (e) {
    statusEl.textContent = "❌ Upload fehlgeschlagen. Bitte erneut versuchen.";
    statusEl.style.color = "#ff4444";
  }
}

async function checkGLBSubscription() {
  const badge = document.getElementById("glb-sub-badge")!;
  const warning = document.getElementById("glb-no-sub-warning")!;

  try {
    const res = await fetch("/api/glb/subscription-status", {
      headers: { "x-player-id": currentPlayerId }
    });
    const data = await res.json();

    if (data.active) {
      badge.style.background = "#0a2a0a";
      badge.style.borderColor = "#44ff44";
      badge.style.color = "#44ff44";
      badge.textContent = `✅ Creator Pass · ${data.daysLeft}d`;
      warning.style.display = "none";
    } else {
      badge.style.background = "#2a0a0a";
      badge.style.borderColor = "#ff4444";
      badge.style.color = "#ff4444";
      badge.textContent = "❌ Kein Creator Pass";
      warning.style.display = "block";
    }
  } catch {}
}

async function loadMyModels() {
  const grid = document.getElementById("my-models-grid")!;
  const countEl = document.getElementById("model-count")!;
  grid.innerHTML = '<div style="color:#7a6a9a; text-align:center; padding:20px; grid-column:1/-1;">Lade...</div>';

  try {
    const res = await fetch("/api/glb/my-models", {
      headers: { "x-player-id": currentPlayerId }
    });
    const data = await res.json();
    myModels = data.models || [];
    countEl.textContent = `${myModels.length} / 20 Modelle`;

    if (myModels.length === 0) {
      grid.innerHTML = '<div style="color:#7a6a9a; text-align:center; padding:40px; grid-column:1/-1;">Noch keine Modelle hochgeladen</div>';
      return;
    }

    grid.innerHTML = myModels.map((m: any) => `
      <div style="background:#0d1a2a; border:1px solid #2a1a4a; border-radius:8px; padding:12px; text-align:center;">
        <div style="font-size:36px; margin-bottom:8px;">🎨</div>
        <div style="font-size:12px; color:#e0e8ff; font-weight:bold; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${m.name}">${m.name}</div>
        <div style="font-size:11px; color:#7a6a9a; margin-bottom:8px;">${(m.file_size / 1024).toFixed(0)} KB</div>
        ${m.marketplace_listed ? `<div style="font-size:11px; color:#ffaa00; margin-bottom:8px;">💰 Im Marktplatz (${m.marketplace_price} ⚡)</div>` : ""}
        <div style="display:flex; gap:4px; flex-wrap:wrap; justify-content:center;">
          <button onclick="placeModelOnLand('${m.id}', '${m.name}', '${m.file_path}')"
            style="background:#0d2a3a; border:1px solid #00d4ff; color:#00d4ff; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:10px;">
            🏗️ Platzieren
          </button>
          <button onclick="listModelForSale('${m.id}', '${m.name}')"
            style="background:#0d2a3a; border:1px solid #ffaa00; color:#ffaa00; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:10px;">
            💰 Verkaufen
          </button>
          <button onclick="deleteGLBModel('${m.id}', '${m.name}')"
            style="background:#2a0a0a; border:1px solid #ff4444; color:#ff4444; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:10px;">
            🗑️
          </button>
        </div>
      </div>
    `).join("");

    // Add place and list functions
    (window as any).placeModelOnLand = placeModelOnLand;
  } catch {
    grid.innerHTML = '<div style="color:#ff4444; text-align:center; padding:40px; grid-column:1/-1;">Fehler beim Laden</div>';
  }
}

async function placeModelOnLand(modelId: string, name: string, filePath: string) {
  // Get current player position from game world
  const playerPos = (window as any).__playerPosition || { x: 0, y: 0, z: 0 };

  if (!myLand) {
    const res = await fetch("/api/land/mine", { headers: { "x-player-id": currentPlayerId } });
    const data = await res.json();
    myLand = data.land;
  }

  if (!myLand) {
    alert("Du besitzt noch kein Land! Beanspruche zuerst ein Grundstück im Welt-Editor.");
    return;
  }

  const scale = parseFloat(prompt(`Skalierung für "${name}" (0.1 - 10, Standard: 1.0):`, "1.0") || "1.0");
  if (isNaN(scale)) return;

  try {
    const res = await fetch("/api/land/structure", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-player-id": currentPlayerId },
      body: JSON.stringify({
        landId: myLand.id,
        type: "glb_model",
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z,
        rotY: 0,
        scale: Math.max(0.1, Math.min(10, scale)),
        glbPath: filePath,
        name,
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ "${name}" auf deinem Land platziert!`);
      // Notify game world to render the new model
      (window as any).__onModelPlaced?.(data.structure);
    } else {
      alert(`❌ ${data.error}`);
    }
  } catch {
    alert("Verbindungsfehler");
  }
}

async function deleteGLBModel(modelId: string, name: string) {
  if (!confirm(`"${name}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) return;

  try {
    const res = await fetch(`/api/glb/${modelId}`, {
      method: "DELETE",
      headers: { "x-player-id": currentPlayerId },
    });
    const data = await res.json();
    if (data.success) {
      loadMyModels();
    } else {
      alert("Löschen fehlgeschlagen");
    }
  } catch {
    alert("Verbindungsfehler");
  }
}

async function listModelForSale(modelId: string, name: string) {
  const priceStr = prompt(`Preis für "${name}" in Matrix Energy (1 - 100000):`);
  if (!priceStr) return;
  const price = parseInt(priceStr);
  if (isNaN(price) || price < 1 || price > 100000) {
    alert("Ungültiger Preis. Bitte 1-100000 eingeben.");
    return;
  }

  try {
    const res = await fetch("/api/glb/marketplace/list", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-player-id": currentPlayerId },
      body: JSON.stringify({ modelId, price }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ "${name}" für ${price} Matrix Energy im Marktplatz gelistet!`);
      loadMyModels();
    } else {
      alert(`❌ ${data.error}`);
    }
  } catch {
    alert("Verbindungsfehler");
  }
}

function switchGLBTab(tab: string) {
  document.querySelectorAll(".glb-tab-content").forEach((el: any) => el.style.display = "none");
  document.querySelectorAll(".glb-tab").forEach((el: any) => {
    el.style.background = "#0a1520";
    el.style.borderColor = "#3a2a5c";
    el.style.color = "#7a6a9a";
  });

  const content = document.getElementById(`glb-tab-${tab}`);
  if (content) content.style.display = "block";

  const btn = document.querySelector(`[data-tab="${tab}"]`) as HTMLElement;
  if (btn) {
    btn.style.background = "#1a0a3a";
    btn.style.borderColor = "#aa44ff";
    btn.style.color = "#aa44ff";
  }

  if (tab === "models") loadMyModels();
  if (tab === "land") loadLandInfo();
  if (tab === "sell") loadSellTab();
}

async function loadLandInfo() {
  const infoEl = document.getElementById("land-info")!;
  const structEl = document.getElementById("land-structures")!;

  try {
    const res = await fetch("/api/land/mine", { headers: { "x-player-id": currentPlayerId } });
    const data = await res.json();
    myLand = data.land;

    if (!myLand) {
      infoEl.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <div style="font-size:48px; margin-bottom:16px;">🏕️</div>
          <p style="color:#7a9ab5; margin-bottom:16px;">Du besitzt noch kein Land.</p>
          <p style="font-size:12px; color:#5a7a9a;">Land beanspruchen kostet 500 Matrix Energy.<br>Öffne den Welt-Editor (Taste: L) um Land zu beanspruchen.</p>
        </div>
      `;
      structEl.innerHTML = "";
      return;
    }

    infoEl.innerHTML = `
      <div style="background:#0d1a2a; border:1px solid #2a1a4a; border-radius:8px; padding:16px; margin-bottom:16px;">
        <h3 style="margin:0 0 8px; color:#aa44ff;">${myLand.name}</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; color:#7a9ab5;">
          <span>📍 Position: ${Math.round(myLand.x)}, ${Math.round(myLand.y)}</span>
          <span>📐 Radius: ${myLand.radius}m</span>
          <span>🏗️ Strukturen: ${myLand.structures?.length || 0}</span>
          <span>📅 Seit: ${new Date(myLand.claimedAt).toLocaleDateString('de-DE')}</span>
        </div>
      </div>
    `;

    if (myLand.structures && myLand.structures.length > 0) {
      structEl.innerHTML = `
        <h4 style="color:#aa44ff; margin:0 0 12px;">Platzierte Strukturen (${myLand.structures.length})</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:8px;">
          ${myLand.structures.map((s: any) => `
            <div style="background:#0d1a2a; border:1px solid #2a1a4a; border-radius:6px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:12px; color:#e0e8ff;">${s.name || s.type}</div>
                <div style="font-size:10px; color:#7a6a9a;">${s.type} · Skala: ${s.scale}</div>
              </div>
              <button onclick="removeStructure('${myLand.id}', '${s.id}')"
                style="background:#2a0a0a; border:1px solid #ff4444; color:#ff4444; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:10px;">
                🗑️
              </button>
            </div>
          `).join("")}
        </div>
      `;
      (window as any).removeStructure = removeStructure;
    } else {
      structEl.innerHTML = '<p style="color:#7a6a9a; font-size:13px; text-align:center;">Noch keine Strukturen auf deinem Land.</p>';
    }
  } catch {
    infoEl.innerHTML = '<p style="color:#ff4444;">Fehler beim Laden der Land-Daten.</p>';
  }
}

async function removeStructure(landId: string, structId: string) {
  if (!confirm("Struktur entfernen?")) return;
  try {
    await fetch(`/api/land/structure/${structId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-player-id": currentPlayerId },
      body: JSON.stringify({ landId }),
    });
    loadLandInfo();
  } catch {}
}

async function loadSellTab() {
  const sellList = document.getElementById("sell-models-list")!;
  if (myModels.length === 0) {
    await loadMyModels();
  }
  if (myModels.length === 0) {
    sellList.innerHTML = '<p style="color:#7a6a9a; text-align:center;">Keine Modelle vorhanden. Lade zuerst Modelle hoch.</p>';
    return;
  }
  sellList.innerHTML = myModels.map((m: any) => `
    <div style="background:#0d1a2a; border:1px solid #2a1a4a; border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div>
        <div style="font-size:14px; color:#e0e8ff;">${m.name}</div>
        <div style="font-size:11px; color:#7a6a9a;">${(m.file_size / 1024).toFixed(0)} KB</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${m.marketplace_listed
          ? `<span style="color:#ffaa00; font-size:12px;">💰 ${m.marketplace_price} ⚡</span>`
          : ""
        }
        <button onclick="listModelForSale('${m.id}', '${m.name}')"
          style="background:#1a1a0a; border:1px solid #ffaa00; color:#ffaa00; border-radius:6px; padding:6px 14px; cursor:pointer; font-size:12px;">
          ${m.marketplace_listed ? "Preis ändern" : "Zum Verkauf anbieten"}
        </button>
      </div>
    </div>
  `).join("");
}

export function toggleGLBManager() {
  const panel = document.getElementById("glb-manager");
  if (!panel) return;
  glbManagerVisible = !glbManagerVisible;
  panel.style.display = glbManagerVisible ? "block" : "none";
  if (glbManagerVisible) checkGLBSubscription();
}

export function openGLBManager(tab?: string) {
  const panel = document.getElementById("glb-manager");
  if (!panel) return;
  panel.style.display = "block";
  glbManagerVisible = true;
  if (tab) switchGLBTab(tab);
  checkGLBSubscription();
}
