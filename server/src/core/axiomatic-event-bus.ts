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
export const KAPPA_INVARIANT = 1000 as const;
export const AXIOMATIC_WILDCARD_EVENT = '*' as const;

export type AxiomaticListener<TPayload = unknown> = (event: IAxiomaticEvent<TPayload>) => void;
export type DeterminismViolationPolicy = 'reject' | 'coerce';

export interface IAxiomaticEvent<TPayload = unknown> {
  id: string;
  sequenceId: number;
  tickSequence: number;
  tick: number;
  type: string;
  timestamp: number;
  payload: TPayload;
  actorId?: string;
  source?: string;
  metadata: Record<string, unknown> & {
    resonance: number;
    kappa: number[];
    payloadHash: string;
    canonicalSize: number;
    tickHz: typeof WATCHDOG_TICK_HZ;
    tickMs: typeof WATCHDOG_TICK_MS;
    deterministic: true;
  };
  version: typeof AXIOMATIC_EVENT_SCHEMA_VERSION;
}

export interface AxiomaticPublishOptions {
  tick?: number;
  tickSequence?: number;
  actorId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  violationPolicy?: DeterminismViolationPolicy;
  silent?: boolean;
}

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
  tickHz: typeof WATCHDOG_TICK_HZ;
  tickMs: typeof WATCHDOG_TICK_MS;
  deterministic: true;
}

export class AREStateCompiler {
  private static readonly RESONANCE_PRIME = 16807;
  private static readonly RESONANCE_MAX = 2147483647;

  public static computeResonance(value: number): number {
    const seed = normalizePositiveInteger(Math.abs(value), 1) || 1;
    return (seed * this.RESONANCE_PRIME) % this.RESONANCE_MAX;
  }

  public static computeKappa(seed: number): number[] {
    const safeSeed = normalizePositiveInteger(seed, 1) || 1;
    const x = this.computeResonance(safeSeed);
    const y = this.computeResonance(x);
    return [Math.trunc(safeSeed * KAPPA_INVARIANT), x % KAPPA_INVARIANT, y % KAPPA_INVARIANT];
  }

  public static calculateEventResonance(event: Pick<IAxiomaticEvent, 'sequenceId' | 'tick' | 'tickSequence' | 'type' | 'payload'>): number {
    return this.computeResonance(fnv1a32(`${event.tick}:${event.tickSequence}:${event.sequenceId}:${event.type}:${stableStringify(event.payload)}`));
  }
}

export class AxiomaticEventBus {
  private static instance: AxiomaticEventBus | null = null;
  private readonly maxLedgerSize = 50000;
  private readonly eventLedger: IAxiomaticEvent[] = [];
  private readonly listeners = new Map<string, ListenerEntry[]>();
  private globalSequenceId = 0;
  private listenerSequenceId = 0;
  private currentTick = 0;
  private currentTickSequence = 0;
  private globalResonanceState = 0;

  private constructor() {}

  public static getInstance(): AxiomaticEventBus {
    if (!AxiomaticEventBus.instance) AxiomaticEventBus.instance = new AxiomaticEventBus();
    return AxiomaticEventBus.instance;
  }

  public beginTick(tick: number): void {
    const nextTick = normalizePositiveInteger(tick, this.currentTick);
    if (nextTick < this.currentTick) throw new Error(`[AxiomaticEventBus] Refused backwards world tick: ${nextTick} < ${this.currentTick}.`);
    if (nextTick !== this.currentTick) {
      this.currentTick = nextTick;
      this.currentTickSequence = 0;
    }
  }

  public publish<TPayload = unknown>(type: string, payload?: TPayload, options: AxiomaticPublishOptions = {}): IAxiomaticEvent<TPayload> {
    const eventType = sanitizeText(type, 'axiomatic.event');
    const requestedTick = options.tick ?? readNumericField(payload, 'tick') ?? this.currentTick;
    let tick = normalizePositiveInteger(requestedTick, this.currentTick);
    let violation: string | undefined;

    if (tick < this.currentTick) {
      violation = `backwards_tick:${tick}<${this.currentTick}`;
      if ((options.violationPolicy ?? 'reject') === 'reject') throw new Error(`[AxiomaticEventBus] Refused non-monotonic event "${eventType}".`);
      tick = this.currentTick;
    }

    this.beginTick(tick);

    const tickSequence = options.tickSequence ?? ++this.currentTickSequence;
    this.currentTickSequence = Math.max(this.currentTickSequence, tickSequence);

    const sequenceId = this.globalSequenceId++;
    const canonicalPayload = stableStringify(payload ?? {});
    const payloadHash = deterministicPayloadHash(payload ?? {});
    const timestamp = tick * WATCHDOG_TICK_MS;

    const event: IAxiomaticEvent<TPayload> = {
      id: '',
      sequenceId,
      tickSequence,
      tick,
      type: eventType,
      timestamp,
      payload: (payload ?? {}) as TPayload,
      actorId: options.actorId ?? readStringField(payload, 'actorId'),
      source: options.source ?? readStringField(payload, 'source') ?? readStringField(payload, 'origin'),
      metadata: {
        ...(options.metadata ?? {}),
        resonance: 0,
        kappa: [],
        payloadHash,
        canonicalSize: canonicalPayload.length,
        tickHz: WATCHDOG_TICK_HZ,
        tickMs: WATCHDOG_TICK_MS,
        deterministic: true,
        ...(violation ? { violation } : {}),
      },
      version: AXIOMATIC_EVENT_SCHEMA_VERSION,
    };

    const resonance = AREStateCompiler.calculateEventResonance(event);
    event.metadata.resonance = resonance;
    event.metadata.kappa = AREStateCompiler.computeKappa(sequenceId + tick + tickSequence + resonance);
    event.id = `evt_${tick}_${tickSequence}_${sequenceId}_${payloadHash}`;

    this.globalResonanceState = (this.globalResonanceState + resonance) % 2147483647;
    this.eventLedger.push(event);
    if (this.eventLedger.length > this.maxLedgerSize) this.eventLedger.shift();

    if (!options.silent) console.log(`[AxiomaticEventBus] #${sequenceId} tick=${tick}.${tickSequence} ${eventType}`, { id: event.id, payloadHash });
    this.dispatch(event);
    return event;
  }

  public subscribe<TPayload = unknown>(type: string, listener: AxiomaticListener<TPayload>, priority = 0): () => void {
    return this.addListener(type, listener as AxiomaticListener, false, priority);
  }

  public once<TPayload = unknown>(type: string, listener: AxiomaticListener<TPayload>, priority = 0): () => void {
    return this.addListener(type, listener as AxiomaticListener, true, priority);
  }

  public getHistory(type?: string): IAxiomaticEvent[] {
    const events = type ? this.eventLedger.filter((event) => event.type === type) : this.eventLedger;
    return [...events].sort((a, b) => a.sequenceId - b.sequenceId);
  }

  public getLedgerStats(): AxiomaticLedgerStats {
    return {
      size: this.eventLedger.length,
      max: this.maxLedgerSize,
      full: this.eventLedger.length >= this.maxLedgerSize,
      currentTick: this.currentTick,
      currentTickSequence: this.currentTickSequence,
      currentResonance: this.globalResonanceState,
      lastSequenceId: this.globalSequenceId - 1,
      tickHz: WATCHDOG_TICK_HZ,
      tickMs: WATCHDOG_TICK_MS,
      deterministic: true,
    };
  }

  public clearLedger(): void {
    this.eventLedger.length = 0;
    this.globalSequenceId = 0;
    this.currentTick = 0;
    this.currentTickSequence = 0;
    this.globalResonanceState = 0;
  }

  private addListener(type: string, listener: AxiomaticListener, once: boolean, priority: number): () => void {
    const safeType = sanitizeText(type, AXIOMATIC_WILDCARD_EVENT);
    const entry: ListenerEntry = { id: ++this.listenerSequenceId, type: safeType, listener, once, priority: normalizePositiveInteger(priority, 0) };
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

  private dispatch(event: IAxiomaticEvent): void {
    const executionList = [...(this.listeners.get(event.type) ?? []), ...(this.listeners.get(AXIOMATIC_WILDCARD_EVENT) ?? [])].sort(compareListeners);
    for (const entry of executionList) {
      try { entry.listener(event); } catch (err) { console.error(`[AxiomaticEventBus] Listener failed for ${event.type}`, err); }
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
