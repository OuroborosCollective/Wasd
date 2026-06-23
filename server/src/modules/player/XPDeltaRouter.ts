import type { XPGainEvent } from "../combat/CombatDirector.js";
import type { PlayerStatsDirector } from "./PlayerStatsDirector.js";

export type XPDeltaSource = "combat_delta" | "gather_delta" | "craft_delta" | "quest_delta" | "system_delta";

export interface XPDelta {
  readonly kind: "xp_delta";
  readonly source: XPDeltaSource;
  readonly tick: number;
  readonly playerId: string;
  readonly skillId: string;
  readonly amount: number;
  readonly sourceId?: string;
}

export interface XPDeltaRouterSnapshot {
  readonly pending: readonly XPDelta[];
  readonly count: number;
}

function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeDelta(delta: XPDelta): XPDelta | null {
  if (!delta || delta.kind !== "xp_delta") return null;
  if (!isValidId(delta.playerId)) return null;
  if (!isValidId(delta.skillId)) return null;
  if (!Number.isFinite(delta.amount) || delta.amount <= 0) return null;

  const normalized: XPDelta = {
    kind: "xp_delta",
    source: delta.source,
    tick: Number.isFinite(delta.tick) ? Math.max(0, Math.floor(delta.tick)) : 0,
    playerId: delta.playerId,
    skillId: delta.skillId,
    amount: Math.max(1, Math.floor(delta.amount)),
  };

  if (isValidId(delta.sourceId)) {
    return Object.freeze({
      ...normalized,
      sourceId: delta.sourceId,
    });
  }

  return Object.freeze(normalized);
}

function compareXPDelta(a: XPDelta, b: XPDelta): number {
  if (a.tick !== b.tick) return a.tick - b.tick;
  const byPlayer = a.playerId.localeCompare(b.playerId);
  if (byPlayer !== 0) return byPlayer;
  const bySkill = a.skillId.localeCompare(b.skillId);
  if (bySkill !== 0) return bySkill;
  return (a.sourceId ?? "").localeCompare(b.sourceId ?? "");
}

function toXPGainEvent(delta: XPDelta): XPGainEvent {
  return {
    playerId: delta.playerId,
    skillId: delta.skillId,
    amount: delta.amount,
    source: delta.source === "quest_delta" ? "quest" : "attack",
    tick: delta.tick,
  };
}

export class XPDeltaRouter {
  private readonly pending: XPDelta[] = [];

  enqueue(delta: XPDelta): boolean {
    const normalized = normalizeDelta(delta);
    if (!normalized) return false;
    this.pending.push(normalized);
    return true;
  }

  enqueueMany(deltas: readonly XPDelta[]): number {
    let accepted = 0;
    for (const delta of deltas) {
      if (this.enqueue(delta)) accepted++;
    }
    return accepted;
  }

  drainThroughTick(tickInclusive: number): XPDelta[] {
    const safeTick = Number.isFinite(tickInclusive) ? Math.floor(tickInclusive) : -1;
    const ready: XPDelta[] = [];
    const pending: XPDelta[] = [];

    for (const delta of this.pending) {
      if (delta.tick <= safeTick) ready.push(delta);
      else pending.push(delta);
    }

    this.pending.length = 0;
    this.pending.push(...pending.sort(compareXPDelta));
    return ready.sort(compareXPDelta);
  }

  flushToPlayerStats(statsDirector: PlayerStatsDirector, tickInclusive: number): number {
    const ready = this.drainThroughTick(tickInclusive);
    if (ready.length === 0) return 0;
    statsDirector.processXPevents(ready.map(toXPGainEvent));
    return ready.length;
  }

  snapshot(): XPDeltaRouterSnapshot {
    const pending = [...this.pending].sort(compareXPDelta);
    return Object.freeze({
      pending: Object.freeze(pending),
      count: pending.length,
    });
  }

  clear(): void {
    this.pending.length = 0;
  }
}

export const xpDeltaRouter = new XPDeltaRouter();
