const state = {
  ws: null,
  connected: false,
  playerId: null,
  entities: [],
  gmToken: "",
  heatmapEnabled: true,
  heatmapResolution: 18,
  preview: {
    players: [],
    npcs: [],
    weather: "clear",
    time: "00:00",
    heatmap: null,
  },
  admin: {
    scannedModels: [],
    links: [],
  },
};

function byId(id) {
  return document.getElementById(id);
}

function logLine(text, level = "info") {
  const log = byId("log");
  const line = document.createElement("div");
  line.className = `line ${level}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  log.prepend(line);
}

function setStatus(text, ok) {
  const el = byId("connStatus");
  if (!el) return;
  el.textContent = text;
  el.className = ok ? "status ok" : "status err";
}

function send(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    logLine("Socket not connected", "bad");
    return;
  }
  const message = { ...payload };
  if (state.gmToken) {
    message.gmToken = state.gmToken;
  }
  state.ws.send(JSON.stringify(message));
}

function safeSetValue(id, value) {
  const el = byId(id);
  if (!el) return;
  el.value = value;
}

function bindClick(id, handler) {
  const el = byId(id);
  if (!el) return;
  el.onclick = handler;
}

function renderAdminState() {
  safeSetValue("adminModels", JSON.stringify(state.admin.scannedModels, null, 2));
  safeSetValue("adminLinks", JSON.stringify(state.admin.links, null, 2));
}

function updatePreviewCanvas() {
  const canvas = byId("preview");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#070b13";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#1d2d4d";
  for (let i = 0; i <= 10; i++) {
    const x = (w / 10) * i;
    const y = (h / 10) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (state.heatmapEnabled && state.preview.heatmap?.grid) {
    const hm = state.preview.heatmap;
    const minX = Number(hm.minX || -50);
    const minY = Number(hm.minY || -50);
    const maxX = Number(hm.maxX || 50);
    const maxY = Number(hm.maxY || 50);
    const cols = Math.max(1, Number(hm.cols || 1));
    const rows = Math.max(1, Number(hm.rows || 1));
    const cellW = (maxX - minX) / cols;
    const cellH = (maxY - minY) / rows;
    const maxVal = Math.max(1, Number(hm.max || 1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const value = Number(hm.grid[r]?.[c] || 0);
        if (value <= 0) continue;
        const intensity = Math.min(1, value / maxVal);
        const worldX = minX + c * cellW + cellW / 2;
        const worldY = minY + r * cellH + cellH / 2;
        const sx = w / 2 + worldX * 4;
        const sy = h / 2 + worldY * 4;
        const sw = Math.max(2, cellW * 4);
        const sh = Math.max(2, cellH * 4);
        ctx.fillStyle = `rgba(255, 80, 20, ${0.12 + intensity * 0.38})`;
        ctx.fillRect(sx - sw / 2, sy - sh / 2, sw, sh);
      }
    }
  }

  const drawPoint = (x, y, color, label) => {
    const sx = w / 2 + x * 4;
    const sy = h / 2 + y * 4;
    if (sx < -10 || sy < -10 || sx > w + 10 || sy > h + 10) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cfd9ff";
    ctx.font = "11px sans-serif";
    ctx.fillText(label, sx + 6, sy - 4);
  };

  state.preview.players.forEach((p) => {
    drawPoint(p.x || 0, p.y || 0, p.online ? "#4ce887" : "#708090", p.name || p.id || "player");
  });
  state.preview.npcs.forEach((n) => {
    drawPoint(n.x || 0, n.y || 0, "#f08f3a", n.name || n.id || "npc");
  });

  byId("previewMeta").textContent =
    `Weather: ${state.preview.weather} | Time: ${state.preview.time} | Players: ${state.preview.players.length} | NPCs: ${state.preview.npcs.length} | Heatmap: ${state.heatmapEnabled ? "on" : "off"}`;
}

function handleMessage(msg) {
  if (msg.type === "welcome") {
    state.playerId = msg.playerId || msg.id || null;
    logLine(`Logged in as ${state.playerId || "unknown"}`, "ok");
    send({ type: "gm_preview_request" });
    send({ type: "gm_get_players" });
    return;
  }
  if (msg.type === "entity_sync") {
    state.entities = Array.isArray(msg.entities) ? msg.entities : [];
    return;
  }
  if (msg.type === "gm_status") {
    logLine(msg.message || "gm_status", msg.level === "error" ? "bad" : "ok");
    return;
  }
  if (msg.type === "admin_glb_scan_result") {
    state.admin.scannedModels = Array.isArray(msg.models) ? msg.models : [];
    renderAdminState();
    logLine(`Scanned ${state.admin.scannedModels.length} model(s).`, "ok");
    return;
  }
  if (msg.type === "admin_glb_list_result") {
    state.admin.links = Array.isArray(msg.links) ? msg.links : [];
    renderAdminState();
    logLine(`Loaded ${state.admin.links.length} link(s).`, "ok");
    return;
  }
  if (msg.type === "gm_player_list") {
    state.preview.players = msg.players || [];
    renderPlayersTable();
    updatePreviewCanvas();
    return;
  }
  if (msg.type === "gm_preview_snapshot") {
    state.preview.players = msg.players || [];
    state.preview.npcs = msg.npcs || [];
    state.preview.weather = msg.world?.weather || "clear";
    state.preview.time = msg.world?.time || "00:00";
    state.preview.heatmap = msg.heatmap || null;
    renderPlayersTable();
    renderHeatList();
    updatePreviewCanvas();
    return;
  }
  if (msg.type === "error") {
    logLine(msg.message || "Server error", "bad");
    return;
  }
}

function renderPlayersTable() {
  const tbody = byId("playersTable");
  if (!tbody) return;
  const rows = (state.preview.players || [])
    .map((p) => {
      const role = p.role || "-";
      const hp = Number.isFinite(Number(p.hp)) ? Number(p.hp) : "-";
      const posX = Number.isFinite(Number(p.x)) ? Number(p.x).toFixed(1) : "-";
      const posY = Number.isFinite(Number(p.y)) ? Number(p.y).toFixed(1) : "-";
      const label = p.name || p.id || "unknown";
      return `<tr><td>${label}</td><td>${posX}, ${posY}</td><td>${role}</td><td>${hp}</td></tr>`;
    })
    .join("");
  tbody.innerHTML = rows || `<tr><td colspan="4" style="opacity:.7">No players</td></tr>`;
}

function renderHeatList() {
  const box = byId("heatList");
  if (!box) return;
  const hm = state.preview.heatmap;
  if (!hm || !Array.isArray(hm.grid)) {
    box.innerHTML = `<div style="opacity:.7">No heatmap data yet.</div>`;
    return;
  }
  const entries = [];
  for (let r = 0; r < hm.grid.length; r++) {
    const row = hm.grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      const v = Number(row[c] || 0);
      if (v > 0) entries.push({ r, c, v });
    }
  }
  entries.sort((a, b) => b.v - a.v);
  const top = entries.slice(0, 8);
  if (top.length === 0) {
    box.innerHTML = `<div style="opacity:.7">No hotspots yet.</div>`;
    return;
  }
  box.innerHTML = top
    .map((e, idx) => `<div class="heat-row"><span>#${idx + 1} Cell (${e.c}, ${e.r})</span><strong>${e.v}</strong></div>`)
    .join("");
}

function connect() {
  const wsUrl = byId("wsUrl").value.trim();
  const token = byId("token").value.trim();
  const gmToken = byId("gmToken").value.trim();
  const sceneId = byId("sceneId").value.trim() || "didis_hub";
  const spawnKey = byId("spawnKey").value.trim() || "sp_player_default";
  if (!wsUrl) {
    logLine("WS URL required", "bad");
    return;
  }

  if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
    state.ws.close();
  }

  const ws = new WebSocket(wsUrl);
  state.ws = ws;
  state.gmToken = gmToken;
  setStatus("Connecting…", false);

  ws.onopen = () => {
    state.connected = true;
    setStatus("Connected", true);
    logLine("WebSocket connected", "ok");
    send({ type: "login", token: token || undefined, sceneId, spawnKey });
  };
  ws.onclose = () => {
    state.connected = false;
    setStatus("Disconnected", false);
    logLine("WebSocket disconnected", "bad");
  };
  ws.onerror = () => {
    logLine("WebSocket error", "bad");
  };
  ws.onmessage = (evt) => {
    try {
      handleMessage(JSON.parse(evt.data));
    } catch {
      logLine("Invalid JSON from server", "bad");
    }
  };
}

function cmd(type, payload = {}) {
  send({ type, ...payload });
}

function val(id) {
  const el = byId(id);
  if (!el || typeof el.value !== "string") return "";
  return el.value.trim();
}

function initBindings() {
  bindClick("connectBtn", connect);
  bindClick("previewRefresh", () => {
    cmd("gm_preview_request");
    cmd("gm_get_players");
  });

  bindClick("heatmapToggle", () => {
    state.heatmapEnabled = !state.heatmapEnabled;
    const btn = byId("heatmapToggle");
    if (btn) btn.textContent = state.heatmapEnabled ? "Heatmap ON" : "Heatmap OFF";
    updatePreviewCanvas();
  });

  bindClick("weatherBtn", () => cmd("gm_set_weather", { weather: val("weather") || "clear" }));
  bindClick("timeBtn", () => cmd("gm_set_time", { time: Number(val("worldTime")) || 12 }));
  bindClick("eventBtn", () =>
    cmd("gm_world_event", {
      eventId: val("eventId") || "custom_event",
      title: val("eventTitle") || "Custom Event",
      description: val("eventDesc"),
    })
  );
  bindClick("eventTemplateBtn", () =>
    cmd("gm_run_event_template", {
      templateId: val("eventTemplate") || "legion_invasion",
      centerX: Number(val("eventCenterX")) || 0,
      centerY: Number(val("eventCenterY")) || 0,
    })
  );
  bindClick("broadcastBtn", () =>
    cmd("gm_broadcast", { channel: "system", message: val("broadcastText"), color: "#ffd700" })
  );

  bindClick("spawnNpcBtn", () =>
    cmd("gm_spawn_npc", {
      npcId: val("npcId") || `npc_${Date.now()}`,
      name: val("npcName") || val("npcId"),
      x: Number(val("npcX")) || 0,
      y: Number(val("npcY")) || 0,
      hp: Number(val("npcHp")) || 100,
    })
  );
  bindClick("removeNpcBtn", () => cmd("gm_remove_npc", { npcId: val("removeNpcId") || val("npcId") }));
  bindClick("dialogueBtn", () =>
    cmd("gm_save_dialogue", { npcId: val("npcId"), text: val("dialogueText"), choices: [] })
  );
  bindClick("questBtn", () =>
    cmd("gm_create_quest", {
      questId: val("questId") || `quest_${Date.now()}`,
      title: val("questTitle") || "Untitled Quest",
      description: val("questDesc"),
      category: "world",
      level: Number(val("questLevel")) || 1,
      rewards: { xp: Number(val("questXp")) || 100, gold: Number(val("questGold")) || 50 },
    })
  );

  bindClick("tpBtn", () =>
    cmd("gm_teleport", {
      player: val("playerName"),
      x: Number(val("tpX")) || 0,
      y: Number(val("tpY")) || 0,
    })
  );
  bindClick("kickBtn", () => cmd("gm_kick", { player: val("playerName") }));
  bindClick("banBtn", () => cmd("gm_ban", { player: val("playerName") }));
  bindClick("unbanBtn", () => cmd("gm_unban", { player: val("playerName") }));
  bindClick("muteBtn", () => cmd("gm_mute", { player: val("playerName") }));
  bindClick("unmuteBtn", () => cmd("gm_unmute", { player: val("playerName") }));
  bindClick("promoteBtn", () => cmd("gm_promote", { player: val("playerName") }));
  bindClick("sceneHub", () => cmd("scene_change", { sceneId: "didis_hub", spawnKey: "sp_player_default" }));
  bindClick("sceneD1", () => cmd("scene_change", { sceneId: "didis_hub", spawnKey: "sp_didi_01" }));
  bindClick("sceneD2", () => cmd("scene_change", { sceneId: "didis_hub", spawnKey: "sp_didi_02" }));

  bindClick("setPriceBtn", () =>
    cmd("gm_set_price", { itemId: val("priceItem"), buy: Number(val("priceBuy")) || 1 })
  );

  bindClick("adminScanBtn", () => cmd("admin_glb_scan"));
  bindClick("adminListBtn", () => cmd("admin_glb_list"));
  bindClick("adminLinkBtn", () =>
    cmd("admin_glb_link", {
      targetType: val("adminTargetType"),
      targetId: val("adminTargetId"),
      glbPath: val("adminGlbPath"),
    })
  );
  bindClick("adminUnlinkBtn", () =>
    cmd("admin_glb_unlink", {
      targetType: val("adminTargetType"),
      targetId: val("adminTargetId"),
    })
  );
  bindClick("registerGlbBtn", () =>
    cmd("gm_register_glb", {
      category: val("registerCategory") || "object",
      name: val("registerName"),
      path: val("registerPath"),
    })
  );
  bindClick("copyFirstModelBtn", () => {
    const first = state.admin.scannedModels[0];
    if (!first) {
      logLine("No scanned model available yet.", "bad");
      return;
    }
    safeSetValue("adminGlbPath", first);
    safeSetValue("registerPath", first);
    logLine(`Prefilled model path: ${first}`, "ok");
  });
}

function bootstrapDefaults() {
  const loc = window.location;
  const wsProto = loc.protocol === "https:" ? "wss" : "ws";
  safeSetValue("wsUrl", `${wsProto}://${loc.host}/ws`);
  safeSetValue("adminTargetType", "object_group");
  safeSetValue("registerCategory", "object");
}

bootstrapDefaults();
initBindings();
renderAdminState();
renderPlayersTable();
renderHeatList();
updatePreviewCanvas();
