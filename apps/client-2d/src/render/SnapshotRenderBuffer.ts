/**
 * Snapshot Render Buffer
 *
 * Client-side buffer that holds only server-authoritative snapshots for rendering.
 *
 * ARE-Rules compliance:
 * - SnapshotRenderBuffer never mutates Inventory/Equipment/NPC/Resource/Economy truth
 * - It only computes render projections
 * - Client time is only used for visual projection, never flows back to server
 * - No Math.random() in gameplay/snapshot path
 * - No Date.now() in server truth path
 */

import { clampVisualAlpha } from "./SnapshotInterpolation";

/**
 * 2D position for rendering purposes.
 */
export interface RenderPosition2D {
  readonly x: number;
  readonly y: number;
}

/**
 * A single render frame containing a server snapshot.
 */
export interface SnapshotRenderFrame<TSnapshot = unknown> {
  /** Server tick for this frame. Null means the frame is not renderable. */
  readonly serverTick: number | null;
  /** Server-authoritative snapshot. Never mutated by the buffer. */
  readonly snapshot: TSnapshot;
  /** Client-side timestamp when this frame was received. */
  readonly receivedAtClientFrameMs: number;
}

/**
 * A pair of frames used for interpolation.
 */
export interface SnapshotRenderPair<TSnapshot = unknown> {
  readonly previous: SnapshotRenderFrame<TSnapshot>;
  readonly current: SnapshotRenderFrame<TSnapshot>;
  readonly alpha: number;
}

/**
 * Connection freshness states for stale detection.
 */
export type SyncFreshnessState =
  | "waiting"   // No snapshot received yet
  | "fresh"     // Normal state, within freshTicks of latest
  | "stale_short"  // Minor staleness, render interpolation only
  | "stale_medium" // Moderate staleness, ambient idle visuals only
  | "stale_long";  // Severe staleness, show resync indicator

/**
 * Policy for classifying sync freshness.
 */
export interface SyncFreshnessPolicy {
  readonly freshTicks: number;       // Ticks considered fresh (default: 2)
  readonly staleShortTicks: number; // Ticks for stale_short threshold (default: 10)
  readonly staleMediumTicks: number; // Ticks for stale_medium threshold (default: 30)
}

/**
 * Default freshness policy.
 */
export const DEFAULT_SYNC_FRESHNESS_POLICY: SyncFreshnessPolicy = Object.freeze({
  freshTicks: 2,
  staleShortTicks: 10,
  staleMediumTicks: 30,
});

/**
 * Connection freshness metadata.
 */
export interface ConnectionFreshness {
  readonly state: SyncFreshnessState;
  readonly latestServerTick: number | null;
  readonly tickAge: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeTick(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  const tick = Math.floor(value);
  return tick >= 0 ? tick : null;
}

/**
 * Classify the sync freshness based on latest server tick and render tick.
 */
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

/**
 * Extract serverTick from a snapshot object.
 */
export function readSnapshotTick(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  return normalizeTick((snapshot as { readonly serverTick?: unknown }).serverTick);
}

/**
 * Snapshot Render Buffer
 *
 * Holds a bounded buffer of server snapshots for render interpolation.
 * Only stores server-authoritative snapshots - never creates client-side truth.
 */
export class SnapshotRenderBuffer<TSnapshot = unknown> {
  private readonly frames: SnapshotRenderFrame<TSnapshot>[] = [];

  constructor(private readonly capacity = 3) {
    if (!Number.isFinite(capacity) || capacity < 2) {
      throw new Error("SnapshotRenderBuffer capacity must be at least 2");
    }
  }

  /**
   * Push a new server snapshot into the buffer.
   * @param snapshot - The server-authoritative snapshot
   * @param serverTick - Optional server tick override (reads from snapshot if not provided)
   * @param receivedAtClientFrameMs - Optional client receive timestamp (defaults to Date.now())
   */
  push(
    snapshot: TSnapshot,
    serverTick?: number | null,
    receivedAtClientFrameMs?: number,
  ): void {
    const tick = serverTick !== undefined ? normalizeTick(serverTick) : readSnapshotTick(snapshot);
    if (tick === null) return;

    const frameTime = isFiniteNumber(receivedAtClientFrameMs)
      ? receivedAtClientFrameMs!
      : Date.now();

    const frame: SnapshotRenderFrame<TSnapshot> = {
      serverTick: tick,
      snapshot,
      receivedAtClientFrameMs: frameTime,
    };

    // Update existing frame with same tick, or add new one
    const existingIndex = this.frames.findIndex((entry) => entry.serverTick === tick);
    if (existingIndex >= 0) {
      this.frames[existingIndex] = frame;
    } else {
      this.frames.push(frame);
    }

    // Sort by server tick
    this.frames.sort((a, b) => Number(a.serverTick) - Number(b.serverTick));

    // Enforce capacity
    while (this.frames.length > this.capacity) {
      this.frames.shift();
    }
  }

  /**
   * Get the most recent frame.
   */
  latest(): SnapshotRenderFrame<TSnapshot> | null {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
  }

  /**
   * Get all frames in the buffer.
   */
  getFrames(): readonly SnapshotRenderFrame<TSnapshot>[] {
    return [...this.frames];
  }

  /**
   * Get a render pair for interpolating to a specific tick.
   *
   * @param renderTick - The target render tick
   * @param visualAlpha - Additional visual alpha multiplier (0-1)
   * @returns A pair of frames and alpha for interpolation, or null if not possible
   */
  getRenderPair(renderTick: number, visualAlpha = 1): SnapshotRenderPair<TSnapshot> | null {
    const targetTick = normalizeTick(renderTick);
    if (targetTick === null || this.frames.length === 0) return null;

    for (let index = 1; index < this.frames.length; index += 1) {
      if (Number(this.frames[index - 1]!.serverTick) > Number(this.frames[index]!.serverTick)) {
        return null;
      }
    }

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

    // Ensure valid ordering
    if (Number(previous.serverTick) > Number(current.serverTick)) {
      return null;
    }

    // Calculate interpolation alpha
    const tickSpan = Number(current.serverTick) - Number(previous.serverTick);
    const tickAlpha = tickSpan === 0 ? 1 : (targetTick - Number(previous.serverTick)) / tickSpan;

    return {
      previous,
      current,
      alpha: clampVisualAlpha(tickAlpha * clampVisualAlpha(visualAlpha)),
    };
  }

  /**
   * Get connection freshness information.
   */
  getConnectionFreshness(renderTick: number, policy?: SyncFreshnessPolicy): ConnectionFreshness {
    const latest = this.latest();
    const latestTick = latest?.serverTick ?? null;
    const state = classifySyncFreshness(latestTick, renderTick, policy);
    const tickAge = latestTick !== null && renderTick !== null
      ? Math.max(0, renderTick - latestTick)
      : 0;

    return { state, latestServerTick: latestTick, tickAge };
  }

  /**
   * Clear all frames from the buffer.
   */
  clear(): void {
    this.frames.length = 0;
  }
}
