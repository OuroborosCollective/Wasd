import { WebSocket } from 'ws';
import { AxiomaticEventBus } from './axiomatic-event-bus';

export type WatchdogSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WatchdogEvent {
    type: string;
    severity: WatchdogSeverity;
    timestamp: number;
    source: string;
    payload: any;
}

export class WatchdogEmitter {
    private ws: WebSocket | null = null;
    private listeners: ((event: WatchdogEvent) => void)[] = [];
    private eventBus: AxiomaticEventBus;

    constructor(private url: string) {
        this.eventBus = AxiomaticEventBus.getInstance();
        this.connect();
    }

    private connect(): void {
        try {
            this.ws = new WebSocket(this.url);
            this.ws.on('error', () => {
                console.warn(`[Watchdog Emitter] Could not connect to ${this.url}. Operating in local/bus mode.`);
            });
            this.ws.on('open', () => {
                console.log(`[Watchdog Emitter] Connected to telemetry sink: ${this.url}`);
            });
        } catch (e) {
            console.warn('[Watchdog Emitter] Connection attempt failed.');
        }
    }

    public subscribe(listener: (event: WatchdogEvent) => void): void {
        this.listeners.push(listener);
    }

    /**
     * Triggers a global system instability alert via the AxiomaticEventBus.
     * Specifically used for Jules AI context and reality-bus synchronization.
     */
    public triggerInstabilityAlert(reason: string, details: any = {}): void {
        const alertEvent: WatchdogEvent = {
            type: 'WATCHDOG_ALERT',
            severity: 'HIGH',
            timestamp: Date.now(),
            source: 'JULES_AI',
            payload: {
                reason,
                ...details,
                systemState: 'UNSTABLE'
            }
        };

        this.broadcast(alertEvent);
    }

    /**
     * Standard emit for general watchdog events.
     */
    public emit(type: string, payload: any, severity: WatchdogSeverity = 'LOW', source: string = 'SYSTEM_CORE'): void {
        const event: WatchdogEvent = {
            type,
            severity,
            timestamp: Date.now(),
            source,
            payload
        };

        this.broadcast(event);
    }

    private broadcast(event: WatchdogEvent): void {
        // 1. Notify Local Listeners
        this.listeners.forEach(l => l(event));

        // 2. Feed into Axiomatic Event Bus (Reality-Bus)
        this.eventBus.publish(event.type, {
            ...event.payload,
            severity: event.severity,
            source: event.source,
            timestamp: event.timestamp
        });

        // 3. Send via WebSocket if available
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(event));
            } catch (err) {
                console.error('[Watchdog Emitter] Failed to send over WebSocket', err);
            }
        }
    }
}