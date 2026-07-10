import { createHash } from "node:crypto";
import {
  isClientIntentAction,
  type ClientIntent,
  type ClientIntentAction,
  type ClientIntentPayloadByAction,
} from "@wasd/shared";

export type CanonicalIntentHash = string;

export interface ServerCanonicalIntent<TAction extends ClientIntentAction = ClientIntentAction> {
  readonly action: TAction;
  readonly payload: ClientIntentPayloadByAction[TAction];
  readonly requestId?: string;
  readonly actorId: string;
  readonly tickId: number | string;
  readonly logicalIndex: number;
  readonly receivedOrder: number;
  readonly chunkKey: string;
  readonly intentHash: CanonicalIntentHash;
}

export interface CanonicalIntentContext {
  readonly actorId: string;
  readonly tickId: number | string;
  readonly logicalIndex: number;
  readonly receivedOrder: number;
  readonly chunkKey: string;
}

export interface WorldPosition2D {
  readonly x: number;
  readonly y: number;
}

type CanonicalIntentWithoutHash<TAction extends ClientIntentAction> = Omit<ServerCanonicalIntent<TAction>, "intentHash">;

const FORBIDDEN_CLIENT_AUTHORITY_KEYS = new Set([
  "actorId",
  "authority",
  "chunkKey",
  "intentHash",
  "logicalIndex",
  "receivedOrder",
  "tickId",
  "tickIndex",
  "worldHash",
]);

function binaryCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function assertSafeFiniteInteger(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a finite non-negative number`);
  }
  return Math.floor(value);
}

function assertSafeIdentifier(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9:_./-]{1,160}$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a safe deterministic identifier`);
  }
  return trimmed;
}

function assertSafeTickId(value: number | string): number | string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("tickId must be a safe non-negative integer or deterministic identifier");
    }
    return value;
  }

  return assertSafeIdentifier(value, "tickId");
}

function stableNormalize(value: unknown, path = "payload"): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${path} contains a non-finite number`);
    }
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => stableNormalize(entry, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    const keys = Object.keys(objectValue).sort(binaryCompare);

    for (const key of keys) {
      if (FORBIDDEN_CLIENT_AUTHORITY_KEYS.has(key)) {
        throw new Error(`${path}.${key} is server-authoritative and cannot be supplied by the client intent`);
      }
      normalized[key] = stableNormalize(objectValue[key], `${path}.${key}`);
    }

    return normalized;
  }

  throw new Error(`${path} contains unsupported value type`);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function deriveIntentHash<TAction extends ClientIntentAction>(parts: CanonicalIntentWithoutHash<TAction>): CanonicalIntentHash {
  const hashInput = stableStringify({
    action: parts.action,
    actorId: parts.actorId,
    chunkKey: parts.chunkKey,
    logicalIndex: parts.logicalIndex,
    payload: parts.payload,
    receivedOrder: parts.receivedOrder,
    requestId: parts.requestId ?? "",
    tickId: String(parts.tickId),
  });

  return createHash("sha256").update(hashInput).digest("hex");
}

export function chunkKeyFromWorldPosition(position: WorldPosition2D, chunkSize = 64): string {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("position must contain finite x/y coordinates");
  }

  const safeChunkSize = assertSafeFiniteInteger(chunkSize, "chunkSize");
  if (safeChunkSize <= 0) {
    throw new Error("chunkSize must be greater than zero");
  }

  const chunkX = Math.floor(position.x / safeChunkSize);
  const chunkY = Math.floor(position.y / safeChunkSize);
  return `chunk:${chunkX}:${chunkY}`;
}

export function canonicalizeClientIntent<TAction extends ClientIntentAction>(
  clientIntent: ClientIntent<TAction>,
  context: CanonicalIntentContext,
): ServerCanonicalIntent<TAction> {
  if (!isClientIntentAction(clientIntent.action)) {
    throw new Error("client intent action is not supported");
  }

  const actorId = assertSafeIdentifier(context.actorId, "actorId");
  const chunkKey = assertSafeIdentifier(context.chunkKey, "chunkKey");
  const tickId = assertSafeTickId(context.tickId);
  const logicalIndex = assertSafeFiniteInteger(context.logicalIndex, "logicalIndex");
  const receivedOrder = assertSafeFiniteInteger(context.receivedOrder, "receivedOrder");
  const requestId = clientIntent.requestId === undefined
    ? undefined
    : assertSafeIdentifier(clientIntent.requestId, "requestId");
  const normalizedPayload = stableNormalize(clientIntent.payload) as ClientIntentPayloadByAction[TAction];

  const withoutHash: CanonicalIntentWithoutHash<TAction> = {
    action: clientIntent.action,
    payload: normalizedPayload,
    requestId,
    actorId,
    tickId,
    logicalIndex,
    receivedOrder,
    chunkKey,
  };

  return {
    ...withoutHash,
    intentHash: deriveIntentHash(withoutHash),
  };
}

export function canonicalizeClientIntentBatch<TAction extends ClientIntentAction>(
  clientIntents: readonly ClientIntent<TAction>[],
  context: Omit<CanonicalIntentContext, "receivedOrder">,
): ServerCanonicalIntent<TAction>[] {
  return clientIntents.map((clientIntent, index) =>
    canonicalizeClientIntent(clientIntent, {
      ...context,
      receivedOrder: index,
    }),
  );
}

export function compareCanonicalIntents(a: ServerCanonicalIntent, b: ServerCanonicalIntent): number {
  return (
    Number(a.logicalIndex) - Number(b.logicalIndex) ||
    Number(a.receivedOrder) - Number(b.receivedOrder) ||
    binaryCompare(String(a.actorId), String(b.actorId)) ||
    binaryCompare(String(a.chunkKey), String(b.chunkKey)) ||
    binaryCompare(String(a.intentHash), String(b.intentHash))
  );
}

export function sortCanonicalIntents(intents: readonly ServerCanonicalIntent[]): ServerCanonicalIntent[] {
  return [...intents].sort(compareCanonicalIntents);
}
