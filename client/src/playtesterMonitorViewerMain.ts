type MonitorEvent = {
  ts: number;
  tick: number;
  level: "info" | "warn" | "error";
  text: string;
};

type PlaytesterStatus = {
  id: string;
  displayName: string;
  action: string;
  goal: string;
  chunkId: string;
  sceneId: string;
  position: { x: number; y: number; z: number };
  activeQuestId: string | null;
  activeQuestStep: number | null;
  inventory: string[];
  equipment: Record<string, string | null>;
  warnings: string[];
  errors: string[];
  lastEvents: MonitorEvent[];
};

type MonitorEntity = {
  id: string;
  type: string;
  name?: string;
  position: { x: number; y: number; z: number };
  assetId?: string | null;
  assetType?: string | null;
  glbPath?: string | null;
  scale?: { x: number; y: number; z: number } | null;
};

type MonitorPayload = {
  type: "playtester_monitor_update";
  ts: number;
  tick: number;
  playtester: PlaytesterStatus;
  camera: {
    mode: "third_person_follow";
    offset: { x: number; y: number; z: number };
    lookAt: { x: number; y: number; z: number };
  };
  scene: {
    entities: MonitorEntity[];
  };
};

type MonitorDebugApiResponse = {
  stream?: { iceServers?: string[] };
  monitorSignalPath?: string;
};

type SignalMessage = {
  type:
    | "register_publisher"
    | "register_viewer"
    | "render_publisher_ready"
    | "admin_viewer_connected"
    | "admin_viewer_disconnected"
    | "monitor_offer"
    | "monitor_answer"
    | "monitor_ice_candidate";
  viewerId?: string;
  payload?: unknown;
};

type Ui = {
  streamBadge: HTMLSpanElement;
  statusEl: HTMLDivElement;
  eventsEl: HTMLUListElement;
  assetsEl: HTMLUListElement;
  videoEl: HTMLVideoElement;
};

const VIEWER_ID = `viewer_${Math.random().toString(36).slice(2, 10)}`;
const MONITOR_SOCKET_PATH = "/playtester-monitor";
const SIGNAL_SOCKET_PATH = "/playtester-monitor-signal";
const RECONNECT_DELAY_MS = 1200;

function qp(name: string): string {
  return new URLSearchParams(window.location.search).get(name)?.trim() || "";
}

function wsUrl(path: string): string {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const url = new URL(`${protocol}://${window.location.host}${path}`);
  const token = qp("token");
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

function apiUrl(path: string): string {
  const url = new URL(path, window.location.origin);
  const token = qp("token");
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

function renderStatus(ui: Ui, payload: MonitorPayload | null): void {
  if (!payload) {
    ui.statusEl.textContent = "Waiting for monitor status...";
    ui.eventsEl.innerHTML = "";
    ui.assetsEl.innerHTML = "";
    return;
  }
  const pt = payload.playtester;
  ui.statusEl.textContent =
    `Mode: WebRTC Stream (viewer-only)\n` +
    `Playtester: ${pt.displayName} (${pt.id})\n` +
    `Action: ${pt.action}\n` +
    `Goal: ${pt.goal}\n` +
    `Position: x=${pt.position.x.toFixed(2)} z=${pt.position.z.toFixed(2)}\n` +
    `Scene/Chunk: ${pt.sceneId} / ${pt.chunkId}\n` +
    `Quest: ${pt.activeQuestId ?? "-"} (step ${pt.activeQuestStep ?? "-"})\n` +
    `Inventory: ${pt.inventory.join(", ") || "-"}\n` +
    `Equipment: ${Object.entries(pt.equipment)
      .map(([k, v]) => `${k}:${v ?? "-"}`)
      .join("  ")}\n` +
    `Camera: ${payload.camera.mode} offset(${payload.camera.offset.x},${payload.camera.offset.y},${payload.camera.offset.z})`;

  ui.eventsEl.innerHTML = "";
  for (const ev of pt.lastEvents.slice(-10)) {
    const li = document.createElement("li");
    li.textContent = `[${ev.level}] ${ev.text}`;
    li.style.color = ev.level === "error" ? "#fecaca" : ev.level === "warn" ? "#fde68a" : "#bfdbfe";
    ui.eventsEl.appendChild(li);
  }

  ui.assetsEl.innerHTML = "";
  for (const entity of payload.scene.entities.slice(0, 20)) {
    const li = document.createElement("li");
    const scale = entity.scale
      ? `${entity.scale.x.toFixed(2)}/${entity.scale.y.toFixed(2)}/${entity.scale.z.toFixed(2)}`
      : "-";
    li.textContent =
      `${entity.id} | type=${entity.type} | assetId=${entity.assetId ?? "-"} | assetType=${
        entity.assetType ?? "-"
      } | pos=(${entity.position.x.toFixed(1)},${entity.position.z.toFixed(1)}) | scale=${scale}`;
    ui.assetsEl.appendChild(li);
  }
}

function createUi(): Ui {
  const root = document.getElementById("monitor-root");
  if (!root) throw new Error("monitor-root not found");

  const shell = document.createElement("div");
  shell.style.display = "grid";
  shell.style.gridTemplateColumns = "minmax(0, 2fr) minmax(320px, 1fr)";
  shell.style.gap = "12px";
  shell.style.width = "100vw";
  shell.style.height = "100vh";
  shell.style.padding = "10px";
  shell.style.boxSizing = "border-box";
  shell.style.background = "#060b13";
  shell.style.color = "#e5e7eb";
  shell.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";

  const streamCard = document.createElement("div");
  streamCard.style.display = "flex";
  streamCard.style.flexDirection = "column";
  streamCard.style.gap = "8px";
  streamCard.style.background = "rgba(13,19,33,.92)";
  streamCard.style.border = "1px solid rgba(148,163,184,.25)";
  streamCard.style.borderRadius = "10px";
  streamCard.style.padding = "8px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  const title = document.createElement("div");
  title.textContent = "Playtester Monitor — Stream Mode (WebRTC default)";
  title.style.fontWeight = "700";
  const streamBadge = document.createElement("span");
  streamBadge.textContent = "connecting…";
  streamBadge.style.padding = "2px 8px";
  streamBadge.style.borderRadius = "999px";
  streamBadge.style.fontSize = "12px";
  streamBadge.style.background = "rgba(56,189,248,.18)";
  streamBadge.style.border = "1px solid rgba(56,189,248,.5)";
  header.appendChild(title);
  header.appendChild(streamBadge);

  const videoEl = document.createElement("video");
  videoEl.autoplay = true;
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.controls = false;
  videoEl.style.width = "100%";
  videoEl.style.height = "100%";
  videoEl.style.minHeight = "300px";
  videoEl.style.objectFit = "cover";
  videoEl.style.borderRadius = "8px";
  videoEl.style.background = "#000";

  const info = document.createElement("div");
  info.textContent =
    "Viewer-only mode: this page does not instantiate the full local Three.js monitor renderer.";
  info.style.fontSize = "12px";
  info.style.opacity = "0.85";

  streamCard.appendChild(header);
  streamCard.appendChild(videoEl);
  streamCard.appendChild(info);

  const panel = document.createElement("div");
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "8px";
  panel.style.background = "rgba(13,19,33,.92)";
  panel.style.border = "1px solid rgba(148,163,184,.25)";
  panel.style.borderRadius = "10px";
  panel.style.padding = "10px";
  panel.style.overflow = "auto";

  const modeHint = document.createElement("div");
  modeHint.textContent =
    "Heavy Local 3D Developer Mode is optional via ?mode=local3d. Default is WebRTC stream.";
  modeHint.style.fontSize = "12px";
  modeHint.style.opacity = "0.8";
  modeHint.style.paddingBottom = "6px";
  modeHint.style.borderBottom = "1px solid rgba(148,163,184,.25)";

  const statusEl = document.createElement("div");
  statusEl.style.whiteSpace = "pre-wrap";
  statusEl.style.lineHeight = "1.45";
  statusEl.style.fontSize = "12px";

  const eventsTitle = document.createElement("div");
  eventsTitle.textContent = "Last 10 debug events";
  eventsTitle.style.fontWeight = "600";
  const eventsEl = document.createElement("ul");
  eventsEl.style.listStyle = "none";
  eventsEl.style.padding = "0";
  eventsEl.style.margin = "0";
  eventsEl.style.fontSize = "12px";

  const assetsTitle = document.createElement("div");
  assetsTitle.textContent = "Visible entities / assets";
  assetsTitle.style.fontWeight = "600";
  const assetsEl = document.createElement("ul");
  assetsEl.style.listStyle = "none";
  assetsEl.style.padding = "0";
  assetsEl.style.margin = "0";
  assetsEl.style.fontSize = "12px";

  panel.appendChild(modeHint);
  panel.appendChild(statusEl);
  panel.appendChild(eventsTitle);
  panel.appendChild(eventsEl);
  panel.appendChild(assetsTitle);
  panel.appendChild(assetsEl);

  shell.appendChild(streamCard);
  shell.appendChild(panel);
  root.appendChild(shell);

  return { streamBadge, statusEl, eventsEl, assetsEl, videoEl };
}

function setBadge(ui: Ui, text: string, kind: "ok" | "warn" | "err" = "warn"): void {
  ui.streamBadge.textContent = text;
  ui.streamBadge.style.background =
    kind === "ok" ? "rgba(52,211,153,.18)" : kind === "err" ? "rgba(248,113,113,.18)" : "rgba(56,189,248,.18)";
  ui.streamBadge.style.borderColor =
    kind === "ok" ? "rgba(52,211,153,.6)" : kind === "err" ? "rgba(248,113,113,.6)" : "rgba(56,189,248,.6)";
}

async function runStreamMode(ui: Ui): Promise<void> {
  const publisherUrl = new URL(window.location.href);
  publisherUrl.searchParams.set("mode", "publisher");
  const publisherLaunch = document.createElement("div");
  publisherLaunch.style.fontSize = "12px";
  publisherLaunch.style.opacity = "0.85";
  publisherLaunch.innerHTML =
    `Render publisher not running? Start it in a strong environment using ` +
    `<a href="${publisherUrl.toString()}" target="_blank" rel="noreferrer" style="color:#7dd3fc">publisher mode</a>.`;
  ui.statusEl.parentElement?.insertBefore(publisherLaunch, ui.statusEl);

  const streamStatusRes = await fetch(apiUrl("/api/playtester/debug-log"));
  if (!streamStatusRes.ok) {
    throw new Error(`debug-log status failed (${streamStatusRes.status})`);
  }
  const streamStatus = (await streamStatusRes.json()) as MonitorDebugApiResponse;
  const iceServers = (streamStatus.stream?.iceServers || ["stun:stun.l.google.com:19302"]).map((urls) => ({
    urls,
  }));

  let pc: RTCPeerConnection | null = null;
  let signalWs: WebSocket | null = null;
  let monitorWs: WebSocket | null = null;

  const connectSignaling = () => {
    if (pc) {
      try { pc.close(); } catch { }
      pc = null;
    }
    if (signalWs) {
      try { signalWs.close(); } catch { }
      signalWs = null;
    }

    pc = new RTCPeerConnection({ iceServers });
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (stream) {
        ui.videoEl.srcObject = stream;
        setBadge(ui, "stream live", "ok");
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (!pc) return;
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        setBadge(ui, `ice ${pc.iceConnectionState}`, "warn");
      }
    };

    const signalPath = streamStatus.monitorSignalPath || SIGNAL_SOCKET_PATH;
    signalWs = new WebSocket(wsUrl(signalPath));
    setBadge(ui, "signaling…", "warn");

    signalWs.onopen = () => {
      if (!signalWs) return;
      signalWs.send(
        JSON.stringify({
          type: "register_viewer",
          viewerId: VIEWER_ID,
        } satisfies SignalMessage)
      );
      setBadge(ui, "viewer connected", "warn");
    };

    signalWs.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data) as SignalMessage;
      if (!pc || !signalWs) return;
      if (msg.type === "monitor_offer") {
        const offer = msg.payload as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalWs.send(
          JSON.stringify({
            type: "monitor_answer",
            viewerId: VIEWER_ID,
            payload: answer,
          } satisfies SignalMessage)
        );
        setBadge(ui, "answer sent", "warn");
      } else if (msg.type === "monitor_ice_candidate") {
        const candidate = msg.payload as RTCIceCandidateInit;
        if (candidate) {
          try {
            await pc.addIceCandidate(candidate);
          } catch {
            // tolerate late candidates
          }
        }
      } else if (msg.type === "render_publisher_ready") {
        setBadge(ui, "publisher ready", "warn");
      }
    };

    signalWs.onclose = () => {
      setBadge(ui, "signaling reconnecting…", "warn");
      window.setTimeout(connectSignaling, RECONNECT_DELAY_MS);
    };

    signalWs.onerror = () => {
      setBadge(ui, "signaling error", "err");
    };

    pc.onicecandidate = (ev) => {
      if (!signalWs || signalWs.readyState !== WebSocket.OPEN) return;
      if (!ev.candidate) return;
      signalWs.send(
        JSON.stringify({
          type: "monitor_ice_candidate",
          viewerId: VIEWER_ID,
          payload: ev.candidate.toJSON(),
        } satisfies SignalMessage)
      );
    };
  };

  const connectMonitor = () => {
    if (monitorWs) {
      try { monitorWs.close(); } catch { }
    }
    monitorWs = new WebSocket(wsUrl(MONITOR_SOCKET_PATH));
    monitorWs.onmessage = (ev) => {
      const payload = JSON.parse(ev.data) as MonitorPayload;
      if (payload?.type === "playtester_monitor_update") {
        renderStatus(ui, payload);
      }
    };
    monitorWs.onclose = () => {
      window.setTimeout(connectMonitor, RECONNECT_DELAY_MS * 2);
    };
  };

  connectSignaling();
  connectMonitor();

  window.addEventListener("beforeunload", () => {
    try { monitorWs?.close(); } catch { }
    try { signalWs?.close(); } catch { }
    try { pc?.close(); } catch { }
  });
}

async function main(): Promise<void> {
  const mode = (qp("mode") || "webrtc").toLowerCase();
  if (mode === "publisher") {
    await import("./playtesterRenderPublisherMain");
    return;
  }
  if (mode === "local3d") {
    await import("./playtesterMonitorMain");
    return;
  }
  const ui = createUi();
  await runStreamMode(ui);
}

void main();
