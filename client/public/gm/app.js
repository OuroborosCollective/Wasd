const state = {
  ws: null,
  connected: false,
  playerId: null,
  entities: [],
  preview: {
    players: [],
    npcs: [],
    weather: "clear",
    time: "00:00",
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
  const el = byId("status");
  el.textContent = text;
  el.className = ok ? "ok" : "bad";
}

function send(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    logLine("Socket not connected", "bad");
    return;
  }
  state.ws.send(JSON.stringify(payload));
}

function updatePreviewCanvas() {
  const canvas = byId("preview");
  const ctx = canvas.getContext("2d");
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

  byId("previewMeta").textContent = `Weather: ${state.preview.weather} | Time: ${state.preview.time} | Players: ${state.preview.players.length} | NPCs: ${state.preview.npcs.length}`;
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
  if (msg.type === "gm_player_list") {
    state.preview.players = msg.players || [];
    updatePreviewCanvas();
    return;
  }
  if (msg.type === "gm_preview_snapshot") {
    state.preview.players = msg.players || [];
    state.preview.npcs = msg.npcs || [];
    state.preview.weather = msg.world?.weather || "clear";
    state.preview.time = msg.world?.time || "00:00";
    updatePreviewCanvas();
    return;
  }
  if (msg.type === "error") {
    logLine(msg.message || "Server error", "bad");
    return;
  }
}

function connect() {
  const wsUrl = byId("wsUrl").value.trim();
  const token = byId("token").value.trim();
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
  return byId(id).value.trim();
}

function initBindings() {
  byId("connectBtn").onclick = connect;
  byId("previewRefresh").onclick = () => {
    cmd("gm_preview_request");
    cmd("gm_get_players");
  };

  byId("weatherBtn").onclick = () => cmd("gm_set_weather", { weather: val("weather") || "clear" });
  byId("timeBtn").onclick = () => cmd("gm_set_time", { time: Number(val("time")) || 12 });
  byId("eventBtn").onclick = () =>
    cmd("gm_world_event", {
      eventId: val("eventId") || "custom_event",
      title: val("eventTitle") || "Custom Event",
      description: val("eventDesc"),
    });
  byId("broadcastBtn").onclick = () =>
    cmd("gm_broadcast", { channel: "system", message: val("broadcastText"), color: "#ffd700" });

  byId("spawnNpcBtn").onclick = () =>
    cmd("gm_spawn_npc", {
      npcId: val("npcId") || `npc_${Date.now()}`,
      name: val("npcName") || val("npcId"),
      x: Number(val("npcX")) || 0,
      y: Number(val("npcY")) || 0,
      hp: Number(val("npcHp")) || 100,
    });
  byId("removeNpcBtn").onclick = () => cmd("gm_remove_npc", { npcId: val("npcId") });
  byId("dialogueBtn").onclick = () =>
    cmd("gm_save_dialogue", { npcId: val("npcId"), text: val("dialogueText"), choices: [] });

  byId("questBtn").onclick = () =>
    cmd("gm_create_quest", {
      questId: val("questId") || `quest_${Date.now()}`,
      title: val("questTitle") || "Untitled Quest",
      description: val("questDesc"),
      category: "world",
      level: Number(val("questLevel")) || 1,
      rewards: { xp: Number(val("questXp")) || 100, gold: Number(val("questGold")) || 50 },
    });

  byId("tpBtn").onclick = () =>
    cmd("gm_teleport", { player: val("playerName"), x: Number(val("tpX")) || 0, y: Number(val("tpY")) || 0 });
  byId("kickBtn").onclick = () => cmd("gm_kick", { player: val("playerName") });
  byId("banBtn").onclick = () => cmd("gm_ban", { player: val("playerName") });
  byId("unbanBtn").onclick = () => cmd("gm_unban", { player: val("playerName") });
  byId("muteBtn").onclick = () => cmd("gm_mute", { player: val("playerName") });
  byId("unmuteBtn").onclick = () => cmd("gm_unmute", { player: val("playerName") });
  byId("promoteBtn").onclick = () => cmd("gm_promote", { player: val("playerName") });

  byId("sceneHub").onclick = () => cmd("scene_change", { sceneId: "didis_hub", spawnKey: "sp_player_default" });
  byId("sceneD1").onclick = () => cmd("scene_change", { sceneId: "didis_hub", spawnKey: "sp_didi_01" });
  byId("sceneD2").onclick = () => cmd("scene_change", { sceneId: "didis_hub", spawnKey: "sp_didi_02" });
}

function bootstrapDefaults() {
  const loc = window.location;
  const wsProto = loc.protocol === "https:" ? "wss" : "ws";
  byId("wsUrl").value = `${wsProto}://${loc.host}/ws`;
}

bootstrapDefaults();
initBindings();
updatePreviewCanvas();
