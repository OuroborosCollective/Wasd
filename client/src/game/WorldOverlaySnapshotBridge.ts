/**
 * 3D client read-only snapshot bridge (CloudCraft integration #2464).
 *
 * Fetches the server-authoritative LiveGameplaySnapshot via the
 * `GET /api/gameplay/snapshot` endpoint and derives a read-only
 * WorldOverlayModel using the shared derivation function. The 3D client
 * never invents overlay truth — it only consumes what the server returns.
 *
 * Degrades honestly: on fetch failure, missing payload, or invalid shape,
 * the bridge reports `blocked`/`waiting` rather than fabricating a live state.
 */

import {
  deriveWorldOverlayModelFromSnapshot,
  EMPTY_WORLD_OVERLAY_MODEL,
  type WorldOverlayModel,
} from "@wasd/shared";

export interface SnapshotBridgeOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
}

export interface SnapshotBridgeState {
  model: WorldOverlayModel;
  revisionHash: string | null;
  serverTick: number | null;
  lastError: string | null;
}

const DEFAULT_ENDPOINT = "/api/gameplay/snapshot";
const DEFAULT_POLL_MS = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Derive a WorldOverlayModel from a raw API response body.
 * The response shape is `{ ok: boolean; liveGameplaySnapshot?: ... }`.
 * If ok=false or the snapshot is absent, return an honest blocked state.
 */
export function deriveOverlayFromApiResponse(body: unknown): WorldOverlayModel {
  if (!isRecord(body)) return EMPTY_WORLD_OVERLAY_MODEL;
  if (body.ok === false) {
    return { ...EMPTY_WORLD_OVERLAY_MODEL, status: "blocked" };
  }
  const snapshot = body.liveGameplaySnapshot;
  if (!isRecord(snapshot)) {
    return { ...EMPTY_WORLD_OVERLAY_MODEL, status: body.ok === true ? "waiting" : "blocked" };
  }
  return deriveWorldOverlayModelFromSnapshot(snapshot);
}

export class WorldOverlaySnapshotBridge {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly pollIntervalMs: number;
  private state: SnapshotBridgeState = {
    model: EMPTY_WORLD_OVERLAY_MODEL,
    revisionHash: null,
    serverTick: null,
    lastError: null,
  };
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(state: SnapshotBridgeState) => void>();

  constructor(opts: SnapshotBridgeOptions = {}) {
    this.endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
    this.fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
    this.pollIntervalMs = Math.max(1000, opts.pollIntervalMs ?? DEFAULT_POLL_MS);
  }

  getState(): SnapshotBridgeState {
    return this.state;
  }

  subscribe(listener: (state: SnapshotBridgeState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(next: SnapshotBridgeState): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  async refresh(): Promise<SnapshotBridgeState> {
    try {
      const response = await this.fetchImpl(this.endpoint, {
        headers: { accept: "application/json" },
        credentials: "same-origin",
      });
      if (!response.ok) {
        this.setState({
          ...this.state,
          lastError: `http_${response.status}`,
          model: { ...EMPTY_WORLD_OVERLAY_MODEL, status: "blocked" },
        });
        return this.state;
      }
      const body: unknown = await response.json();
      const model = deriveOverlayFromApiResponse(body);
      const revisionHash =
        isRecord(body) && typeof body.revisionHash === "string" ? body.revisionHash : null;
      const serverTick =
        isRecord(body) && typeof body.serverTick === "number" ? body.serverTick : null;
      this.setState({
        model,
        revisionHash,
        serverTick,
        lastError: null,
      });
      return this.state;
    } catch (err) {
      const message = err instanceof Error ? err.message : "fetch_failed";
      this.setState({
        ...this.state,
        lastError: message,
        model: { ...EMPTY_WORLD_OVERLAY_MODEL, status: "blocked" },
      });
      return this.state;
    }
  }

  start(): void {
    if (this.pollTimer) return;
    void this.refresh();
    this.pollTimer = setInterval(() => {
      void this.refresh();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

let bridge: WorldOverlaySnapshotBridge | null = null;

export function getWorldOverlaySnapshotBridge(opts?: SnapshotBridgeOptions): WorldOverlaySnapshotBridge {
  if (!bridge) {
    bridge = new WorldOverlaySnapshotBridge(opts);
  }
  return bridge;
}
