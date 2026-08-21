import { sortCanonicalIntents, type ServerCanonicalIntent } from "./ServerCanonicalIntent.js";

export interface CanonicalIntentObservation {
  readonly action: string;
  readonly actorId: string;
  readonly tickId: number;
  readonly chunkKey: string;
  readonly intentHash: string;
}

export type CanonicalIntentObserver = (observation: CanonicalIntentObservation) => void;

/**
 * CanonicalIntentIntake — the single place where authoritative (player AND
 * NPC) intents enter the server truth path (AIM-77).
 *
 * Observers are explicitly SIDE CHANNELS. The intake stores the real intent
 * first, then schedules an immutable observation projection on the microtask
 * queue. Observer errors are swallowed so telemetry/analytics can never alter
 * whether an authoritative intent was accepted or how the tick reduces it.
 */
export class CanonicalIntentIntake {
  private readonly byTick = new Map<number, ServerCanonicalIntent[]>();
  private readonly all: ServerCanonicalIntent[] = [];
  private readonly observers = new Set<CanonicalIntentObserver>();
  private totalRecorded = 0;

  /** Record a canonical intent under its tick. Deterministic by content hash. */
  record(intent: ServerCanonicalIntent): void {
    const tick = Number(intent.tickId);
    const bucket = this.byTick.get(tick);
    if (bucket) bucket.push(intent);
    else this.byTick.set(tick, [intent]);
    this.all.push(intent);
    this.totalRecorded += 1;

    if (this.observers.size > 0) {
      const observation = Object.freeze({
        action: String(intent.action),
        actorId: String(intent.actorId),
        tickId: tick,
        chunkKey: String(intent.chunkKey),
        intentHash: String(intent.intentHash),
      });
      queueMicrotask(() => {
        for (const observer of this.observers) {
          try {
            observer(observation);
          } catch {
            // Side-channel observers must never alter canonical intake truth.
          }
        }
      });
    }
  }

  /**
   * Subscribe a non-authoritative observer. Returns an unsubscribe function.
   * The observer receives only an immutable projection, never the mutable
   * canonical intent object itself.
   */
  subscribe(observer: CanonicalIntentObserver): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /** Deterministically sorted intents for a single tick. */
  getForTick(tick: number): ServerCanonicalIntent[] {
    const bucket = this.byTick.get(Math.trunc(tick));
    return bucket ? sortCanonicalIntents(bucket) : [];
  }

  /** Deterministically sorted intents across a closed tick range. */
  getForTickRange(fromTick: number, toTick: number): ServerCanonicalIntent[] {
    const from = Math.trunc(fromTick);
    const to = Math.trunc(toTick);
    const out: ServerCanonicalIntent[] = [];
    for (let t = from; t <= to; t += 1) {
      const bucket = this.byTick.get(t);
      if (bucket) out.push(...bucket);
    }
    return sortCanonicalIntents(out);
  }

  /** Count of recorded intents for a tick (unsorted, raw). */
  countForTick(tick: number): number {
    return this.byTick.get(Math.trunc(tick))?.length ?? 0;
  }

  /** Cumulative hash of all intent hashes for a tick — stable, content-addressed. */
  hashForTick(tick: number): string {
    const sorted = this.getForTick(tick);
    if (sorted.length === 0) return "";
    return sorted.map((i) => i.intentHash).join("|");
  }

  getDiagnostics(): {
    totalRecorded: number;
    ticksWithIntents: number;
    byAction: Record<string, number>;
    sideChannelObservers: number;
  } {
    const byAction: Record<string, number> = {};
    for (const intent of this.all) {
      byAction[intent.action] = (byAction[intent.action] ?? 0) + 1;
    }
    return {
      totalRecorded: this.totalRecorded,
      ticksWithIntents: this.byTick.size,
      byAction,
      sideChannelObservers: this.observers.size,
    };
  }

  /** Test/maintenance hook. Not used on the live path. */
  reset(): void {
    this.byTick.clear();
    this.all.length = 0;
    this.totalRecorded = 0;
  }
}

/** Shared singleton intake for the live server truth path. */
export const canonicalIntentIntake = new CanonicalIntentIntake();
