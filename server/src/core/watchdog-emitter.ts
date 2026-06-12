import { AxiomaticEventBus } from './axiomatic-event-bus.js';
import {
  createWatchdogTickStamp,
  normalizePositiveInteger,
  normalizeWatchdogEvent,
  type CanonicalWatchdogSeverity,
  type DeterministicWatchdogEvent,
  type WatchdogEvent,
} from './watchdog-determinism.js';

export type WatchdogSeverity = CanonicalWatchdogSeverity;
export type { WatchdogEvent, DeterministicWatchdogEvent };

export type WatchdogSideChannelErrorHandler = (
  scope: string,
  error: unknown,
  event?: DeterministicWatchdogEvent,
) => void;

export interface WatchdogEmitterOptions {
  readonly defaultSource?: string;
  readonly defaultChannel?: string;

  /**
   * Prevents live-runtime time travel.
   * For replay tooling, instantiate a separate emitter with false.
   */
  readonly strictMonotonicTicks?: boolean;

  /**
   * Rejects NaN, Infinity, negative and non-integer ticks before normalization.
   */
  readonly rejectInvalidTicks?: boolean;

  /**
   * If true, AxiomaticEventBus beginTick/publish failures reject the emit path.
   * If false, failures are reported only through the side-channel handler.
   */
  readonly throwOnBusError?: boolean;

  /**
   * Hard cap against recursive event storms.
   */
  readonly maxQueuedEvents?: number;

  /**
   * Side-channel only. Must not mutate simulation state.
   */
  readonly onSideChannelError?: WatchdogSideChannelErrorHandler;
}

const DEFAULT_SOURCE = 'server-core' as const;
const DEFAULT_CHANNEL = 'watchdog.server-core' as const;
const DEFAULT_MAX_QUEUED_EVENTS = 4096 as const;

export class WatchdogEmitter {
  private readonly listeners = new Set<(event: DeterministicWatchdogEvent) => void>();
  private readonly bus = AxiomaticEventBus.getInstance();

  private readonly defaultSource: string;
  private readonly defaultChannel: string;
  private readonly strictMonotonicTicks: boolean;
  private readonly rejectInvalidTicks: boolean;
  private readonly throwOnBusError: boolean;
  private readonly maxQueuedEvents: number;
  private readonly onSideChannelError?: WatchdogSideChannelErrorHandler;

  private tick = 0;
  private seq = 0;

  private isFlushing = false;
  private readonly queue: DeterministicWatchdogEvent[] = [];

  public constructor(options: WatchdogEmitterOptions = {}) {
    this.defaultSource = this.normalizeText(options.defaultSource, DEFAULT_SOURCE);
    this.defaultChannel = this.normalizeText(options.defaultChannel, DEFAULT_CHANNEL);
    this.strictMonotonicTicks = options.strictMonotonicTicks ?? true;
    this.rejectInvalidTicks = options.rejectInvalidTicks ?? true;
    this.throwOnBusError = options.throwOnBusError ?? true;
    this.maxQueuedEvents = normalizePositiveInteger(
      options.maxQueuedEvents ?? DEFAULT_MAX_QUEUED_EVENTS,
      DEFAULT_MAX_QUEUED_EVENTS,
    );
    this.onSideChannelError = options.onSideChannelError;
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

  public setWorldTick(tick: number): void {
    const safeTick = this.normalizeTickInput(tick);

    if (this.strictMonotonicTicks && safeTick < this.tick) {
      throw new RangeError(
        `[WatchdogEmitter] tick rewind rejected: current=${this.tick}, requested=${safeTick}`,
      );
    }

    if (this.throwOnBusError) {
      this.beginBusTick(safeTick);
      this.tick = safeTick;
      this.seq = 0;
      return;
    }

    this.tick = safeTick;
    this.seq = 0;
    this.beginBusTick(safeTick);
  }

  public emit(
    type: string,
    payload: Record<string, unknown> = {},
    severity: WatchdogSeverity = 'LOW',
    source = this.defaultSource,
    tick = this.tick,
  ): DeterministicWatchdogEvent {
    const safeTick = this.normalizeTickInput(tick);
    if (safeTick !== this.tick) this.setWorldTick(safeTick);

    const origin = this.normalizeText(source, this.defaultSource);
    const eventType = this.normalizeText(type, 'watchdog.event');
    const stamp = createWatchdogTickStamp(this.tick, ++this.seq);

    const event = normalizeWatchdogEvent(
      {
        type: eventType,
        severity,
        source: origin,
        origin,
        message: eventType,
        payload,
        metadata: {},
        channel: this.channelFor(origin),
      },
      stamp,
      origin,
    );

    this.broadcast(event);
    return event;
  }

  public emitEvent(
    event: WatchdogEvent,
    tick = (event as WatchdogEvent & { tick?: number }).tick ?? this.tick,
  ): DeterministicWatchdogEvent {
    const safeTick = this.normalizeTickInput(tick);
    if (safeTick !== this.tick) this.setWorldTick(safeTick);

    const runtimeEvent = event as WatchdogEvent & {
      source?: string;
      origin?: string;
      channel?: string;
    };

    const origin = this.normalizeText(
      runtimeEvent.origin ?? runtimeEvent.source,
      this.defaultSource,
    );

    const channel = this.normalizeText(runtimeEvent.channel, this.channelFor(origin));
    const stamp = createWatchdogTickStamp(this.tick, ++this.seq);

    const normalized = normalizeWatchdogEvent(
      {
        ...event,
        source: runtimeEvent.source ?? origin,
        origin,
        channel,
      },
      stamp,
      origin,
    );

    this.broadcast(normalized);
    return normalized;
  }

  public subscribe(listener: (event: DeterministicWatchdogEvent) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public clearListeners(): void {
    this.listeners.clear();
  }

  private broadcast(event: DeterministicWatchdogEvent): void {
    if (this.queue.length >= this.maxQueuedEvents) {
      const error = new RangeError(
        `[WatchdogEmitter] queue overflow rejected at tick=${event.tick}, seq=${event.seq}`,
      );

      this.reportSideChannelError('watchdog.queue_overflow', error, event);
      throw error;
    }

    this.queue.push(event);

    if (this.isFlushing) return;

    this.isFlushing = true;

    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift();
        if (!next) continue;

        this.publishToBus(next);
        this.notifyListeners(Object.freeze(next));
      }
    } finally {
      this.isFlushing = false;
      this.queue.length = 0;
    }
  }

  private notifyListeners(event: DeterministicWatchdogEvent): void {
    const snapshot = Array.from(this.listeners);

    for (const listener of snapshot) {
      try {
        listener(event);
      } catch (error) {
        this.reportSideChannelError('watchdog.listener_failed', error, event);
      }
    }
  }

  private publishToBus(event: DeterministicWatchdogEvent): void {
    const metadataCarrier = event as DeterministicWatchdogEvent & {
      metadata?: Record<string, unknown>;
    };

    try {
      this.bus.publish(
        event.type,
        {
          ...(event.payload ?? {}),
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
            ...(metadataCarrier.metadata ?? {}),
            severity: event.severity,
            channel: event.channel,
          },
          violationPolicy: 'reject',
          silent: true,
        },
      );
    } catch (error) {
      this.reportSideChannelError('watchdog.bus_publish_failed', error, event);

      if (this.throwOnBusError) {
        throw error;
      }
    }
  }

  private beginBusTick(tick: number): void {
    try {
      this.bus.beginTick(tick);
    } catch (error) {
      this.reportSideChannelError('watchdog.bus_begin_tick_failed', error);

      if (this.throwOnBusError) {
        throw error;
      }
    }
  }

  private normalizeTickInput(tick: number): number {
    if (
      this.rejectInvalidTicks &&
      (!Number.isFinite(tick) || !Number.isSafeInteger(tick) || tick < 0)
    ) {
      throw new RangeError(`[WatchdogEmitter] invalid tick rejected: ${String(tick)}`);
    }

    const safeTick = normalizePositiveInteger(tick, this.tick);

    if (this.strictMonotonicTicks && safeTick < this.tick) {
      throw new RangeError(
        `[WatchdogEmitter] tick rewind rejected: current=${this.tick}, requested=${safeTick}`,
      );
    }

    return safeTick;
  }

  private normalizeText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;

    const text = value.trim();
    return text.length > 0 ? text : fallback;
  }

  private channelFor(origin: string): string {
    if (origin === this.defaultSource) return this.defaultChannel;

    const safeOrigin = origin.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `watchdog.${safeOrigin}`;
  }

  private reportSideChannelError(
    scope: string,
    error: unknown,
    event?: DeterministicWatchdogEvent,
  ): void {
    try {
      this.onSideChannelError?.(scope, error, event);
    } catch {
      /**
       * Side-channel errors must never recurse back into the truth path.
       */
    }
  }
}

export const serverWatchdogEmitter = new WatchdogEmitter();
