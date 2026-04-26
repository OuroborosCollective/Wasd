import "./styles/tailwind.css";
import { createBabylonApp } from "./engine/babylon/BabylonBoot";
import { BabylonAdapter } from "./engine/babylon/BabylonAdapter";
import { MMORPGClientCore } from "./core/MMORPGClientCore";
import type { EntityViewModel } from "./engine/bridge/EntityViewModel";

type MonitorEntity = {
  id: string;
  type: string;
  name?: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  health?: number;
  maxHealth?: number;
  combatThreat?: boolean;
  glbPath?: string | null;
};

type MonitorChunk = {
  id: string;
  chunkX: number;
  chunkY: number;
};

type MonitorPayload = {
  type: "playtester_monitor_update";
  playtester: {
    id: string;
  };
  camera: {
    mode: "third_person_follow";
    offset: { x: number; y: number; z: number };
  };
  scene: {
    chunks: MonitorChunk[];
    entities: MonitorEntity[];
  };
};

type SignalMessage = {
  type:
    | "register_publisher"
    | "register_viewer"
    | "admin_viewer_connected"
    | "admin_viewer_disconnected"
    | "monitor_offer"
    | "monitor_answer"
    | "monitor_ice_candidate";
  viewerId?: string;
  payload?: unknown;
};

const MONITOR_WS_PATH = "/playtester-monitor";
const SIGNAL_WS_PATH = "/playtester-monitor-signal";
const CHUNK_VIS_SCALE = 4;

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

function toEntityViewModel(entity: MonitorEntity): EntityViewModel {
  const label = entity.name || entity.id;
  return {
    id: entity.id,
    type: entity.type as EntityViewModel["type"],
    name: label,
    position: {
      x: Number(entity.position?.x) || 0,
      y: Number(entity.position?.y) || 0,
      z: Number(entity.position?.z) || 0,
    },
    rotation: {
      x: Number(entity.rotation?.x) || 0,
      y: Number(entity.rotation?.y) || 0,
      z: Number(entity.rotation?.z) || 0,
    },
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

function ensureCanvas(width: number, height: number): HTMLCanvasElement {
  let canvas = document.getElementById("application-canvas") as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "application-canvas";
    document.body.appendChild(canvas);
  }
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = "block";
  canvas.style.margin = "0 auto";
  return canvas;
}

async function loadMonitorStreamConfig(): Promise<{ fps: number; iceServers: RTCIceServer[] }> {
  const token = qp("token");
  const url = new URL("/api/playtester/debug-log", window.location.origin);
  if (token) url.searchParams.set("token", token);
  const res = await fetch(url.toString());
  if (!res.ok) {
    return { fps: 15, iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  }
  const body = (await res.json()) as {
    stream?: {
      fps?: number;
      iceServers?: string[];
    };
  };
  const fps = Number(body.stream?.fps) > 0 ? Math.max(5, Math.floor(Number(body.stream?.fps))) : 15;
  const iceServers = (body.stream?.iceServers || ["stun:stun.l.google.com:19302"]).map((urls) => ({
    urls,
  }));
  return { fps, iceServers };
}

async function run(): Promise<void> {
  const width = Math.max(320, Number(qp("width")) || 640);
  const height = Math.max(180, Number(qp("height")) || 360);
  const canvas = ensureCanvas(width, height);
  const app = createBabylonApp(canvas, { skipGround: true });
  const adapter = new BabylonAdapter(app.scene, app.camera);
  const core = new MMORPGClientCore(adapter);
  const { fps, iceServers } = await loadMonitorStreamConfig();
  const outgoingStream = canvas.captureStream(fps);
  const track = outgoingStream.getVideoTracks()[0];
  if (!track) {
    throw new Error("No video track available from captureStream");
  }

  const monitorWs = new WebSocket(wsUrl(MONITOR_WS_PATH));
  monitorWs.onmessage = (ev) => {
    const payload = JSON.parse(ev.data) as MonitorPayload;
    if (!payload || payload.type !== "playtester_monitor_update") return;
    const entities = payload.scene.entities.map(toEntityViewModel);
    const chunks = payload.scene.chunks.map(toChunkView);
    core.syncEntities(entities);
    core.syncChunks(chunks);
    const target = payload.scene.entities.find((e) => e.id === payload.playtester.id);
    if (target) core.setLocalPlayer(target.id);
    const off = payload.camera?.offset ?? { x: 0, y: -18, z: 12 };
    const horizontal = Math.max(0.001, Math.hypot(Number(off.x) || 0, Number(off.y) || 0));
    const radius = Math.max(6, Math.min(80, Math.hypot(horizontal, Number(off.z) || 0)));
    const targetAlpha = Math.atan2(Number(off.y) || -18, Number(off.x) || 0);
    const targetBeta = Math.max(
      0.35,
      Math.min(1.45, Math.atan2(horizontal, Math.max(0.001, Number(off.z) || 0.001)))
    );
    app.camera.alpha = app.camera.alpha + (targetAlpha - app.camera.alpha) * 0.22;
    app.camera.beta = app.camera.beta + (targetBeta - app.camera.beta) * 0.22;
    app.camera.radius = app.camera.radius + (radius - app.camera.radius) * 0.22;
  };

  const signalWs = new WebSocket(wsUrl(SIGNAL_WS_PATH));
  const peers = new Map<string, RTCPeerConnection>();

  async function closePeer(viewerId: string): Promise<void> {
    const pc = peers.get(viewerId);
    if (!pc) return;
    peers.delete(viewerId);
    try {
      pc.close();
    } catch {
      // noop
    }
  }

  signalWs.onopen = () => {
    signalWs.send(JSON.stringify({ type: "register_publisher" } satisfies SignalMessage));
  };

  signalWs.onmessage = async (ev) => {
    const msg = JSON.parse(ev.data) as SignalMessage;
    if (msg.type === "admin_viewer_connected") {
      const viewerId = typeof msg.viewerId === "string" ? msg.viewerId : "";
      if (!viewerId || peers.has(viewerId)) return;
      const pc = new RTCPeerConnection({ iceServers });
      peers.set(viewerId, pc);
      pc.addTrack(track, outgoingStream);
      pc.onicecandidate = (iceEvent) => {
        if (!iceEvent.candidate) return;
        if (signalWs.readyState !== WebSocket.OPEN) return;
        signalWs.send(
          JSON.stringify({
            type: "monitor_ice_candidate",
            viewerId,
            payload: iceEvent.candidate.toJSON(),
          } satisfies SignalMessage)
        );
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signalWs.send(
        JSON.stringify({
          type: "monitor_offer",
          viewerId,
          payload: offer,
        } satisfies SignalMessage)
      );
      return;
    }

    if (msg.type === "monitor_answer") {
      const viewerId = typeof msg.viewerId === "string" ? msg.viewerId : "";
      if (!viewerId) return;
      const pc = peers.get(viewerId);
      if (!pc) return;
      await pc.setRemoteDescription(msg.payload as RTCSessionDescriptionInit);
      return;
    }

    if (msg.type === "monitor_ice_candidate") {
      const viewerId = typeof msg.viewerId === "string" ? msg.viewerId : "";
      if (!viewerId) return;
      const pc = peers.get(viewerId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(msg.payload as RTCIceCandidateInit);
      } catch {
        // tolerate out-of-order candidates
      }
      return;
    }

    if (msg.type === "admin_viewer_disconnected") {
      const viewerId = typeof msg.viewerId === "string" ? msg.viewerId : "";
      if (viewerId) {
        await closePeer(viewerId);
      }
    }
  };

  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    core.update(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  window.addEventListener("beforeunload", () => {
    for (const viewerId of peers.keys()) {
      void closePeer(viewerId);
    }
    try {
      signalWs.close();
    } catch {
      // noop
    }
    try {
      monitorWs.close();
    } catch {
      // noop
    }
  });
}

void run();
