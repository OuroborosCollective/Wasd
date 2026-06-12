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

    /**
     * True = no outbound telemetry socket.
     * Local listeners and AxiomaticEventBus still receive every event.
     */
    localOnly?: boolean;

    /**
     * WebSocket telemetry buffer limit.
     * When exceeded, telemetry send is skipped without affecting the truth path.
     */
    maxBufferedBytes?: number;

    /**
     * Side-channel reconnect. Does not affect deterministic event emission.
     */
    reconnect?: boolean;
    reconnectDelayMs?: number;
    maxReconnectDelayMs?: number;
}

type WatchdogListener = (event: DeterministicWatchdogEvent) => void;

const DEFAULT_ROLE = 'agent';
const DEFAULT_SOURCE = 'SYSTEM_CORE';
const DEFAULT_MAX_BUFFERED_BYTES = 512 * 1024;
const DEFAULT_RECONNECT_DELAY_MS = 1_000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;

function normalizeText(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readOptionalEventTick(event: WatchdogEvent): number | undefined {
    const candidate = (event as WatchdogEvent & { tick?: unknown }).tick;
    return typeof candidate === 'number' ? candidate : undefined;
}

function isLocalOnlyFromEnv(): boolean {
    return typeof process !== 'undefined' && process.env?.WATCHDOG_LOCAL_ONLY === '1';
}

export class WatchdogEmitter {
    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    private readonly listeners = new Set<WatchdogListener>();
    private readonly eventBus = AxiomaticEventBus.getInstance();

    private tick = 0;
    private seq = 0;

    private readonly role: string;
    private readonly localOnly: boolean;
    private readonly maxBufferedBytes: number;

    private readonly reconnectEnabled: boolean;
    private readonly reconnectDelayMs: number;
    private readonly maxReconnectDelayMs: number;

    private currentReconnectDelayMs: number;
    private connecting = false;
    private disposed = false;

    public constructor(private readonly url: string, options: WatchdogEmitterOptions = {}) {
        this.tick = normalizePositiveInteger(options.initialTick, 0);
        this.eventBus.beginTick(this.tick);

        this.role = normalizeText(options.role, DEFAULT_ROLE);
        this.localOnly = options.localOnly === true || isLocalOnlyFromEnv();

        this.maxBufferedBytes = normalizePositiveInteger(
            options.maxBufferedBytes,
            DEFAULT_MAX_BUFFERED_BYTES,
        );

        this.reconnectEnabled = options.reconnect !== false;
        this.reconnectDelayMs = normalizePositiveInteger(
            options.reconnectDelayMs,
            DEFAULT_RECONNECT_DELAY_MS,
        );

        this.maxReconnectDelayMs = Math.max(
            this.reconnectDelayMs,
            normalizePositiveInteger(options.maxReconnectDelayMs, DEFAULT_MAX_RECONNECT_DELAY_MS),
        );

        this.currentReconnectDelayMs = this.reconnectDelayMs;

        if (!this.localOnly) {
            this.connect();
        }
    }

    public setWorldTick(tick: number): void {
        const safeTick = normalizePositiveInteger(tick, this.tick);
        this.tick = safeTick;
        this.seq = 0;
        this.eventBus.beginTick(this.tick);
    }

    public advanceTick(): number {
        if (this.tick >= Number.MAX_SAFE_INTEGER) {
            throw new Error('[Watchdog Emitter] Tick overflow would exceed Number.MAX_SAFE_INTEGER.');
        }

        this.tick += 1;
        this.seq = 0;
        this.eventBus.beginTick(this.tick);
        return this.tick;
    }

    public get currentTick(): number {
        return this.tick;
    }

    public get currentSeq(): number {
        return this.seq;
    }

    public get listenerCount(): number {
        return this.listeners.size;
    }

    public get telemetryConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public get telemetryBufferedAmount(): number {
        return this.ws?.bufferedAmount ?? 0;
    }

    /**
     * Returns an unsubscribe function.
     * Existing callers can still ignore the return value.
     */
    public subscribe(listener: WatchdogListener): () => void {
        this.listeners.add(listener);
        return () => this.unsubscribe(listener);
    }

    public unsubscribe(listener: WatchdogListener): void {
        this.listeners.delete(listener);
    }

    public clearListeners(): void {
        this.listeners.clear();
    }

    public triggerInstabilityAlert(
        reason: string,
        details: Record<string, unknown> = {},
        tick = this.tick,
    ): void {
        this.emit(
            'WATCHDOG_ALERT',
            {
                ...details,
                reason,
                systemState: 'UNSTABLE',
            },
            'HIGH',
            'WATCHDOG_AI',
            tick,
        );
    }

    public emit(
        type: string,
        payload: Record<string, unknown> = {},
        severity: WatchdogSeverity = 'LOW',
        source = DEFAULT_SOURCE,
        tick = this.tick,
    ): DeterministicWatchdogEvent {
        const safeTick = normalizePositiveInteger(tick, this.tick);
        this.ensureTick(safeTick);

        const origin = normalizeText(source, DEFAULT_SOURCE);
        const stamp = createWatchdogTickStamp(this.tick, this.nextSeq());

        const event = normalizeWatchdogEvent(
            {
                type: normalizeText(type, 'WATCHDOG_EVENT'),
                severity,
                source: origin,
                origin,
                message: normalizeText(type, 'WATCHDOG_EVENT'),
                payload: { ...payload },
                metadata: {},
                channel: 'watchdog.emitter',
            },
            stamp,
            origin,
        );

        this.broadcast(event);
        return event;
    }

    public emitEvent(event: WatchdogEvent, tick?: number): DeterministicWatchdogEvent {
        const requestedTick = tick ?? readOptionalEventTick(event) ?? this.tick;
        const safeTick = normalizePositiveInteger(requestedTick, this.tick);
        this.ensureTick(safeTick);

        const origin = normalizeText(event.origin || event.source, DEFAULT_SOURCE);
        const stamp = createWatchdogTickStamp(this.tick, this.nextSeq());
        const normalized = normalizeWatchdogEvent(event, stamp, origin);

        this.broadcast(normalized);
        return normalized;
    }

    /**
     * Stops telemetry, timers, and local listeners.
     * The deterministic bus itself is not destroyed because it is a shared singleton.
     */
    public dispose(): void {
        this.disposed = true;
        this.clearReconnectTimer();
        this.clearListeners();
        this.closeSocket();
    }

    /**
     * Alias for runtime code that expects a close-style lifecycle method.
     */
    public close(): void {
        this.dispose();
    }

    private ensureTick(tick: number): void {
        if (tick !== this.tick) {
            this.tick = tick;
            this.seq = 0;
            this.eventBus.beginTick(this.tick);
        }
    }

    private nextSeq(): number {
        if (this.seq >= Number.MAX_SAFE_INTEGER) {
            throw new Error('[Watchdog Emitter] Sequence overflow would exceed Number.MAX_SAFE_INTEGER.');
        }

        this.seq += 1;
        return this.seq;
    }

    private broadcast(event: DeterministicWatchdogEvent): void {
        this.notifyLocalListeners(event);

        /**
         * Truth path:
         * Do not swallow AxiomaticEventBus failures.
         * If the deterministic local bus rejects the event, the caller must see it.
         */
        this.publishToAxiomaticBus(event);

        /**
         * Side-channel only:
         * WebSocket telemetry may fail, reconnect, or drop under backpressure
         * without altering the deterministic local event result.
         */
        this.sendToTelemetrySink(event);
    }

    private notifyLocalListeners(event: DeterministicWatchdogEvent): void {
        const snapshot = Array.from(this.listeners);

        for (const listener of snapshot) {
            try {
                listener(event);
            } catch (err) {
                console.error('[Watchdog Emitter] Local listener failed', err);
            }
        }
    }

    private publishToAxiomaticBus(event: DeterministicWatchdogEvent): void {
        this.eventBus.publish(
            event.type,
            {
                ...event.payload,
                severity: event.severity,
                source: event.origin,
                origin: event.origin,
                tick: event.tick,
                seq: event.seq,
                timestamp: event.timestamp,
                channel: event.channel,
            },
            {
                tick: event.tick,
                tickSequence: event.seq,
                source: event.origin,
                metadata: {
                    severity: event.severity,
                    channel: event.channel,
                    watchdogTimestamp: event.timestamp,
                },
                violationPolicy: 'reject',
            },
        );
    }

    private sendToTelemetrySink(event: DeterministicWatchdogEvent): void {
        const socket = this.ws;

        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }

        if (socket.bufferedAmount >= this.maxBufferedBytes) {
            return;
        }

        try {
            socket.send(JSON.stringify(event));
        } catch (err) {
            console.error('[Watchdog Emitter] Failed to send over WebSocket', err);
        }
    }

    private connect(): void {
        if (this.localOnly || this.disposed || this.connecting || this.hasLiveSocket()) {
            return;
        }

        const decoratedUrl = this.decorateUrl(this.url);

        if (!this.isValidWebSocketUrl(decoratedUrl)) {
            console.warn(
                `[Watchdog Emitter] Invalid telemetry sink URL "${this.url}". Operating in local bus mode.`,
            );
            return;
        }

        this.clearReconnectTimer();
        this.connecting = true;

        let socket: WebSocket;

        try {
            socket = new WebSocket(decoratedUrl);
        } catch (err) {
            this.ws = null;
            this.connecting = false;
            console.warn(
                `[Watchdog Emitter] Connection attempt failed. Operating in local bus mode. ${this.formatError(
                    err,
                )}`,
            );
            this.scheduleReconnect();
            return;
        }

        this.ws = socket;

        socket.on('open', () => {
            if (this.ws !== socket) {
                return;
            }

            this.connecting = false;
            this.currentReconnectDelayMs = this.reconnectDelayMs;
            console.log(`[Watchdog Emitter] Connected to telemetry sink: ${this.url}`);
        });

        socket.on('error', (err) => {
            if (this.ws !== socket) {
                return;
            }

            this.connecting = false;
            console.warn(
                `[Watchdog Emitter] Telemetry sink error. Operating in local bus mode. ${this.formatError(
                    err,
                )}`,
            );
        });

        socket.on('close', () => {
            if (this.ws === socket) {
                this.ws = null;
            }

            this.connecting = false;
            this.scheduleReconnect();
        });
    }

    private scheduleReconnect(): void {
        if (
            this.disposed ||
            this.localOnly ||
            !this.reconnectEnabled ||
            this.reconnectTimer !== null
        ) {
            return;
        }

        const delayMs = this.currentReconnectDelayMs;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delayMs);

        this.currentReconnectDelayMs = Math.min(
            this.maxReconnectDelayMs,
            this.currentReconnectDelayMs * 2,
        );
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private closeSocket(): void {
        const socket = this.ws;
        this.ws = null;
        this.connecting = false;

        if (!socket) {
            return;
        }

        try {
            socket.removeAllListeners();

            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
                return;
            }

            socket.terminate();
        } catch (err) {
            console.warn(`[Watchdog Emitter] Failed to close telemetry socket. ${this.formatError(err)}`);
        }
    }

    private hasLiveSocket(): boolean {
        return (
            this.ws?.readyState === WebSocket.OPEN ||
            this.ws?.readyState === WebSocket.CONNECTING
        );
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

    private isValidWebSocketUrl(rawUrl: string): boolean {
        try {
            const parsed = new URL(rawUrl);
            return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
        } catch {
            return false;
        }
    }

    private formatError(err: unknown): string {
        if (err instanceof Error) {
            return err.message;
        }

        return String(err);
    }
}
