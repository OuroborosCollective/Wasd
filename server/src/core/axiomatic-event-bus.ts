import {
  WATCHDOG_TICK_HZ,
  WATCHDOG_TICK_MS,
  deterministicPayloadHash,
  fnv1a32,
  normalizePositiveInteger,
  sanitizeText,
  stableStringify,
} from './watchdog-determinism.js';

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
    violation?: string;
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
  observerLog?: boolean;
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
  listenerCount: number;
  tickHz: typeof WATCHDOG_TICK_HZ;
  tickMs: typeof WATCHDOG_TICK_MS;
  deterministic: true;
}

export interface AxiomaticLedgerIntegrityReport {
  ok: boolean;
  checked: number;
  failures: Array<{ index: number; eventId: string; reason: string }>;
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
    if (!isNonNegativeSafeInteger(tick)) throw new Error(`[AxiomaticEventBus] Invalid world tick: ${String(tick)}.`);
    const nextTick = normalizePositiveInteger(tick, this.currentTick);
    if (nextTick < this.currentTick) throw new Error(`[AxiomaticEventBus] Refused backwards world tick: ${nextTick} < ${this.currentTick}.`);
    if (nextTick !== this.currentTick) {
      this.currentTick = nextTick;
      this.currentTickSequence = 0;
    }
  }

  public publish<TPayload = unknown>(type: string, payload?: TPayload, options: AxiomaticPublishOptions = {}): IAxiomaticEvent<TPayload> {
    const eventType = normalizeEventType(type, 'axiomatic.event');
    const policy = options.violationPolicy ?? 'reject';
    const requestedTick = options.tick ?? readNumericField(payload, 'tick') ?? this.currentTick;
    let tick = normalizePositiveInteger(requestedTick, this.currentTick);
    let violation: string | undefined;

    if (!isNonNegativeSafeInteger(requestedTick)) {
      violation = `invalid_tick:${String(requestedTick)}->${tick}`;
      if (policy === 'reject') throw new Error(`[AxiomaticEventBus] Refused invalid tick for "${eventType}".`);
    }

    if (tick < this.currentTick) {
      violation = `backwards_tick:${tick}<${this.currentTick}`;
      if (policy === 'reject') throw new Error(`[AxiomaticEventBus] Refused non-monotonic event "${eventType}".`);
      tick = this.currentTick;
    }

    this.beginTick(tick);

    const requestedTickSequence = options.tickSequence ?? this.currentTickSequence + 1;
    let tickSequence = normalizePositiveInteger(requestedTickSequence, this.currentTickSequence + 1);

    if (!isNonNegativeSafeInteger(requestedTickSequence)) {
      violation = violation ?? `invalid_tick_sequence:${String(requestedTickSequence)}->${tickSequence}`;
      if (policy === 'reject') throw new Error(`[AxiomaticEventBus] Refused invalid tickSequence for "${eventType}".`);
    }

    if (tickSequence <= this.currentTickSequence) {
      violation = violation ?? `non_monotonic_tick_sequence:${tickSequence}<=${this.currentTickSequence}`;
      if (policy === 'reject') throw new Error(`[AxiomaticEventBus] Refused non-monotonic tickSequence for "${eventType}".`);
      tickSequence = this.currentTickSequence + 1;
    }

    this.currentTickSequence = tickSequence;

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
        ...sanitizeMetadata(options.metadata),
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
    this.eventLedger.push(Object.freeze(event));
    if (this.eventLedger.length > this.maxLedgerSize) this.eventLedger.shift();

    if (options.observerLog === true && !options.silent) console.log(`[AxiomaticEventBus] #${sequenceId} tick=${tick}.${tickSequence} ${eventType}`, { id: event.id, payloadHash });
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
    const events = type ? this.eventLedger.filter((event) => event.type === normalizeEventType(type, 'axiomatic.event')) : this.eventLedger;
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
      listenerCount: this.listenerCount(),
      tickHz: WATCHDOG_TICK_HZ,
      tickMs: WATCHDOG_TICK_MS,
      deterministic: true,
    };
  }

  public listenerCount(type?: string): number {
    if (type) return this.listeners.get(normalizeEventType(type, AXIOMATIC_WILDCARD_EVENT))?.length ?? 0;
    let count = 0;
    for (const list of this.listeners.values()) count += list.length;
    return count;
  }

  public verifyLedger(): AxiomaticLedgerIntegrityReport {
    const failures: AxiomaticLedgerIntegrityReport['failures'] = [];
    for (let index = 0; index < this.eventLedger.length; index += 1) {
      const event = this.eventLedger[index];
      const payloadHash = deterministicPayloadHash(event.payload ?? {});
      const expectedId = `evt_${event.tick}_${event.tickSequence}_${event.sequenceId}_${payloadHash}`;
      if (event.id !== expectedId || event.metadata.payloadHash !== payloadHash || event.timestamp !== event.tick * WATCHDOG_TICK_MS) {
        failures.push({ index, eventId: event.id, reason: 'deterministic_integrity_mismatch' });
      }
    }
    return { ok: failures.length === 0, checked: this.eventLedger.length, failures, deterministic: true };
  }

  public clearLedger(): void {
    this.eventLedger.length = 0;
    this.globalSequenceId = 0;
    this.currentTick = 0;
    this.currentTickSequence = 0;
    this.globalResonanceState = 0;
  }

  private addListener(type: string, listener: AxiomaticListener, once: boolean, priority: number): () => void {
    if (typeof listener !== 'function') throw new Error('[AxiomaticEventBus] Listener must be a function.');
    const safeType = normalizeEventType(type, AXIOMATIC_WILDCARD_EVENT);
    const entry: ListenerEntry = { id: ++this.listenerSequenceId, type: safeType, listener, once, priority: normalizePriority(priority) };
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
    const executionMap = new Map<number, ListenerEntry>();
    for (const entry of this.listeners.get(event.type) ?? []) executionMap.set(entry.id, entry);
    for (const entry of this.listeners.get(AXIOMATIC_WILDCARD_EVENT) ?? []) executionMap.set(entry.id, entry);
    const executionList = [...executionMap.values()].sort(compareListeners);
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

function normalizePriority(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function normalizeEventType(type: string, fallback: string): string {
  const raw = typeof type === 'string' ? type.trim() : '';
  if (raw === AXIOMATIC_WILDCARD_EVENT) return AXIOMATIC_WILDCARD_EVENT;
  return sanitizeText(raw, fallback);
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const metadata = { ...(value as Record<string, unknown>) };
  delete metadata.resonance;
  delete metadata.kappa;
  delete metadata.payloadHash;
  delete metadata.canonicalSize;
  delete metadata.tickHz;
  delete metadata.tickMs;
  delete metadata.deterministic;
  return metadata;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
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
