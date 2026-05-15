import type { AREGuardPayload, AREInvariantGuardStatus } from "./AREInvariantGuard.js";
import type { WorldHashSnapshot } from "./WorldHashSnapshot.js";
import { canonicalize } from "./WorldHashSnapshot.js";

export interface RecordedWorldState {
  players: unknown[];
  npcs: unknown[];
  loot: unknown[];
}

export interface DeterministicTickRecord {
  tick: number;
  marker: string;
  payload: AREGuardPayload;
  worldHash: string | null;
  worldSnapshot: WorldHashSnapshot | null;
  guard: AREInvariantGuardStatus | null;
  worldState: RecordedWorldState;
}

export interface DeterministicReplaySnapshot {
  ok: true;
  mode: "observation";
  tick: number;
  restoredFrom: string;
  record: DeterministicTickRecord;
}

export interface DeterministicRecorderStats {
  capacity: number;
  size: number;
  latestTick: number | null;
  oldestTick: number | null;
  availableTicks: number[];
}

function deterministicClone<T>(value: T): T {
  return canonicalize(value) as T;
}

export class DeterministicTickRecorder {
  private readonly ring: Array<DeterministicTickRecord | null>;
  private cursor = 0;
  private count = 0;
  private latestTick: number | null = null;

  constructor(public readonly capacity = 1000) {
    this.ring = new Array<DeterministicTickRecord | null>(capacity).fill(null);
  }

  record(input: Omit<DeterministicTickRecord, "marker">): DeterministicTickRecord {
    const record: DeterministicTickRecord = deterministicClone({
      ...input,
      marker: `deterministic-replay-tick:${input.tick}`,
    });

    this.ring[this.cursor] = record;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
    this.latestTick = record.tick;
    return record;
  }

  get(tick: number): DeterministicTickRecord | null {
    for (const record of this.ring) {
      if (record?.tick === tick) return deterministicClone(record);
    }
    return null;
  }

  replay(tick: number): DeterministicReplaySnapshot | null {
    const record = this.get(tick);
    if (!record) return null;
    return {
      ok: true,
      mode: "observation",
      tick: record.tick,
      restoredFrom: record.marker,
      record,
    };
  }

  latest(): DeterministicTickRecord | null {
    if (this.latestTick === null) return null;
    return this.get(this.latestTick);
  }

  stats(): DeterministicRecorderStats {
    const availableTicks = this.ring
      .filter((record): record is DeterministicTickRecord => Boolean(record))
      .map((record) => record.tick)
      .sort((a, b) => a - b);

    return {
      capacity: this.capacity,
      size: this.count,
      latestTick: availableTicks.at(-1) ?? null,
      oldestTick: availableTicks[0] ?? null,
      availableTicks,
    };
  }
}

export const deterministicTickRecorder = new DeterministicTickRecorder(1000);
