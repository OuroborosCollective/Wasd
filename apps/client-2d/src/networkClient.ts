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
  connect(): void;
  disconnect(): void;
  sendPlayerAction(action: string, payload: Record<string, unknown>): void;
}

class LocalNetworkClient implements NetworkClient {
  public connected = false;
  private socket: WebSocket | null = null;
  private readonly handlers: HandlerMap = new Map();
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private px = 0;
  private pz = 0;
  private isDisconnectedManually = false;

  constructor(private readonly options: NetworkClientOptions) {}

  public on(event: string, handler: Handler): void {
    const set = this.handlers.get(event) ?? new Set<Handler>();
    set.add(handler);
    this.handlers.set(event, set);
  }

  public connect(): void {
    if (this.socket || this.reconnectTimer) return;
    this.isDisconnectedManually = false;

    const wsUrl = this.toWebSocketUrl(this.options.url);
    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.addEventListener('open', () => {
        this.connected = true;
        if (this.fallbackTimer) clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
        this.emit('connect');
      });
      this.socket.addEventListener('close', () => {
        this.handleSocketClosed();
      });
      this.socket.addEventListener('error', () => {
        this.handleSocketClosed();
      });
      this.socket.addEventListener('message', (message) => this.handleMessage(message.data));
    } catch {
      this.handleSocketClosed();
    }
  }

  private handleSocketClosed(): void {
    this.socket = null;
    this.connected = false;
    this.emit('disconnect');

    if (this.isDisconnectedManually) return;

    this.startFallback();

    // Attempt reconnection after 5 seconds
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 5000);
    }
  }

  public disconnect(): void {
    this.isDisconnectedManually = true;
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.fallbackTimer = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
    this.connected = false;
    this.emit('disconnect');
  }

  public sendPlayerAction(action: string, payload: Record<string, unknown>): void {
    if (action === 'MOVE') {
      const dx = Number(payload.dx ?? 0);
      const dz = Number(payload.dz ?? 0);
      this.px += Math.max(-1, Math.min(1, dx)) * 0.25;
      this.pz += Math.max(-1, Math.min(1, dz)) * 0.25;
      // Only emit locally if not connected to avoid double-stepping when server echoes
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.emitWorld();
      }
    }

    const packet = JSON.stringify({ type: action, payload });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(packet);
    }
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    try {
      const parsed = JSON.parse(raw);
      const type = parsed.type ?? parsed.event;
      if (typeof type === 'string') this.emit(type, parsed);
    } catch {
      // Ignore malformed packets; the 2D client keeps rendering the local fallback world.
    }
  }

  private startFallback(): void {
    if (this.fallbackTimer) return;
    // We stay "connected" in a local sense for usability
    this.emitWorld();
    this.fallbackTimer = setInterval(() => this.emitWorld(), this.options.heartbeatInterval ?? 3000);
  }

  private emitWorld(): void {
    this.emit('WORLD_HEARTBEAT', {
      payload: {
        players: {
          local_player: { id: 'local_player', name: 'You (Local)', x: this.px, z: this.pz },
        },
        agents: {
          elder: { id: 'elder', name: 'Elder', x: 2, z: -2 },
          scout: { id: 'scout', name: 'Scout', x: -3, z: 1 },
        },
      },
    });
  }

  private emit(event: string, payload?: any): void {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }

  private toWebSocketUrl(base: string): string {
    const url = new URL('/ws', base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }
}

export function createClient(options: NetworkClientOptions): NetworkClient {
  return new LocalNetworkClient(options);
}
