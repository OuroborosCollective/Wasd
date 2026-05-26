import { io, Socket, ManagerOptions } from "socket.io-client";
import type { ServerEvent, ConnectionConfig } from "./types";

type EventListener<T extends ServerEvent = ServerEvent> = (event: T) => void;

declare global {
  interface Window {
    __areloriaClient?: ArelorianClient;
  }
}

export class ArelorianClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private config: ConnectionConfig;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _worldState: any = null;
  private _connected = false;

  constructor(config: ConnectionConfig) {
    this.config = {
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      ...config
    };
  }

  get worldState(): any {
    return this._worldState;
  }

  get connected(): boolean {
    return this._connected;
  }

  connect(): void {
    if (this.socket?.connected) return;
    if (typeof window !== "undefined") window.__areloriaClient = this;

    const options: ManagerOptions = {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: this.config.reconnectInterval,
      timeout: 10000
    };

    this.socket = io(this.config.url, options);

    this.socket.on("connect", () => {
      this._connected = true;
      console.log("[Arelorian] Connected to", this.config.url);
      this.dispatch({ type: "connect" as any, payload: {} } as ServerEvent);
      this.startHeartbeat();
    });

    this.socket.on("disconnect", () => {
      this._connected = false;
      console.log("[Arelorian] Disconnected");
      this.dispatch({ type: "disconnect" as any, payload: {} } as ServerEvent);
      this.stopHeartbeat();
    });

    this.socket.onAny((event: string, payload: any = {}) => {
      const serverEvent = { type: event, payload } as ServerEvent;
      if (event === "WORLD_HEARTBEAT") this._worldState = payload;
      console.log("[Arelorian] Event:", event, payload);
      this.dispatch(serverEvent);
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
    this._connected = false;
    if (typeof window !== "undefined" && window.__areloriaClient === this) delete window.__areloriaClient;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping");
      }
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

  emit(event: string, payload: Record<string, unknown>): void {
    if (this.socket?.connected) {
      this.socket.emit(event, payload);
    }
  }

  sendPlayerAction(action: string, payload: Record<string, unknown>): void {
    this.emit("player_action", { action, payload });
  }
}

export function createClient(config: ConnectionConfig): ArelorianClient {
  return new ArelorianClient(config);
}
