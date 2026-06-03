import { WebSocket } from 'ws';
import { AxiomaticEventBus } from './axiomatic-event-bus';
import {
    createWatchdogTickStamp,
    normalizePositiveInteger,
    normalizeWatchdogEvent,
    type CanonicalWatchdogSeverity,
    type DeterministicWatchdogEvent,
    type WatchdogEvent,
} from './watchdog-determinism';

export type WatchdogSeverity = CanonicalWatchdogSeverity;
export type { WatchdogEvent, DeterministicWatchdogEvent };

export interface WatchdogEmitterOptions {
    initialTick?: number;
    role?: string;
    localOnly?: boolean;
}

export class WatchdogEmitter {
    private ws: WebSocket | null = null;
    private listeners: ((event: DeterministicWatchdogEvent) => void)[] = [];
    private eventBus: AxiomaticEventBus;
    private tick = 0;
    private seq = 0;
    private readonly role: string;
    private readonly localOnly: boolean;

    constructor(private url: string, options: WatchdogEmitterOptions = {}) {
        this.eventBus = AxiomaticEventBus.getInstance();
        this.tick = normalizePositiveInteger(options.initialTick, 0);
        this.role = options.role || 'agent';
        this.localOnly = options.localOnly === true || process.env.WATCHDOG_LOCAL_ONLY === '1';

        if (!this.localOnly) {
            this.connect();
        }
    }

    public setWorldTick(tick: number): void {
        this.tick = normalizePositiveInteger(tick, this.tick);
    }

    public advanceTick(): number {
        this.tick += 1;
        return this.tick;
    }

    public get currentTick(): number {
        return this.tick;
    }

    public get currentSeq(): number {
        return this.seq;
    }

    private connect(): void {
        try {
            this.ws = new WebSocket(this.decorateUrl(this.url));

            this.ws.on('error', () => {
                console.warn(`[Watchdog Emitter] Could not connect to ${this.url}. Operating in local bus mode.`);
            });

            this.ws.on('open', () => {
                console.log(`[Watchdog Emitter] Connected to telemetry sink: ${this.url}`);
            });
        } catch {
            console.warn('[Watchdog Emitter] Connection attempt failed. Operating in local bus mode.');
        }
    }

    private decorateUrl(rawUrl: string): string {
        try {
            const parsed = new URL(rawUrl);
            parsed.searchParams.set('role', this.role);
            return parsed.toString();
        } catch {
            return rawUrl;
        }
    }

    public subscribe(listener: (event: DeterministicWatchdogEvent) => void): void {
        this.listeners.push(listener);
    }

    public unsubscribe(listener: (event: DeterministicWatchdogEvent) => void): void {
        this.listeners = this.listeners.filter((candidate) => candidate !== listener);
    }

    public triggerInstabilityAlert(reason: string, details: Record<string, unknown> = {}, tick = this.tick): void {
        this.emit(
            'WATCHDOG_ALERT',
            {
                reason,
                ...details,
                systemState: 'UNSTABLE',
            },
            'HIGH',
            'JULES_AI',
            tick,
        );
    }

    public emit(
        type: string,
        payload: Record<string, unknown> = {},
        severity: WatchdogSeverity = 'LOW',
        source = 'SYSTEM_CORE',
        tick = this.tick,
    ): DeterministicWatchdogEvent {
        const stamp = createWatchdogTickStamp(tick, ++this.seq);
        this.tick = stamp.tick;

        const event = normalizeWatchdogEvent(
            {
                type,
                severity,
                source,
                origin: source,
                message: type,
                payload,
                metadata: {},
                channel: 'watchdog.emitter',
            },
            stamp,
            source,
        );

        this.broadcast(event);
        return event;
    }

    public emitEvent(event: WatchdogEvent, tick = event.tick ?? this.tick): DeterministicWatchdogEvent {
        const stamp = createWatchdogTickStamp(tick, ++this.seq);
        this.tick = stamp.tick;
        const normalized = normalizeWatchdogEvent(event, stamp, event.origin || event.source || 'SYSTEM_CORE');
        this.broadcast(normalized);
        return normalized;
    }

    private broadcast(event: DeterministicWatchdogEvent): void {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (err) {
                console.error('[Watchdog Emitter] Local listener failed', err);
            }
        }

        this.eventBus.publish(event.type, {
            ...event.payload,
            severity: event.severity,
            source: event.origin,
            origin: event.origin,
            tick: event.tick,
            seq: event.seq,
            timestamp: event.timestamp,
            channel: event.channel,
        });

        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ws.bufferedAmount < 512 * 1024) {
            try {
                this.ws.send(JSON.stringify(event));
            } catch (err) {
                console.error('[Watchdog Emitter] Failed to send over WebSocket', err);
            }
        }
    }
}
