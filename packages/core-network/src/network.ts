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

function readClient2DIdentity() {
  const handle = localStorage.getItem("wasd:2d:name") || "architect";
  const publicKey = localStorage.getItem("wasd:2d:publicKey") || `are-client2d-${handle}`;
  const identityHash = localStorage.getItem("wasd:2d:identityHash") || publicKey;
  const role = localStorage.getItem("wasd:2d:role") || "Scavenger";
  return { handle, publicKey, identityHash, role };
}

export class ArelorianClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private config: ConnectionConfig;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _worldState: any = null;
  private _connected = false;

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
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    if (typeof window !== "undefined") window.__areloriaClient = this;

    const wsUrl = toWebSocketUrl(this.config.url);
    this.socket = new WebSocket(wsUrl);

    this.socket.addEventListener("open", () => {
      this._connected = true;
      const identity = readClient2DIdentity();
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
      });
      console.log("[Arelorian] Connected to native world socket", wsUrl);
      this.dispatch({ type: "connect" as any, payload: {} } as ServerEvent);
      this.startHeartbeat();
    });

    this.socket.addEventListener("close", () => {
      this._connected = false;
      console.log("[Arelorian] Native world socket disconnected");
      this.dispatch({ type: "disconnect" as any, payload: {} } as ServerEvent);
      this.stopHeartbeat();
      window.setTimeout(() => this.connect(), this.config.reconnectInterval);
    });

    this.socket.addEventListener("message", (event) => {
      const msg = parseJsonMessage(event.data);
      if (!msg?.type) return;
      const payload = msg.payload ?? msg;
      const serverEvent = { type: msg.type, payload } as ServerEvent;
      if (msg.type === "WORLD_HEARTBEAT") this._worldState = payload;
      if (msg.type === "world_tick") this._worldState = { players: msg.players, agents: msg.npcs, npcs: msg.npcs, loot: msg.loot, tick: msg.tick };
      console.log("[Arelorian] Event:", msg.type, payload);
      this.dispatch(serverEvent);
    });

    this.socket.addEventListener("error", () => {
      this.dispatch({ type: "disconnect" as any, payload: {} } as ServerEvent);
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this._connected = false;
    if (typeof window !== "undefined" && window.__areloriaClient === this) delete window.__areloriaClient;
  }

  private startHeartbeat(): void {
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

  emit(event: string, payload: Record<string, unknown>): void {
    this.sendRaw({ type: event, ...payload });
  }

  sendPlayerAction(action: string, payload: Record<string, unknown>): void {
    if (action === "MOVE") {
      this.sendRaw({ type: "MOVE", ...payload });
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
