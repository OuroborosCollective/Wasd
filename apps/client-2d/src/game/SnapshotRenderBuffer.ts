import type { LiveGameplaySnapshot } from "./liveGameplaySnapshot";

export interface RenderPosition2D {
  readonly x: number;
  readonly y: number;
}

export interface SnapshotRenderFrame<TSnapshot = LiveGameplaySnapshot> {
  /** Server-authoritative tick for this frame. Null means the frame is not renderable for interpolation. */
  readonly serverTick: number | null;
  /** Server snapshot. The render buffer never mutates or writes this back as gameplay truth. */
  readonly snapshot: TSnapshot;
}

export interface SnapshotRenderPair<TSnapshot = LiveGameplaySnapshot> {
  readonly previous: SnapshotRenderFrame<TSnapshot>;
  readonly current: SnapshotRenderFrame<TSnapshot>;
  readonly alpha: number;
}

export type SyncFreshnessState = "waiting" | "fresh" | "stale_short" | "stale_medium" | "stale_long";

export interface SyncFreshnessPolicy {
  readonly freshTicks: number;
  readonly staleShortTicks: number;
  readonly staleMediumTicks: number;
}

export const DEFAULT_SYNC_FRESHNESS_POLICY: SyncFreshnessPolicy = Object.freeze({
  freshTicks: 2,
  staleShortTicks: 10,
  staleMediumTicks: 30,
});

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeTick(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  const tick = Math.floor(value);
  return tick >= 0 ? tick : null;
}

export function clampVisualAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return 0;
  if (alpha <= 0) return 0;
  if (alpha >= 1) return 1;
  return alpha;
}

export function interpolatePosition(
  previous: RenderPosition2D,
  current: RenderPosition2D,
  alpha: number,
): RenderPosition2D {
  const safeAlpha = clampVisualAlpha(alpha);
  return {
    x: previous.x + (current.x - previous.x) * safeAlpha,
    y: previous.y + (current.y - previous.y) * safeAlpha,
  };
}

function normalizeDegrees(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/**
 * Interpolate facing in degrees over the shortest visual arc.
 * This is render-only projection; it never changes server snapshot truth.
 */
export function interpolateFacing(previousDegrees: number, currentDegrees: number, alpha: number): number {
  const safeAlpha = clampVisualAlpha(alpha);
  const previous = normalizeDegrees(previousDegrees);
  const current = normalizeDegrees(currentDegrees);
  const delta = ((current - previous + 540) % 360) - 180;
  return normalizeDegrees(previous + delta * safeAlpha);
}

export function classifySyncFreshness(
  latestServerTick: number | null | undefined,
  renderTick: number | null | undefined,
  policy: SyncFreshnessPolicy = DEFAULT_SYNC_FRESHNESS_POLICY,
): SyncFreshnessState {
  const latest = normalizeTick(latestServerTick);
  const render = normalizeTick(renderTick);
  if (latest === null || render === null) return "waiting";

  const age = Math.max(0, render - latest);
  if (age <= policy.freshTicks) return "fresh";
  if (age <= policy.staleShortTicks) return "stale_short";
  if (age <= policy.staleMediumTicks) return "stale_medium";
  return "stale_long";
}

export class SnapshotRenderBuffer<TSnapshot = LiveGameplaySnapshot> {
  private readonly frames: SnapshotRenderFrame<TSnapshot>[] = [];

  constructor(private readonly capacity = 3) {
    if (!Number.isFinite(capacity) || capacity < 2) {
      throw new Error("SnapshotRenderBuffer capacity must be at least 2");
    }
  }

  push(snapshot: TSnapshot, serverTick: number | null | undefined = readSnapshotTick(snapshot)): void {
    const tick = normalizeTick(serverTick);
    if (tick === null) return;

    const frame: SnapshotRenderFrame<TSnapshot> = { serverTick: tick, snapshot };
    const existingIndex = this.frames.findIndex((entry) => entry.serverTick === tick);
    if (existingIndex >= 0) {
      this.frames[existingIndex] = frame;
    } else {
      this.frames.push(frame);
    }

    this.frames.sort((a, b) => Number(a.serverTick) - Number(b.serverTick));
    while (this.frames.length > this.capacity) {
      this.frames.shift();
    }
  }

  latest(): SnapshotRenderFrame<TSnapshot> | null {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
  }

  getFrames(): readonly SnapshotRenderFrame<TSnapshot>[] {
    return [...this.frames];
  }

  getRenderPair(renderTick: number, visualAlpha = 1): SnapshotRenderPair<TSnapshot> | null {
    const targetTick = normalizeTick(renderTick);
    if (targetTick === null || this.frames.length === 0) return null;

    let previous = this.frames[0];
    let current = this.frames[this.frames.length - 1];

    for (let i = 0; i < this.frames.length; i += 1) {
      const frame = this.frames[i];
      if (Number(frame.serverTick) <= targetTick) previous = frame;
      if (Number(frame.serverTick) >= targetTick) {
        current = frame;
        break;
      }
    }

    if (Number(previous.serverTick) > Number(current.serverTick)) {
      return null;
    }

    const tickSpan = Number(current.serverTick) - Number(previous.serverTick);
    const tickAlpha = tickSpan === 0 ? 1 : (targetTick - Number(previous.serverTick)) / tickSpan;

    return {
      previous,
      current,
      alpha: clampVisualAlpha(tickAlpha * clampVisualAlpha(visualAlpha)),
    };
  }
}

export function readSnapshotTick(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  return normalizeTick((snapshot as { readonly serverTick?: unknown }).serverTick);
}
