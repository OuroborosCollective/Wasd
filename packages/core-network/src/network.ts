import type { ServerEvent, ConnectionConfig } from "./types";

type EventListener<T extends ServerEvent = ServerEvent> = (event: T) => void;

declare global {
  interface Window {
    __areloriaClient?: ArelorianClient;
  }
}

function toWebSocketUrl(url: string): string {
  const base = new URL(url || window.location.origin, window.location.origin);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/ws";
  base.search = "";
  base.hash = "";
  return base.toString();
}

function parseJsonMessage(raw: MessageEvent["data"]): any | null {
  try {
    const text = typeof raw === "string" ? raw : "";
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function finiteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampUnit(value: unknown): number {
  const n = finiteNumber(value, 0);
  return Math.max(-1, Math.min(1, n));
}

function readClient2DIdentity() {
  const handle = localStorage.getItem("wasd:2d:name") || "architect";
  const publicKey = localStorage.getItem("wasd:2d:publicKey") || `are-client2d-${handle}`;
  const identityHash = localStorage.getItem("wasd:2d:identityHash") || publicKey;
  const role = localStorage.getItem("wasd:2d:role") || "Scavenger";
  return { handle, publicKey, identityHash, role };
}

function readClient2DSpawn() {
  try {
    const raw = localStorage.getItem("wasd:2d:lastServerPosition") || localStorage.getItem("wasd:2d:spawn");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const x = finiteNumber(parsed?.x, NaN);
    const y = finiteNumber(parsed?.y ?? parsed?.z, NaN);
    const z = finiteNumber(parsed?.z, 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    return { x, y, z };
  } catch {
    return undefined;
  }
}

export class ArelorianClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private config: ConnectionConfig;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private presenceTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _worldState: any = null;
  private _connected = false;
  private intentionalClose = false;
  private moveSeq = 0;
  private presenceSeq = 0;
  private lastKnownServerPosition: { x: number; y: number; z: number } | null = null;

  constructor(config: ConnectionConfig) {
    this.config = {
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  get worldState(): any {
    return this._worldState;
  }

  get connected(): boolean {
    return this._connected;
  }

  connect(): void {
    this.intentionalClose = false;
    this.clearReconnectTimer();
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    if (typeof window !== "undefined") window.__areloriaClient = this;

    const wsUrl = toWebSocketUrl(this.config.url);
    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.socket !== socket || this.intentionalClose) return;
      this._connected = true;
      const identity = readClient2DIdentity();
      const spawn = readClient2DSpawn();
      this.sendRaw({
        type: "login",
        source: "client-2d",
        name: identity.handle,
        handle: identity.handle,
        publicKey: identity.publicKey,
        identityHash: identity.identityHash,
        role: identity.role,
        class: identity.role,
        appearance: "client-2d",
        ...(spawn ? { spawn } : {}),
      });
      console.log("[Arelorian] Connected to native world socket", wsUrl);
      this.dispatch({ type: "connect" as any, payload: {} } as ServerEvent);
      this.startHeartbeat();
      this.startPresence();
    });

    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = null;
      this._connected = false;
      console.log("[Arelorian] Native world socket disconnected");
      this.dispatch({ type: "disconnect" as any, payload: {} } as ServerEvent);
      this.stopHeartbeat();
      this.stopPresence();
      if (!this.intentionalClose) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.config.reconnectInterval);
      }
    });

    socket.addEventListener("message", (event) => {
      if (this.socket !== socket || this.intentionalClose) return;
      const msg = parseJsonMessage(event.data);
      if (!msg?.type) return;
      const payload = msg.payload ?? msg;
      const serverEvent = { type: msg.type, payload } as ServerEvent;
      if (msg.type === "WORLD_HEARTBEAT") {
        this._worldState = payload;
        this.rememberServerPosition(payload?.self);
      }
      if (msg.type === "world_snapshot") this.rememberServerPosition(payload?.selfEntity ?? payload?.self);
      if (msg.type === "server_presence" || msg.type === "presence_ack") this.rememberServerPosition(payload?.position ?? msg.position);
      if (msg.type === "world_tick") this._worldState = { players: msg.players, agents: msg.npcs, npcs: msg.npcs, loot: msg.loot, tick: msg.tick };
      console.log("[Arelorian] Event:", msg.type, payload);
      this.dispatch(serverEvent);
    });

    socket.addEventListener("error", () => {
      if (this.socket !== socket || this.intentionalClose) return;
      this.dispatch({ type: "disconnect" as any, payload: {} } as ServerEvent);
    });
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.stopPresence();
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this._connected = false;
    if (typeof window !== "undefined" && window.__areloriaClient === this) delete window.__areloriaClient;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendRaw({ type: "ping" });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startPresence(): void {
    this.stopPresence();
    this.presenceTimer = setInterval(() => {
      this.sendRaw({
        type: "presence",
        source: "client-2d",
        seq: ++this.presenceSeq,
        lastMoveSeq: this.moveSeq,
        clientRoute: typeof location !== "undefined" ? location.pathname : "/2d/",
      });
    }, 1000);
  }

  private stopPresence(): void {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer);
      this.presenceTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private dispatch<T extends ServerEvent>(event: T): void {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(`areloria:${String(event.type)}`, { detail: event }));
    }
  }

  on<T extends ServerEvent>(type: T["type"], listener: EventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as EventListener);
    return () => this.off(type, listener);
  }

  off<T extends ServerEvent>(type: T["type"], listener: EventListener<T>): void {
    this.listeners.get(type)?.delete(listener as EventListener);
  }

  private sendRaw(payload: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  private rememberServerPosition(raw: any): void {
    if (!raw || typeof raw !== "object") return;
    const x = finiteNumber(raw.x ?? raw.position?.x, NaN);
    const y = finiteNumber(raw.y ?? raw.z ?? raw.position?.y ?? raw.position?.z, NaN);
    const z = finiteNumber(raw.z ?? raw.position?.z ?? 0, 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.lastKnownServerPosition = { x, y, z };
    try {
      localStorage.setItem("wasd:2d:lastServerPosition", JSON.stringify(this.lastKnownServerPosition));
    } catch {
      // ignore storage access issues
    }
  }

  emit(event: string, payload: Record<string, unknown>): void {
    this.sendRaw({ type: event, ...payload });
  }

  sendPlayerAction(action: string, payload: Record<string, unknown>): void {
    if (action === "MOVE") {
      const dx = clampUnit(payload.dx);
      const dz = clampUnit(payload.dz ?? payload.dy);
      if (dx === 0 && dz === 0) return;
      this.sendRaw({
        type: "MOVE",
        dx,
        dy: dz,
        dz,
        source: "client-2d",
        seq: ++this.moveSeq,
        basis: "server_authoritative_intent",
      });
      return;
    }
    if (action === "USE_SKILL") {
      this.sendRaw({ type: "USE_SKILL", ...payload });
      return;
    }
    this.sendRaw({ type: action, ...payload });
  }
}

export function createClient(config: ConnectionConfig): ArelorianClient {
  return new ArelorianClient(config);
}
