import {
    WATCHDOG_TICK_HZ,
    WATCHDOG_TICK_MS,
    deterministicPayloadHash,
    fnv1a32,
    normalizePositiveInteger,
    sanitizeText,
    stableStringify,
} from './watchdog-determinism';

export const AXIOMATIC_EVENT_SCHEMA_VERSION = 2 as const;
export const AXIOMATIC_TICK_HZ = WATCHDOG_TICK_HZ;
export const AXIOMATIC_TICK_MS = WATCHDOG_TICK_MS;
export const KAPPA_INVARIANT = 1000 as const;
export const AXIOMATIC_WILDCARD_EVENT = '*' as const;

export type AxiomaticPayload = unknown;
export type AxiomaticListener<TPayload = AxiomaticPayload> = (event: IAxiomaticEvent<TPayload>) => void;
export type DeterminismViolationPolicy = 'reject' | 'coerce';

export interface IAxiomaticEvent<TPayload = AxiomaticPayload> {
    /** Stable canonical id: evt_${tick}_${tickSequence}_${sequenceId}_${hash}. */
    id: string;
    /** Strict global monotonic sequence id assigned by the bus. */
    sequenceId: number;
    /** Sequence number inside one 10Hz world tick. */
    tickSequence: number;
    /** Deterministic 10Hz world tick. Never derived from wall-clock time. */
    tick: number;
    /** Event topic/type. */
    type: string;
    /** Deterministic simulation milliseconds: tick * 100 for 10Hz. */
    timestamp: number;
    payload: TPayload;
    actorId?: string;
    source?: string;
    metadata: {
        resonance: number;
        kappa: number[];
        payloadHash: string;
        canonicalSize: number;
        tickHz: number;
        tickMs: number;
        deterministic: true;
        violation?: string;
        [key: string]: unknown;
    };
    version: typeof AXIOMATIC_EVENT_SCHEMA_VERSION;
}

export interface AxiomaticPublishOptions {
    tick?: number;
    tickSequence?: number;
    actorId?: string;
    source?: string;
    metadata?: Record<string, unknown>;
    /** Defaults to reject. Use coerce only for legacy telemetry bridges. */
    violationPolicy?: DeterminismViolationPolicy;
    silent?: boolean;
}

export type AxiomaticEventDraft<TPayload = AxiomaticPayload> = Partial<IAxiomaticEvent<TPayload>> & {
    type: string;
    payload?: TPayload;
};

interface ListenerEntry {
    id: number;
    type: string;
    listener: AxiomaticListener;
    once: boolean;
    priority: number;
}

export interface AxiomaticLedgerStats {
    size: number;
    max: number;
    full: boolean;
    currentTick: number;
    currentTickSequence: number;
    currentResonance: number;
    lastSequenceId: number;
    tickHz: number;
    tickMs: number;
    deterministic: true;
}

/** Deterministic ARE helpers shared by replay/debug systems. */
export class AREStateCompiler {
    private static readonly RESONANCE_PRIME = 16807;
    private static readonly RESONANCE_MAX = 2147483647;

    public static computeKappa(seed: number): Int32Array {
        const safeSeed = normalizePositiveInteger(seed, 1) || 1;
        const kappaVector = new Int32Array(3);
        kappaVector[0] = Math.trunc(safeSeed * KAPPA_INVARIANT);

        const resonanceX = this.computeResonance(safeSeed);
        const resonanceY = this.computeResonance(resonanceX);

        kappaVector[1] = resonanceX % KAPPA_INVARIANT;
        kappaVector[2] = resonanceY % KAPPA_INVARIANT;

        return kappaVector;
    }

    public static computeResonance(value: number): number {
        const seed = normalizePositiveInteger(Math.abs(value), 1) || 1;
        return (seed * this.RESONANCE_PRIME) % this.RESONANCE_MAX;
    }

    public static calculateEventResonance(event: Pick<IAxiomaticEvent, 'sequenceId' | 'tick' | 'tickSequence' | 'type' | 'payload'>): number {
        const dataString = `${event.tick}:${event.tickSequence}:${event.sequenceId}:${event.type}:${stableStringify(event.payload)}`;
        return this.computeResonance(fnv1a32(dataString));
    }

    public static payloadHash(payload: unknown): string {
        return deterministicPayloadHash(payload);
    }
}

/**
 * AxiomaticEventBus
 * Strict deterministic event hub for the 10Hz world server and watchdog stack.
 */
export class AxiomaticEventBus {
    private static instance: AxiomaticEventBus | null = null;

    private readonly MAX_LEDGER_SIZE = 50000;
    private eventLedger: Array<IAxiomaticEvent | null> = new Array(this.MAX_LEDGER_SIZE).fill(null);
    private listeners = new Map<string, ListenerEntry[]>();
    private writePointer = 0;
    private isFull = false;
    private globalSequenceId = 0;
    private listenerSequenceId = 0;
    private currentTick = 0;
    private currentTickSequence = 0;
    private globalResonanceState = 0;

    private constructor() {}

    public static getInstance(): AxiomaticEventBus {
        if (!AxiomaticEventBus.instance) {
            AxiomaticEventBus.instance = new AxiomaticEventBus();
        }
        return AxiomaticEventBus.instance;
    }

    public setWorldTick(tick: number): void {
        const nextTick = normalizePositiveInteger(tick, this.currentTick);
        if (nextTick < this.currentTick) {
            throw new Error(`[AxiomaticEventBus] Refused backwards world tick: ${nextTick} < ${this.currentTick}.`);
        }
        if (nextTick !== this.currentTick) {
            this.currentTick = nextTick;
            this.currentTickSequence = 0;
        }
    }

    public beginTick(tick: number): void {
        this.setWorldTick(tick);
    }

    public endTick(tick = this.currentTick): AxiomaticLedgerStats {
        const safeTick = normalizePositiveInteger(tick, this.currentTick);
        if (safeTick !== this.currentTick) {
            throw new Error(`[AxiomaticEventBus] endTick mismatch: ${safeTick} !== ${this.currentTick}.`);
        }
        return this.getLedgerStats();
    }

    public subscribe<TPayload = AxiomaticPayload>(type: string, listener: AxiomaticListener<TPayload>, priority = 0): () => void {
        return this.addListener(type, listener as AxiomaticListener, false, priority);
    }

    public once<TPayload = AxiomaticPayload>(type: string, listener: AxiomaticListener<TPayload>, priority = 0): () => void {
        return this.addListener(type, listener as AxiomaticListener, true, priority);
    }

    public on<TPayload = AxiomaticPayload>(type: string, listener: AxiomaticListener<TPayload>): this {
        this.subscribe(type, listener);
        return this;
    }

    public off<TPayload = AxiomaticPayload>(type: string, listener: AxiomaticListener<TPayload>): this {
        const list = this.listeners.get(type) ?? [];
        const next = list.filter((entry) => entry.listener !== listener);
        if (next.length === 0) this.listeners.delete(type);
        else this.listeners.set(type, next);
        return this;
    }

    public publish<TPayload = AxiomaticPayload>(type: string, payload?: TPayload, options?: AxiomaticPublishOptions): IAxiomaticEvent<TPayload>;
    public publish<TPayload = AxiomaticPayload>(event: AxiomaticEventDraft<TPayload>, options?: AxiomaticPublishOptions): IAxiomaticEvent<TPayload>;
    public publish<TPayload = AxiomaticPayload>(
        input: string | AxiomaticEventDraft<TPayload>,
        payloadOrOptions?: TPayload | AxiomaticPublishOptions,
        maybeOptions: AxiomaticPublishOptions = {},
    ): IAxiomaticEvent<TPayload> {
        const draft = typeof input === 'string' ? { type: input, payload: payloadOrOptions as TPayload } : input;
        const options = typeof input === 'string' ? maybeOptions : ((payloadOrOptions as AxiomaticPublishOptions | undefined) ?? {});

        const type = sanitizeText(draft.type, 'axiomatic.event');
        const requestedTick = options.tick ?? draft.tick ?? readNumericField(draft.payload, 'tick') ?? this.currentTick;
        let tick = normalizePositiveInteger(requestedTick, this.currentTick);
        let violation: string | undefined;

        if (tick < this.currentTick) {
            violation = `backwards_tick:${tick}<${this.currentTick}`;
            if ((options.violationPolicy ?? 'reject') === 'reject') {
                throw new Error(`[AxiomaticEventBus] Refused non-monotonic event "${type}" (${violation}).`);
            }
            tick = this.currentTick;
        }

        if (tick > this.currentTick) {
            this.currentTick = tick;
            this.currentTickSequence = 0;
        }

        const explicitTickSequence = options.tickSequence ?? draft.tickSequence;
        const tickSequence = explicitTickSequence === undefined
            ? ++this.currentTickSequence
            : normalizePositiveInteger(explicitTickSequence, ++this.currentTickSequence);
        this.currentTickSequence = Math.max(this.currentTickSequence, tickSequence);

        const sequenceId = this.globalSequenceId++;
        const timestamp = tick * AXIOMATIC_TICK_MS;
        const payload = (draft.payload ?? {}) as TPayload;
        const canonicalPayload = stableStringify(payload);
        const payloadHash = AREStateCompiler.payloadHash(payload);

        const baseEvent: IAxiomaticEvent<TPayload> = {
            id: '',
            sequenceId,
            tickSequence,
            tick,
            type,
            timestamp,
            payload,
            metadata: {
                ...(draft.metadata ?? {}),
                ...(options.metadata ?? {}),
                resonance: 0,
                kappa: [],
                payloadHash,
                canonicalSize: canonicalPayload.length,
                tickHz: AXIOMATIC_TICK_HZ,
                tickMs: AXIOMATIC_TICK_MS,
                deterministic: true,
            },
            version: AXIOMATIC_EVENT_SCHEMA_VERSION,
        };

        const actorId = options.actorId ?? draft.actorId ?? readStringField(payload, 'actorId');
        const source = options.source ?? draft.source ?? readStringField(payload, 'source') ?? readStringField(payload, 'origin');
        if (actorId) baseEvent.actorId = actorId;
        if (source) baseEvent.source = source;
        if (violation) baseEvent.metadata.violation = violation;

        const resonanceAdjustment = AREStateCompiler.calculateEventResonance(baseEvent);
        const kappaVector = AREStateCompiler.computeKappa(sequenceId + tick + tickSequence + resonanceAdjustment);

        baseEvent.metadata.resonance = resonanceAdjustment;
        baseEvent.metadata.kappa = Array.from(kappaVector);
        baseEvent.id = `evt_${tick}_${tickSequence}_${sequenceId}_${payloadHash}`;

        this.globalResonanceState = (this.globalResonanceState + resonanceAdjustment) % 2147483647;
        this.appendLedger(baseEvent);

        if (!options.silent) {
            console.log(`[AxiomaticEventBus] #${sequenceId} tick=${tick}.${tickSequence} ${type}`, {
                id: baseEvent.id,
                source: baseEvent.source,
                resonance: baseEvent.metadata.resonance,
                payloadHash,
            });
        }

        this.dispatch(baseEvent);
        return baseEvent;
    }

    public getHistory(type?: string): IAxiomaticEvent[] {
        const raw = this.isFull
            ? [...this.eventLedger.slice(this.writePointer), ...this.eventLedger.slice(0, this.writePointer)]
            : this.eventLedger.slice(0, this.writePointer);

        const history = raw.filter((event): event is IAxiomaticEvent => event !== null);
        const filtered = type ? history.filter((event) => event.type === type) : history;
        return filtered.sort((a, b) => a.sequenceId - b.sequenceId);
    }

    public getHistoryByType(type: string): IAxiomaticEvent[] {
        return this.getHistory(type);
    }

    public replay(type: string, listener: AxiomaticListener): number {
        const events = this.getHistory(type);
        for (const event of events) listener(event);
        return events.length;
    }

    public listenerCount(type?: string): number {
        if (type) return this.listeners.get(type)?.length ?? 0;
        let count = 0;
        for (const list of this.listeners.values()) count += list.length;
        return count;
    }

    public clearLedger(): void {
        this.eventLedger = new Array(this.MAX_LEDGER_SIZE).fill(null);
        this.writePointer = 0;
        this.isFull = false;
        this.globalSequenceId = 0;
        this.currentTick = 0;
        this.currentTickSequence = 0;
        this.globalResonanceState = 0;
    }

    public clearListeners(type?: string): void {
        if (type) this.listeners.delete(type);
        else this.listeners.clear();
    }

    public resetForTest(): void {
        this.clearLedger();
        this.clearListeners();
        this.listenerSequenceId = 0;
    }

    public getLedgerStats(): AxiomaticLedgerStats {
        return {
            size: this.isFull ? this.MAX_LEDGER_SIZE : this.writePointer,
            max: this.MAX_LEDGER_SIZE,
            full: this.isFull,
            currentTick: this.currentTick,
            currentTickSequence: this.currentTickSequence,
            currentResonance: this.globalResonanceState,
            lastSequenceId: this.globalSequenceId - 1,
            tickHz: AXIOMATIC_TICK_HZ,
            tickMs: AXIOMATIC_TICK_MS,
            deterministic: true,
        };
    }

    private addListener(type: string, listener: AxiomaticListener, once: boolean, priority: number): () => void {
        const safeType = sanitizeText(type, AXIOMATIC_WILDCARD_EVENT);
        const entry: ListenerEntry = {
            id: ++this.listenerSequenceId,
            type: safeType,
            listener,
            once,
            priority: normalizePositiveInteger(priority, 0),
        };

        const list = this.listeners.get(safeType) ?? [];
        list.push(entry);
        list.sort(compareListeners);
        this.listeners.set(safeType, list);

        return () => this.unsubscribeById(safeType, entry.id);
    }

    private unsubscribeById(type: string, listenerId: number): void {
        const list = this.listeners.get(type);
        if (!list) return;
        const next = list.filter((entry) => entry.id !== listenerId);
        if (next.length === 0) this.listeners.delete(type);
        else this.listeners.set(type, next);
    }

    private appendLedger(event: IAxiomaticEvent): void {
        this.eventLedger[this.writePointer] = event;
        this.writePointer += 1;
        if (this.writePointer >= this.MAX_LEDGER_SIZE) {
            this.writePointer = 0;
            this.isFull = true;
        }
    }

    private dispatch(event: IAxiomaticEvent): void {
        const directListeners = this.listeners.get(event.type) ?? [];
        const wildcardListeners = this.listeners.get(AXIOMATIC_WILDCARD_EVENT) ?? [];
        const executionList = [...directListeners, ...wildcardListeners].sort(compareListeners);

        for (const entry of executionList) {
            try {
                entry.listener(event);
            } catch (err) {
                console.error(`[AxiomaticEventBus] Listener failed for "${event.type}"`, err);
            }
            if (entry.once) this.unsubscribeById(entry.type, entry.id);
        }
    }
}

function compareListeners(a: ListenerEntry, b: ListenerEntry): number {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id - b.id;
}

function readNumericField(value: unknown, key: string): number | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const raw = (value as Record<string, unknown>)[key];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function readStringField(value: unknown, key: string): string | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const raw = (value as Record<string, unknown>)[key];
    return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
}

export const eventBus = AxiomaticEventBus.getInstance();
