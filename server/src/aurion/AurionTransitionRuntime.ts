import { createHash } from "node:crypto";
import { canonicalIntentIntake } from "../intents/CanonicalIntentIntake.js";
import {
  canonicalizeClientIntent,
  chunkKeyFromWorldPosition,
  type ServerCanonicalIntent,
} from "../intents/ServerCanonicalIntent.js";

export const AURION_TRANSITION_SCHEMA_VERSION = "aurion-transition-snapshot.v1" as const;
export const AURION_EXPANSE_GATE_ID = "aurion:transition:expanse-gate" as const;
export const AURION_TOWER_ZONE_ID = "tower" as const;
export const AURION_EXPANSE_ZONE_ID = "expanse" as const;
export const AURION_EXPANSE_ENTRY_POINT_ID = "expanse:arrival" as const;
export const AURION_TOWER_RETURN_POINT_ID = "tower:threshold" as const;

export type AurionZoneId = typeof AURION_TOWER_ZONE_ID | typeof AURION_EXPANSE_ZONE_ID;
export type AurionTransitionStatus = "idle" | "queued" | "active";
export type AurionReceiptStatus = "queued" | "applied";

export interface AurionTransitionReceipt {
  readonly requestId: string;
  readonly sequenceId: number;
  readonly intentHash: string;
  readonly status: AurionReceiptStatus;
  readonly acceptedAtTick: number;
  readonly appliedAtTick: number | null;
}

export interface AurionTransitionSnapshot {
  readonly schemaVersion: typeof AURION_TRANSITION_SCHEMA_VERSION;
  readonly persistence: "ephemeral";
  readonly playerId: string;
  readonly sessionId: string | null;
  readonly status: AurionTransitionStatus;
  readonly zoneId: AurionZoneId;
  readonly entryPointId: string;
  readonly returnPointId: string;
  readonly lastAppliedTick: number | null;
  readonly lastAcceptedSequence: number;
  readonly pendingRequestCount: number;
  readonly lastReceipt: AurionTransitionReceipt | null;
  readonly transitionHash: string;
}

export interface AurionTransitionRequest {
  readonly playerId: string;
  readonly requestId: string;
  readonly sequenceId: number;
  readonly acceptedAtTick: number;
  readonly playerPosition: {
    readonly x: number;
    readonly y: number;
  };
}

export type AurionTransitionRequestResult =
  | {
    readonly ok: true;
    readonly code: "queued" | "duplicate";
    readonly duplicate: boolean;
    readonly snapshot: AurionTransitionSnapshot;
  }
  | {
    readonly ok: false;
    readonly code: "invalid_request" | "stale_sequence";
    readonly snapshot: AurionTransitionSnapshot;
  };

type QueuedAurionTransition = {
  readonly playerId: string;
  readonly requestId: string;
  readonly sequenceId: number;
  readonly acceptedAtTick: number;
  readonly intent: ServerCanonicalIntent<"interact">;
};

type AurionPlayerState = {
  readonly playerId: string;
  readonly sessionId: string;
  readonly zoneId: AurionZoneId;
  readonly entryPointId: string;
  readonly returnPointId: string;
  readonly lastAppliedTick: number;
  readonly lastAcceptedSequence: number;
  readonly lastReceipt: AurionTransitionReceipt;
};

function binaryCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{1,96}$/.test(value.trim());
}

function asSafeTick(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) && numberValue >= 0 ? numberValue : null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort(binaryCompare).map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function transitionHash(value: Omit<AurionTransitionSnapshot, "transitionHash">): string {
  return createHash("sha256").update(stableStringify(value), "utf8").digest("hex");
}

function freezeReceipt(receipt: AurionTransitionReceipt): AurionTransitionReceipt {
  return Object.freeze({ ...receipt });
}

function compareQueuedTransitions(a: QueuedAurionTransition, b: QueuedAurionTransition): number {
  return (
    a.acceptedAtTick - b.acceptedAtTick ||
    binaryCompare(a.playerId, b.playerId) ||
    a.sequenceId - b.sequenceId ||
    binaryCompare(a.requestId, b.requestId)
  );
}

/**
 * Runtime-only world-transition slice.
 *
 * The HTTP edge can only enqueue a bounded interaction. Player-bound session
 * state is applied by AurionTransitionTickSystem, never directly by the router.
 * This first increment intentionally has no persistence and no reward effect.
 */
export class AurionTransitionRuntime {
  private readonly playerStates = new Map<string, AurionPlayerState>();
  private readonly receiptsByPlayer = new Map<string, Map<string, AurionTransitionReceipt>>();
  private readonly pending: QueuedAurionTransition[] = [];

  requestTransition(request: AurionTransitionRequest): AurionTransitionRequestResult {
    const playerId = request.playerId.trim();
    const requestId = request.requestId.trim();
    const sequenceId = asSafeTick(request.sequenceId);
    const acceptedAtTick = asSafeTick(request.acceptedAtTick);
    const x = Number(request.playerPosition?.x);
    const y = Number(request.playerPosition?.y);

    if (!isSafeIdentifier(playerId) || !isSafeIdentifier(requestId) || sequenceId === null || acceptedAtTick === null || !Number.isFinite(x) || !Number.isFinite(y)) {
      return Object.freeze({
        ok: false,
        code: "invalid_request",
        snapshot: this.getSnapshot(playerId),
      });
    }

    const receipts = this.receiptsByPlayer.get(playerId);
    const existingReceipt = receipts?.get(requestId);
    if (existingReceipt) {
      return Object.freeze({
        ok: true,
        code: "duplicate",
        duplicate: true,
        snapshot: this.getSnapshot(playerId),
      });
    }

    const latestSequence = this.playerStates.get(playerId)?.lastAcceptedSequence ?? -1;
    const pendingForPlayer = this.pending
      .filter((entry) => entry.playerId === playerId)
      .reduce((highest, entry) => Math.max(highest, entry.sequenceId), latestSequence);

    if (sequenceId <= pendingForPlayer) {
      return Object.freeze({
        ok: false,
        code: "stale_sequence",
        snapshot: this.getSnapshot(playerId),
      });
    }

    const intent = canonicalizeClientIntent<"interact">(
      {
        action: "interact",
        payload: {
          targetId: AURION_EXPANSE_GATE_ID,
          interaction: "tower_to_expanse",
        },
        requestId,
      },
      {
        actorId: playerId,
        tickId: acceptedAtTick,
        logicalIndex: acceptedAtTick,
        receivedOrder: sequenceId,
        chunkKey: chunkKeyFromWorldPosition({ x, y }),
      },
    );
    canonicalIntentIntake.record(intent);

    const receipt = freezeReceipt({
      requestId,
      sequenceId,
      intentHash: intent.intentHash,
      status: "queued",
      acceptedAtTick,
      appliedAtTick: null,
    });
    const nextReceipts = receipts ?? new Map<string, AurionTransitionReceipt>();
    nextReceipts.set(requestId, receipt);
    this.receiptsByPlayer.set(playerId, nextReceipts);
    this.pending.push(Object.freeze({ playerId, requestId, sequenceId, acceptedAtTick, intent }));

    return Object.freeze({
      ok: true,
      code: "queued",
      duplicate: false,
      snapshot: this.getSnapshot(playerId),
    });
  }

  applyReadyTransitions(currentTick: number): number {
    const tick = asSafeTick(currentTick);
    if (tick === null || this.pending.length === 0) return 0;

    const queued = this.pending.splice(0, this.pending.length);
    const ready: QueuedAurionTransition[] = [];
    const deferred: QueuedAurionTransition[] = [];
    for (const entry of queued) {
      if (entry.acceptedAtTick <= tick) ready.push(entry);
      else deferred.push(entry);
    }
    ready.sort(compareQueuedTransitions);
    deferred.sort(compareQueuedTransitions);
    this.pending.push(...deferred);

    for (const entry of ready) {
      const receipts = this.receiptsByPlayer.get(entry.playerId);
      const existingReceipt = receipts?.get(entry.requestId);
      if (!receipts || !existingReceipt || existingReceipt.status !== "queued") continue;

      const appliedReceipt = freezeReceipt({
        ...existingReceipt,
        status: "applied",
        appliedAtTick: tick,
      });
      receipts.set(entry.requestId, appliedReceipt);
      this.playerStates.set(entry.playerId, Object.freeze({
        playerId: entry.playerId,
        sessionId: `aurion:${entry.playerId}`,
        zoneId: AURION_EXPANSE_ZONE_ID,
        entryPointId: AURION_EXPANSE_ENTRY_POINT_ID,
        returnPointId: AURION_TOWER_RETURN_POINT_ID,
        lastAppliedTick: tick,
        lastAcceptedSequence: entry.sequenceId,
        lastReceipt: appliedReceipt,
      }));
    }

    return ready.length;
  }

  getSnapshot(playerIdInput: string): AurionTransitionSnapshot {
    const playerId = typeof playerIdInput === "string" ? playerIdInput.trim() : "";
    const state = this.playerStates.get(playerId);
    const pendingRequestCount = this.pending.filter((entry) => entry.playerId === playerId).length;
    const lastReceipt = state?.lastReceipt ?? this.findLatestReceipt(playerId);
    const snapshotWithoutHash: Omit<AurionTransitionSnapshot, "transitionHash"> = {
      schemaVersion: AURION_TRANSITION_SCHEMA_VERSION,
      persistence: "ephemeral",
      playerId,
      sessionId: state?.sessionId ?? null,
      status: state ? "active" : pendingRequestCount > 0 ? "queued" : "idle",
      zoneId: state?.zoneId ?? AURION_TOWER_ZONE_ID,
      entryPointId: state?.entryPointId ?? AURION_TOWER_RETURN_POINT_ID,
      returnPointId: state?.returnPointId ?? AURION_TOWER_RETURN_POINT_ID,
      lastAppliedTick: state?.lastAppliedTick ?? null,
      lastAcceptedSequence: state?.lastAcceptedSequence ?? -1,
      pendingRequestCount,
      lastReceipt: lastReceipt ? freezeReceipt(lastReceipt) : null,
    };

    return Object.freeze({
      ...snapshotWithoutHash,
      transitionHash: transitionHash(snapshotWithoutHash),
    });
  }

  getPendingTransitionCount(): number {
    return this.pending.length;
  }

  reset(): void {
    this.playerStates.clear();
    this.receiptsByPlayer.clear();
    this.pending.splice(0, this.pending.length);
  }

  private findLatestReceipt(playerId: string): AurionTransitionReceipt | null {
    const receipts = this.receiptsByPlayer.get(playerId);
    if (!receipts || receipts.size === 0) return null;
    return [...receipts.values()].sort((a, b) => b.sequenceId - a.sequenceId || binaryCompare(b.requestId, a.requestId))[0] ?? null;
  }
}

export const aurionTransitionRuntime = new AurionTransitionRuntime();
