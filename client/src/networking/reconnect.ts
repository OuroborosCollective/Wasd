/**
 * Reconnect with exponential backoff.
 * Wraps a WebSocket factory and retries on close/error.
 */

export interface ReconnectOptions {
  /** Initial delay in ms (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number;
  /** Maximum number of retries (default: Infinity = unlimited) */
  maxRetries?: number;
  /** Jitter factor 0-1 (default: 0.3) */
  jitter?: number;
  /** Called on each retry attempt */
  onRetry?: (attempt: number, delayMs: number) => void;
  /** Called when max retries exhausted */
  onGiveUp?: () => void;
}

export class ReconnectingSocket {
  private factory: () => WebSocket;
  private opts: Required<ReconnectOptions>;
  private socket: WebSocket | null = null;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private _connected = false;

  constructor(factory: () => WebSocket, options: ReconnectOptions = {}) {
    this.factory = factory;
    this.opts = {
      baseDelayMs: options.baseDelayMs ?? 1000,
      maxDelayMs: options.maxDelayMs ?? 30000,
      maxRetries: options.maxRetries ?? Infinity,
      jitter: options.jitter ?? 0.3,
      onRetry: options.onRetry ?? (() => {}),
      onGiveUp: options.onGiveUp ?? (() => {}),
    };
  }

  get isConnected(): boolean {
    return this._connected;
  }

  get currentAttempt(): number {
    return this.attempt;
  }

  /** Start connecting (or reconnecting). */
  connect(): void {
    this.stopped = false;
    this.attempt = 0;
    this.doConnect();
  }

  /** Stop reconnecting. */
  disconnect(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.socket) {
      try { this.socket.close(4000, "client disconnect"); } catch { /* ignore */ }
      this.socket = null;
    }
    this._connected = false;
  }

  /** Get the underlying socket (may be null). */
  getSocket(): WebSocket | null {
    return this.socket;
  }

  private doConnect(): void {
    if (this.stopped) return;

    try {
      this.socket = this.factory();
    } catch {
      this.scheduleRetry();
      return;
    }

    const ws = this.socket;

    ws.onopen = () => {
      this._connected = true;
      this.attempt = 0; // Reset backoff on successful connect
    };

    ws.onclose = () => {
      this._connected = false;
      if (!this.stopped) {
        this.scheduleRetry();
      }
    };

    ws.onerror = () => {
      // onerror is usually followed by onclose, so the retry happens there
    };
  }

  private scheduleRetry(): void {
    if (this.stopped) return;

    this.attempt++;
    if (this.attempt > this.opts.maxRetries) {
      this.opts.onGiveUp();
      return;
    }

    const base = Math.min(
      this.opts.baseDelayMs * Math.pow(2, this.attempt - 1),
      this.opts.maxDelayMs
    );
    const jitter = base * this.opts.jitter * (Math.random() * 2 - 1);
    const delay = Math.max(0, Math.round(base + jitter));

    this.opts.onRetry(this.attempt, delay);

    this.timer = setTimeout(() => {
      this.timer = null;
      this.doConnect();
    }, delay);
  }
}
