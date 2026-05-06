import { WebSocket } from 'ws';

export class WatchdogEmitter {
    private ws: WebSocket | null = null;

    constructor(url: string) {
        try {
            this.ws = new WebSocket(url);
        } catch (e) {
            console.error('Failed to connect to Watchdog Server');
        }
    }

    public emit(event: string, data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event, data, timestamp: new Date() }));
        }
    }
}
