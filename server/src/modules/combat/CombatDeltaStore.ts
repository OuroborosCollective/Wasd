import type { CombatDelta } from "./CombatDeltaResolver.js";

export interface CombatDeltaStoreSnapshot {
  readonly deltas: readonly CombatDelta[];
  readonly count: number;
}

function compareCombatDelta(a: CombatDelta, b: CombatDelta): number {
  if (a.tick !== b.tick) return a.tick - b.tick;
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  const byAttacker = a.attackerId.localeCompare(b.attackerId);
  if (byAttacker !== 0) return byAttacker;
  return a.defenderId.localeCompare(b.defenderId);
}

export class CombatDeltaStore {
  private readonly deltas: CombatDelta[] = [];

  append(delta: CombatDelta): void {
    if (!delta || delta.kind !== "combat_delta") {
      throw new Error("CombatDeltaStore.append requires a combat_delta");
    }
    this.deltas.push(delta);
  }

  appendMany(nextDeltas: readonly CombatDelta[]): void {
    for (const delta of nextDeltas) {
      this.append(delta);
    }
  }

  drainThroughTick(tickInclusive: number): CombatDelta[] {
    const safeTick = Number.isFinite(tickInclusive) ? Math.floor(tickInclusive) : -1;
    const ready: CombatDelta[] = [];
    const pending: CombatDelta[] = [];

    for (const delta of this.deltas) {
      if (delta.tick <= safeTick) ready.push(delta);
      else pending.push(delta);
    }

    this.deltas.length = 0;
    this.deltas.push(...pending.sort(compareCombatDelta));
    return ready.sort(compareCombatDelta);
  }

  snapshot(): CombatDeltaStoreSnapshot {
    const deltas = [...this.deltas].sort(compareCombatDelta);
    return Object.freeze({
      deltas: Object.freeze(deltas),
      count: deltas.length,
    });
  }

  clear(): void {
    this.deltas.length = 0;
  }
}

export const combatDeltaStore = new CombatDeltaStore();
