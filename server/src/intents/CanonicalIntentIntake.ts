import { amplitudeCanonicalIntentObserver } from "../telemetry/AmplitudeCanonicalIntentObserver.js";
import { sortCanonicalIntents, type ServerCanonicalIntent } from "./ServerCanonicalIntent.js";

export type CanonicalIntentObserver = (intent: ServerCanonicalIntent) => void;

/**
 * CanonicalIntentIntake — the single place where authoritative (player AND
 * NPC) intents enter the server truth path (AIM-77).
 *
 * Before this, ServerCanonicalIntent was created only in route handlers
 * (gather/interact/inventory) and never reached the tick; player movement
 * (RuntimeMoveIntent) and NPC wander both bypassed it. Now both player and
 * NPC move intents are stamped as ServerCanonicalIntent and recorded here,
 * so the tick / world hash / manifest can later consume a unified intent
 * stream instead of three parallel vocabularies.
 *
 * The intake is intentionally a thin, deterministic registry: it stores,
 * sorts, and reports. It does not mutate world state — movement still
 * applies through the deterministic tick (RuntimePlayerSystem for players,
 * NPCSystem for NPCs). The intake is the integrity/audit record alongside.
 *
 * Optional observers run strictly AFTER the authoritative record has been
 * accepted and are exception-isolated. Their output is not read by the
 * intake, tick, reducer, ordering, manifest or world hash.
 */
export class CanonicalIntentIntake {
  private readonly byTick = new Map<number, ServerCanonicalIntent[]>();
  private readonly all: ServerCanonicalIntent[] = [];
  private totalRecorded = 0;

  constructor(private readonly observer: CanonicalIntentObserver = () => {}) {}

  /** Record a canonical intent under its tick. Deterministic by content hash. */
  record(intent: ServerCanonicalIntent): void {
    const tick = Number(intent.tickId);
    const bucket = this.byTick.get(tick);
    if (bucket) bucket.push(intent);
    else this.byTick.set(tick, [intent]);
    this.all.push(intent);
    this.totalRecorded += 1;

    // Side-channel boundary: observer failure must never roll back or alter
    // the already-accepted canonical record.
    try {
      this.observer(intent);
    } catch {
      // Intentionally fail-open for gameplay / fail-closed for telemetry.
    }
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
  } {
    const byAction: Record<string, number> = {};
    for (const intent of this.all) {
      byAction[intent.action] = (byAction[intent.action] ?? 0) + 1;
    }
    return {
      totalRecorded: this.totalRecorded,
      ticksWithIntents: this.byTick.size,
      byAction,
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
export const canonicalIntentIntake = new CanonicalIntentIntake((intent) => {
  amplitudeCanonicalIntentObserver.observe(intent);
});
