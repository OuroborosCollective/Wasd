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

export class WatchdogEmitter {
  private readonly listeners: Array<(event: DeterministicWatchdogEvent) => void> = [];
  private readonly bus = AxiomaticEventBus.getInstance();
  private tick = 0;
  private seq = 0;

  public setWorldTick(tick: number): void {
    this.tick = normalizePositiveInteger(tick, this.tick);
    this.seq = 0;
    this.bus.beginTick(this.tick);
  }

  public emit(type: string, payload: Record<string, unknown> = {}, severity: WatchdogSeverity = 'LOW', source = 'server-core', tick = this.tick): DeterministicWatchdogEvent {
    const safeTick = normalizePositiveInteger(tick, this.tick);
    if (safeTick !== this.tick) this.setWorldTick(safeTick);

    const stamp = createWatchdogTickStamp(this.tick, ++this.seq);
    const event = normalizeWatchdogEvent({ type, severity, source, origin: source, message: type, payload, metadata: {}, channel: 'watchdog.server-core' }, stamp, source);
    this.broadcast(event);
    return event;
  }

  public emitEvent(event: WatchdogEvent, tick = event.tick ?? this.tick): DeterministicWatchdogEvent {
    const safeTick = normalizePositiveInteger(tick, this.tick);
    if (safeTick !== this.tick) this.setWorldTick(safeTick);

    const stamp = createWatchdogTickStamp(this.tick, ++this.seq);
    const normalized = normalizeWatchdogEvent(event, stamp, event.origin || event.source || 'server-core');
    this.broadcast(normalized);
    return normalized;
  }

  public subscribe(listener: (event: DeterministicWatchdogEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  private broadcast(event: DeterministicWatchdogEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch (err) { console.error('[WatchdogEmitter] listener failed', err); }
    }

    this.bus.publish(
      event.type,
      { ...event.payload, severity: event.severity, source: event.origin, origin: event.origin, tick: event.tick, seq: event.seq, timestamp: event.timestamp, channel: event.channel },
      { tick: event.tick, tickSequence: event.seq, source: event.origin, metadata: { severity: event.severity, channel: event.channel }, violationPolicy: 'reject', silent: true },
    );
  }
}

export const serverWatchdogEmitter = new WatchdogEmitter();
