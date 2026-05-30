export interface PlayerState {
  id?: string;
  name: string;
  x: number;
  z: number;
}

export interface AgentState {
  id?: string;
  name: string;
  x: number;
  z: number;
}

type Handler = (event?: any) => void;
type HandlerMap = Map<string, Set<Handler>>;

export interface NetworkClientOptions {
  url: string;
  heartbeatInterval?: number;
}

export interface NetworkClient {
  connected: boolean;
  on(event: string, handler: Handler): void;
  off(event: string, handler: Handler): void;
  connect(): void;
  disconnect(): void;
  sendPlayerAction(action: string, payload: Record<string, unknown>): void;
}

function dispatchWorldPacket(event: string, payload?: any): void {
  if (typeof window === "undefined") return;
  // Spatial snapshot events drive the multiplayer sync system
  if (event !== "WORLD_HEARTBEAT" && event !== "world_tick" && event !== "world_snapshot") return;
  window.dispatchEvent(new CustomEvent("wasd:world-packet", { detail: payload }));
}

function dispatchNetworkPacket(event: string, payload?: any): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("wasd:network-packet", { detail: { event, payload } }));
}

class LocalNetworkClient implements NetworkClient {
  public connected = false;
  private socket: WebSocket | null = null;
  private readonly handlers: HandlerMap = new Map();
  private readonly outboundActionHandler = (event: Event): void => {
    const detail = (event as CustomEvent<{ action?: string; payload?: Record<string, unknown> }>).detail;
    if (!detail?.action) return;
    this.sendPlayerAction(detail.action, detail.payload ?? {});
  };

  constructor(private readonly options: NetworkClientOptions) {}

  public on(event: string, handler: Handler): void {
    const set = this.handlers.get(event) ?? new Set<Handler>();
    set.add(handler);
    this.handlers.set(event, set);
  }

  public off(event: string, handler: Handler): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.handlers.delete(event);
  }

  public connect(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("wasd:client-action", this.outboundActionHandler as EventListener);
      window.addEventListener("wasd:client-action", this.outboundActionHandler as EventListener);
    }
    const wsUrl = this.toWebSocketUrl(this.options.url);
    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.addEventListener("open", () => {
        this.connected = true;
        this.emit("connect");
      });
      this.socket.addEventListener("close", () => {
        this.connected = false;
        this.emit("disconnect");
      });
      this.socket.addEventListener("error", () => {
        this.connected = false;
        this.emit("disconnect");
      });
      this.socket.addEventListener("message", (message) => this.handleMessage(message.data));
    } catch {
      this.connected = false;
      this.emit("disconnect");
    }
  }

  public disconnect(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("wasd:client-action", this.outboundActionHandler as EventListener);
    }
    this.socket?.close();
    this.socket = null;
    this.connected = false;
    this.emit("disconnect");
  }

  public sendPlayerAction(action: string, payload: Record<string, unknown>): void {
    const packet = JSON.stringify({ type: action, payload });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(packet);
    }
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== "string") return;
    try {
      const parsed = JSON.parse(raw);
      const type = parsed.type ?? parsed.event;
      if (typeof type === "string") this.emit(type, parsed);
    } catch {
      // Ignore malformed packets. The server is authoritative for the 2D world.
    }
  }

  private emit(event: string, payload?: any): void {
    dispatchWorldPacket(event, payload);
    dispatchNetworkPacket(event, payload);
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }

  private resolveRuntimeBase(fallbackBase: string): string {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return fallbackBase;
  }

  private toWebSocketUrl(base: string): string {
    const url = new URL("/ws", this.resolveRuntimeBase(base));
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  }
}

export function createClient(options: NetworkClientOptions): NetworkClient {
  return new LocalNetworkClient(options);
}
