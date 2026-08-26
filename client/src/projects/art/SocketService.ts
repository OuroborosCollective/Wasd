export interface PixelUpdate {
  index: number;
  txId: string;
}

/**
 * Socket service for pixel art WebSocket updates
 * @deprecated Art server endpoint /api/art/ws is not currently implemented.
 *             This service will attempt to connect but no server handles these connections.
 *             Track in issue #XXXX for art server implementation.
 */
export class SocketService {
  private socket: WebSocket | null = null;
  private listeners: ((data: PixelUpdate) => void)[] = [];
  private url: string;
  private reconnectInterval: number = 5000;

  constructor(url?: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // @deprecated - /api/art/ws endpoint not mounted on server
    this.url = url || `${protocol}//${window.location.host}/api/art/ws`;
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data: PixelUpdate = JSON.parse(event.data);
          if (typeof data.index === 'number' && typeof data.txId === 'string') {
            this.notifyListeners(data);
          }
        } catch (e) {
          // Ignore malformed messages
        }
      };

      this.socket.onclose = () => {
        this.socket = null;
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.socket.onerror = () => {
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch (error) {
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  public subscribe(callback: (data: PixelUpdate) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public emitUpdate(index: number, txId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload: PixelUpdate = { index, txId };
      this.socket.send(JSON.stringify(payload));
    }
  }

  private notifyListeners(data: PixelUpdate): void {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error("Error in SocketService listener", e);
      }
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();