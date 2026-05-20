import { AREGuard } from './AREGuard';
import { AREHash } from './AREHash';
import type { IAREPayload } from './AREPayload';
import { assertSafeInteger } from './Kappa';

export interface AREReplayEntry {
  readonly tick: number;
  readonly entityId: string;
  readonly stateHash: number;
  readonly payload: Readonly<IAREPayload>;
}

export class AREReplayBuffer {
  private readonly entries: AREReplayEntry[] = [];
  private readonly byKey = new Map<string, AREReplayEntry>();

  constructor(private readonly replayCapacity = 1000) {
    assertSafeInteger(replayCapacity, 'AREReplayBuffer capacity');
    if (replayCapacity <= 0) {
      throw new Error('[ARE-Replay] replayCapacity must be greater than zero.');
    }
  }

  get capacity(): number {
    return this.replayCapacity;
  }

  get size(): number {
    return this.entries.length;
  }

  record(tick: number, payload: Readonly<IAREPayload>): AREReplayEntry {
    assertSafeInteger(tick, 'AREReplayBuffer tick');
    if (tick < 0) {
      throw new Error('[ARE-Replay] tick must be non-negative.');
    }
    AREGuard.assertNoFloats(payload);

    const stateHash = payload.stateHash ?? AREHash.generate(payload);
    assertSafeInteger(stateHash, 'AREReplayBuffer stateHash');

    const entry = AREGuard.protectPayload({
      tick,
      entityId: payload.entityId,
      stateHash,
      payload,
    } satisfies AREReplayEntry);

    const key = AREReplayBuffer.key(tick, payload.entityId);
    const existing = this.byKey.get(key);
    if (existing) {
      const index = this.entries.indexOf(existing);
      if (index >= 0) this.entries.splice(index, 1);
    }

    this.entries.push(entry);
    this.byKey.set(key, entry);

    while (this.entries.length > this.replayCapacity) {
      const evicted = this.entries.shift();
      if (evicted) this.byKey.delete(AREReplayBuffer.key(evicted.tick, evicted.entityId));
    }

    return entry;
  }

  get(tick: number, entityId: string): AREReplayEntry | undefined {
    assertSafeInteger(tick, 'AREReplayBuffer get tick');
    return this.byKey.get(AREReplayBuffer.key(tick, entityId));
  }

  latest(entityId?: string): AREReplayEntry | undefined {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      if (!entityId || entry.entityId === entityId) return entry;
    }
    return undefined;
  }

  snapshot(): readonly AREReplayEntry[] {
    return Object.freeze([...this.entries]);
  }

  private static key(tick: number, entityId: string): string {
    return `${tick}:${entityId}`;
  }
}
