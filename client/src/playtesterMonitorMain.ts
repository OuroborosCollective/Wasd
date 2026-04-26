import "./styles/tailwind.css";
import { createBabylonApp } from "./engine/babylon/BabylonBoot";
import { BabylonAdapter } from "./engine/babylon/BabylonAdapter";
import { MMORPGClientCore } from "./core/MMORPGClientCore";
import type { EntityViewModel } from "./engine/bridge/EntityViewModel";
import { worldService } from "./game/world/services";

type MonitorEvent = {
  ts: number;
  tick: number;
  level: "info" | "warn" | "error";
  text: string;
};

type MonitorEntity = {
  id: string;
  type: string;
  name?: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  health?: number;
  maxHealth?: number;
  combatThreat?: boolean;
  assetId?: string | null;
  assetType?: string | null;
  glbPath?: string | null;
  scale?: { x: number; y: number; z: number } | null;
};

type MonitorChunk = {
  id: string;
  chunkX: number;
  chunkY: number;
};

type MonitorPayload = {
  type: "playtester_monitor_update";
  ts: number;
  tick: number;
  playtester: {
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
    nearby: {
      npcs: string[];
      enemies: string[];
      loot: string[];
      interactables: string[];
    };
    warnings: string[];
    errors: string[];
    lastEvents: MonitorEvent[];
  };
  camera: {
    mode: "third_person_follow";
    offset: { x: number; y: number; z: number };
    lookAt: { x: number; y: number; z: number };
  };
  scene: {
    chunks: MonitorChunk[];
    entities: MonitorEntity[];
  };
  overlay: {
    currentChunk: string;
    action: string;
    goal: string;
    questStep: number | null;
    nearbyInteractables: string[];
    warnings: string[];
    lastEvents: MonitorEvent[];
  };
  renderHints: {
    performanceMode: boolean;
    placeholderMode: boolean;
    radiusChunks: number;
    shadowsEnabled: boolean;
    particlesEnabled: boolean;
  };
};

type OverlayRefs = {
  root: HTMLDivElement;
  status: HTMLDivElement;
  toggles: HTMLDivElement;
  eventTitle: HTMLDivElement;
  events: HTMLUListElement;
  assetsTitle: HTMLDivElement;
  assets: HTMLUListElement;
  footer: HTMLDivElement;
};

type ToggleDefaults = {
  performanceMode: boolean;
  placeholderMode: boolean;
  radiusChunks: number;
};

type OverlayState = {
  showOverlay: boolean;
  showAssets: boolean;
  latestPayload: MonitorPayload | null;
};

const CHUNK_VIS_SCALE = 4;
const FALLBACK_WS_PATH = "/playtester-monitor";
const TOKEN_PARAM = "token";
const DEFAULT_RADIUS = 2;

function readBoolParam(name: string, fallback = false): boolean {
  const raw = new URLSearchParams(window.location.search).get(name);
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

function readIntParam(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(new URLSearchParams(window.location.search).get(name));
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

function resolveMonitorWebSocketUrl(): string {
  const search = new URLSearchParams(window.location.search);
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const base = `${protocol}://${window.location.host}${FALLBACK_WS_PATH}`;
  const token = search.get(TOKEN_PARAM)?.trim();
  const url = new URL(base);
  if (token) {
    url.searchParams.set(TOKEN_PARAM, token);
  }
  return url.toString();
}

function toEntityViewModel(entity: MonitorEntity): EntityViewModel {
  const label = entity.name || entity.id;
  const position = {
    x: Number(entity.position?.x) || 0,
    y: Number(entity.position?.y) || 0,
    z: Number(entity.position?.z) || 0,
  };
  const rotation = {
    x: Number(entity.rotation?.x) || 0,
    y: Number(entity.rotation?.y) || 0,
    z: Number(entity.rotation?.z) || 0,
  };
  return {
    id: entity.id,
    type: entity.type as any,
    name: label,
    position,
    rotation,
    modelUrl: typeof entity.glbPath === "string" && entity.glbPath.length > 0 ? entity.glbPath : undefined,
    are: {
      kappa: 0,
      logicalIndex: 0,
      phaseShift: 0,
      resonance: 0,
      plexity: 0,
      chain: "",
      kappaPos: { x: 0, y: 0, z: 0 },
    },
    health: Number(entity.health) || undefined,
    maxHealth: Number(entity.maxHealth) || undefined,
    combatThreat: Boolean(entity.combatThreat),
    visible: true,
  };
}

function toChunkView(chunk: MonitorChunk) {
  return {
    id: chunk.id,
    chunkX: Number(chunk.chunkX) * CHUNK_VIS_SCALE,
    chunkY: Number(chunk.chunkY) * CHUNK_VIS_SCALE,
    objects: [],
  };
}

function ensureCanvas(): HTMLCanvasElement {
  let canvas = document.getElementById("application-canvas") as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "application-canvas";
    document.body.appendChild(canvas);
  }
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.display = "block";
  return canvas;
}

function createOverlay(): OverlayRefs {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.top = "12px";
  root.style.left = "12px";
  root.style.width = "390px";
  root.style.maxHeight = "calc(100vh - 24px)";
  root.style.overflow = "auto";
  root.style.background = "rgba(9, 12, 20, 0.84)";
  root.style.border = "1px solid rgba(148, 163, 184, 0.35)";
  root.style.borderRadius = "10px";
  root.style.padding = "10px 12px";
  root.style.zIndex = "30";
  root.style.color = "#e5e7eb";
  root.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
  root.style.fontSize = "12px";

  const title = document.createElement("div");
  title.textContent = "Autonomous Playtester Monitor";
  title.style.fontWeight = "700";
  title.style.fontSize = "14px";
  title.style.marginBottom = "6px";
  root.appendChild(title);

  const toggles = document.createElement("div");
  toggles.style.display = "flex";
  toggles.style.gap = "6px";
  toggles.style.flexWrap = "wrap";
  toggles.style.marginBottom = "8px";
  root.appendChild(toggles);

  const status = document.createElement("div");
  status.style.lineHeight = "1.45";
  status.style.whiteSpace = "pre-wrap";
  status.style.marginBottom = "8px";
  root.appendChild(status);

  const eventTitle = document.createElement("div");
  eventTitle.textContent = "Last events";
  eventTitle.style.fontWeight = "600";
  eventTitle.style.marginBottom = "4px";
  root.appendChild(eventTitle);

  const events = document.createElement("ul");
  events.style.listStyle = "none";
  events.style.padding = "0";
  events.style.margin = "0 0 8px 0";
  root.appendChild(events);

  const assetsTitle = document.createElement("div");
  assetsTitle.textContent = "Visible assets";
  assetsTitle.style.fontWeight = "600";
  assetsTitle.style.marginBottom = "4px";
  root.appendChild(assetsTitle);

  const assets = document.createElement("ul");
  assets.style.listStyle = "none";
  assets.style.padding = "0";
  assets.style.margin = "0 0 8px 0";
  root.appendChild(assets);

  const footer = document.createElement("div");
  footer.style.fontSize = "11px";
  footer.style.opacity = "0.84";
  root.appendChild(footer);

  document.body.appendChild(root);
  return { root, status, toggles, eventTitle, events, assetsTitle, assets, footer };
}

function setOverlayVisible(overlay: OverlayRefs, visible: boolean): void {
  const value = visible ? "block" : "none";
  overlay.status.style.display = value;
  overlay.eventTitle.style.display = value;
  overlay.events.style.display = value;
  overlay.assetsTitle.style.display = value;
  overlay.assets.style.display = value;
  overlay.footer.style.display = value;
}

function createToggleButton(label: string, active: boolean, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.type = "button";
  btn.style.padding = "4px 8px";
  btn.style.borderRadius = "999px";
  btn.style.border = active ? "1px solid #38bdf8" : "1px solid rgba(148,163,184,.45)";
  btn.style.background = active ? "rgba(56, 189, 248, 0.16)" : "rgba(15, 23, 42, 0.45)";
  btn.style.color = "#e2e8f0";
  btn.style.cursor = "pointer";
  btn.addEventListener("click", onClick);
  return btn;
}

function renderOverlay(overlay: OverlayRefs, state: OverlayState): void {
  const payload = state.latestPayload;
  if (!payload) {
    overlay.status.textContent = "Waiting for playtester stream...";
    overlay.events.innerHTML = "";
    overlay.assets.innerHTML = "";
    overlay.footer.textContent = "";
    return;
  }

  const pt = payload.playtester;
  overlay.status.textContent =
    `Action: ${pt.action}\n` +
    `Goal: ${pt.goal}\n` +
    `Position: x=${pt.position.x.toFixed(2)} z=${pt.position.z.toFixed(2)}\n` +
    `Chunk: ${payload.overlay.currentChunk} | Scene: ${pt.sceneId}\n` +
    `Quest: ${pt.activeQuestId ?? "-"} (step ${pt.activeQuestStep ?? "-"})\n` +
    `Inventory: ${pt.inventory.join(", ") || "-"}\n` +
    `Equipment: ${Object.entries(pt.equipment).map(([k, v]) => `${k}:${v ?? "-"}`).join("  ")}\n` +
    `Nearby: npcs=${pt.nearby.npcs.length} enemies=${pt.nearby.enemies.length} loot=${pt.nearby.loot.length}`;

  overlay.events.innerHTML = "";
  payload.overlay.lastEvents.slice(-10).forEach((event) => {
    const li = document.createElement("li");
    li.textContent = `[${event.level}] ${event.text}`;
    li.style.marginBottom = "2px";
    li.style.color = event.level === "error" ? "#fca5a5" : event.level === "warn" ? "#fde68a" : "#bfdbfe";
    overlay.events.appendChild(li);
  });

  overlay.assets.innerHTML = "";
  if (state.showAssets) {
    payload.scene.entities
      .filter((e) => e.type !== "player")
      .slice(0, 16)
      .forEach((entity) => {
        const li = document.createElement("li");
        const scale = entity.scale
          ? `${entity.scale.x.toFixed(2)}/${entity.scale.y.toFixed(2)}/${entity.scale.z.toFixed(2)}`
          : "-";
        li.textContent =
          `${entity.id} | type=${entity.type} | assetId=${entity.assetId ?? "-"} | assetType=${entity.assetType ?? "-"} ` +
          `| pos=(${entity.position.x.toFixed(1)},${entity.position.z.toFixed(1)}) | scale=${scale}`;
        li.style.marginBottom = "2px";
        li.style.color = "#c7d2fe";
        overlay.assets.appendChild(li);
      });
  }

  overlay.footer.textContent =
    `camera=${payload.camera.mode} offset(${payload.camera.offset.x},${payload.camera.offset.y},${payload.camera.offset.z}) ` +
    `| performance=${payload.renderHints.performanceMode ? "on" : "off"} ` +
    `| placeholders=${payload.renderHints.placeholderMode ? "on" : "off"} ` +
    `| radius=${payload.renderHints.radiusChunks}`;
}

function withUpdatedQuery(update: (params: URLSearchParams) => void): void {
  const url = new URL(window.location.href);
  update(url.searchParams);
  window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
}

function updateToggleUi(
  overlay: OverlayRefs,
  state: OverlayState,
  reconnect: () => void,
  defaults: ToggleDefaults,
): void {
  overlay.toggles.innerHTML = "";
  const showOverlayBtn = createToggleButton(
    state.showOverlay ? "Overlay: ON" : "Overlay: OFF",
    state.showOverlay,
    () => {
      state.showOverlay = !state.showOverlay;
      setOverlayVisible(overlay, state.showOverlay);
      updateToggleUi(overlay, state, reconnect, defaults);
    },
  );
  const showAssetsBtn = createToggleButton(
    state.showAssets ? "Asset list: ON" : "Asset list: OFF",
    state.showAssets,
    () => {
      state.showAssets = !state.showAssets;
      renderOverlay(overlay, state);
      updateToggleUi(overlay, state, reconnect, defaults);
    },
  );
  const perfBtn = createToggleButton(
    defaults.performanceMode ? "Performance mode: ON" : "Performance mode: OFF",
    defaults.performanceMode,
    () => {
      const next = !defaults.performanceMode;
      withUpdatedQuery((params) => params.set("performance", next ? "1" : "0"));
      window.location.reload();
    },
  );
  const placeholderBtn = createToggleButton(
    defaults.placeholderMode ? "Placeholder mode: ON" : "Placeholder mode: OFF",
    defaults.placeholderMode,
    () => {
      const next = !defaults.placeholderMode;
      withUpdatedQuery((params) => params.set("placeholder", next ? "1" : "0"));
      window.location.reload();
    },
  );
  const radiusBtn = createToggleButton(
    `Radius: ${defaults.radiusChunks} chunks`,
    false,
    () => {
      const next = defaults.radiusChunks >= 4 ? 1 : defaults.radiusChunks + 1;
      withUpdatedQuery((params) => params.set("radius", String(next)));
      window.location.reload();
    },
  );
  const reconnectBtn = createToggleButton("Reconnect stream", false, reconnect);
  overlay.toggles.appendChild(showOverlayBtn);
  overlay.toggles.appendChild(showAssetsBtn);
  overlay.toggles.appendChild(perfBtn);
  overlay.toggles.appendChild(placeholderBtn);
  overlay.toggles.appendChild(radiusBtn);
  overlay.toggles.appendChild(reconnectBtn);
}

function applyCameraFromMonitorPayload(core: MMORPGClientCore, payload: MonitorPayload): void {
  const playtesterEntity = payload.scene.entities.find((e) => e.id === payload.playtester.id);
  if (playtesterEntity) {
    core.setLocalPlayer(playtesterEntity.id);
  } else {
    const fallback = payload.scene.entities.find((e) => e.type === "player");
    if (fallback) {
      core.setLocalPlayer(fallback.id);
    }
  }
}

function run(): void {
  const canvas = ensureCanvas();
  const app = createBabylonApp(canvas, { skipGround: true });
  (window as any).babylonScene = app.scene;
  const adapter = new BabylonAdapter(app.scene, app.camera);
  const core = new MMORPGClientCore(adapter);
  const overlay = createOverlay();
  const state: OverlayState = {
    showOverlay: true,
    showAssets: true,
    latestPayload: null,
  };

  const wantsPerf = readBoolParam("performance", true);
  const wantsPlaceholder = readBoolParam("placeholder", false);
  const radius = readIntParam("radius", DEFAULT_RADIUS, 1, 8);
  const wsBase = resolveMonitorWebSocketUrl();
  let socket: WebSocket | null = null;

  const connect = () => {
    if (socket) {
      try {
        socket.close();
      } catch {
        // noop
      }
      socket = null;
    }
    const url = new URL(wsBase);
    url.searchParams.set("performance", wantsPerf ? "1" : "0");
    url.searchParams.set("placeholder", wantsPlaceholder ? "1" : "0");
    url.searchParams.set("radius", String(radius));
    socket = new WebSocket(url.toString());
    socket.onmessage = (ev) => {
      const payload = JSON.parse(ev.data) as MonitorPayload;
      if (!payload || payload.type !== "playtester_monitor_update") return;
      state.latestPayload = payload;
      const entities = payload.scene.entities.map((entity) =>
        toEntityViewModel(entity, payload.renderHints.placeholderMode)
      );
      const chunks = payload.scene.chunks.map(toChunkView);
      core.syncEntities(entities);
      core.syncChunks(chunks);
      applyCameraFromMonitorPayload(core, payload);
      const off = payload.camera?.offset ?? { x: 0, y: -18, z: 12 };
      const horizontal = Math.max(0.001, Math.hypot(Number(off.x) || 0, Number(off.y) || 0));
      const radius = Math.max(6, Math.min(80, Math.hypot(horizontal, Number(off.z) || 0)));
      const targetAlpha = Math.atan2(Number(off.y) || -18, Number(off.x) || 0);
      const targetBeta = Math.max(0.35, Math.min(1.45, Math.atan2(horizontal, Math.max(0.001, Number(off.z) || 0.001))));
      app.camera.alpha = app.camera.alpha + (targetAlpha - app.camera.alpha) * 0.22;
      app.camera.beta = app.camera.beta + (targetBeta - app.camera.beta) * 0.22;
      app.camera.radius = app.camera.radius + (radius - app.camera.radius) * 0.22;
      renderOverlay(overlay, state);
    };
    socket.onclose = () => {
      window.setTimeout(connect, 1200);
    };
  };

  updateToggleUi(overlay, state, connect, {
    performanceMode: wantsPerf,
    placeholderMode: wantsPlaceholder,
    radiusChunks: radius,
  });
  setOverlayVisible(overlay, state.showOverlay);
  renderOverlay(overlay, state);
  connect();

  const scene = app.scene;
  const camera = scene.activeCamera;
  if (camera) {
    void worldService.init(scene, camera).catch(() => {
      // keep monitor lightweight even if world service init fails
    });
  }

  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    core.update(dt);
    if (!wantsPerf) {
      worldService.update();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  window.addEventListener("beforeunload", () => {
    if (socket) {
      try {
        socket.close();
      } catch {
        // noop
      }
    }
    worldService.dispose();
  });
}

run();
