import { WebSocket } from 'ws';

export type WatchdogSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WatchdogEvent {
    type: string;
    severity: WatchdogSeverity;
    timestamp: number;
    payload: any;
}

export class WatchdogEmitter {
    private ws: WebSocket | null = null;
    private listeners: ((event: WatchdogEvent) => void)[] = [];

    constructor(private url: string) {
        this.connect();
    }

    private connect(): void {
        try {
            this.ws = new WebSocket(this.url);
            this.ws.on('error', () => {
                console.warn(`[Watchdog Emitter] Could not connect to ${this.url}. Operating in local mode.`);
            });
        } catch (e) {
            console.warn('[Watchdog Emitter] Connection failed.');
        }
    }

    public subscribe(listener: (event: WatchdogEvent) => void): void {
        this.listeners.push(listener);
    }

    public emit(type: string, payload: any, severity: WatchdogSeverity = 'LOW'): void {
        const event: WatchdogEvent = {
            type,
            severity,
            timestamp: Date.now(),
            payload
        };

        // Lokale Listener benachrichtigen
        this.listeners.forEach(l => l(event));

        // Über WebSocket senden, falls verbunden
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(event));
        }
    }
}
