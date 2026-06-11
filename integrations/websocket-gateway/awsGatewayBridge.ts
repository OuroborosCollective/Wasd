import { createHash } from "node:crypto";
import type { WebSocket } from "ws";

export type WsGatewayStatus = "ready" | "empty";

export interface WsGatewayConnection {
  id: string;
  socket: WebSocket;
  playerId?: string;
  shardId?: string;
}

export interface WsGatewayMessageInput {
  tick: number;
  type: string;
  payload: Record<string, unknown>;
  actorId?: string;
  shardId?: string;
  previousStateHash?: string;
  kappa?: number;
}

export interface WsGatewayEnvelope {
  protocol: "ARELORIA_WS_GATEWAY_V1";
  kappa: number;
  tick: number;
  type: string;
  actorId?: string;
  shardId?: string;
  previousStateHash?: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  envelopeHash: string;
}

export interface WsGatewaySendResult {
  ok: boolean;
  connectionId: string;
  code: "SENT" | "NOT_FOUND" | "SOCKET_CLOSED" | "INVALID_INPUT" | "SEND_ERROR";
  error?: string;
}

export interface WsGatewayBroadcastResult {
  ok: boolean;
  sent: number;
  failed: number;
  results: WsGatewaySendResult[];
}

export interface WsGatewayBridge {
  status(): WsGatewayStatus;
  register(connection: WsGatewayConnection): void;
  unregister(connectionId: string): void;
  has(connectionId: string): boolean;
  count(): number;
  listConnectionIds(): string[];
  makeConnectionId(playerId: string, sessionId: string): string;
  makeEnvelope(input: WsGatewayMessageInput): WsGatewayEnvelope;
  send(connectionId: string, input: WsGatewayMessageInput): WsGatewaySendResult;
  broadcast(connectionIds: readonly string[], input: WsGatewayMessageInput): WsGatewayBroadcastResult;
  broadcastAll(input: WsGatewayMessageInput): WsGatewayBroadcastResult;
  disconnect(connectionId: string, reason?: string): boolean;
}

const PROTOCOL = "ARELORIA_WS_GATEWAY_V1" as const;
const DEFAULT_KAPPA = 1000;
const WS_OPEN = 1;

export function initAwsGatewayBridge(): WsGatewayBridge {
  return initWsGatewayBridge();
}

export function initWsGatewayBridge(): WsGatewayBridge {
  const connections = new Map<string, WsGatewayConnection>();

  return {
    status(): WsGatewayStatus {
      return connections.size > 0 ? "ready" : "empty";
    },

    register(connection: WsGatewayConnection): void {
      const id = normalizeId(connection.id);

      if (!id) {
        throw new Error("INVALID_CONNECTION_ID");
      }

      connections.set(id, {
        ...connection,
        id,
        playerId: connection.playerId ? normalizeId(connection.playerId) : undefined,
        shardId: connection.shardId ? normalizeId(connection.shardId) : undefined,
      });
    },

    unregister(connectionId: string): void {
      connections.delete(normalizeId(connectionId));
    },

    has(connectionId: string): boolean {
      return connections.has(normalizeId(connectionId));
    },

    count(): number {
      return connections.size;
    },

    listConnectionIds(): string[] {
      return Array.from(connections.keys()).sort(compareStable);
    },

    makeConnectionId(playerId: string, sessionId: string): string {
      const cleanPlayerId = normalizeId(playerId);
      const cleanSessionId = normalizeId(sessionId);

      if (!cleanPlayerId || !cleanSessionId) {
        throw new Error("INVALID_CONNECTION_ID_INPUT");
      }

      return `conn:${sha256Hex(`${cleanPlayerId}:${cleanSessionId}`).slice(0, 32)}`;
    },

    makeEnvelope(input: WsGatewayMessageInput): WsGatewayEnvelope {
      assertValidTick(input.tick);
      assertValidType(input.type);

      const payload = sanitizePayload(input.payload);
      const payloadHash = sha256Hex(stableStringify(payload));

      const baseEnvelope = {
        protocol: PROTOCOL,
        kappa: normalizeKappa(input.kappa),
        tick: input.tick,
        type: input.type,
        ...(input.actorId ? { actorId: normalizeId(input.actorId) } : {}),
        ...(input.shardId ? { shardId: normalizeId(input.shardId) } : {}),
        ...(input.previousStateHash ? { previousStateHash: normalizeId(input.previousStateHash) } : {}),
        payload,
        payloadHash,
      };

      return {
        ...baseEnvelope,
        envelopeHash: sha256Hex(stableStringify(baseEnvelope)),
      };
    },

    send(connectionId: string, input: WsGatewayMessageInput): WsGatewaySendResult {
      const id = normalizeId(connectionId);

      if (!id) {
        return {
          ok: false,
          connectionId: id,
          code: "INVALID_INPUT",
          error: "Connection id is empty.",
        };
      }

      const connection = connections.get(id);

      if (!connection) {
        return {
          ok: false,
          connectionId: id,
          code: "NOT_FOUND",
          error: "Connection is not registered.",
        };
      }

      if (connection.socket.readyState !== WS_OPEN) {
        connections.delete(id);

        return {
          ok: false,
          connectionId: id,
          code: "SOCKET_CLOSED",
          error: "Socket is not open.",
        };
      }

      try {
        const envelope = this.makeEnvelope(input);
        connection.socket.send(stableStringify(envelope));

        return {
          ok: true,
          connectionId: id,
          code: "SENT",
        };
      } catch (error) {
        return {
          ok: false,
          connectionId: id,
          code: "SEND_ERROR",
          error: error instanceof Error ? error.message : "Unknown send error.",
        };
      }
    },

    broadcast(connectionIds: readonly string[], input: WsGatewayMessageInput): WsGatewayBroadcastResult {
      const ids = uniqueSorted(connectionIds.map(normalizeId));
      const results = ids.map((id) => this.send(id, input));

      const sent = results.filter((result) => result.ok).length;
      const failed = results.length - sent;

      return {
        ok: failed === 0,
        sent,
        failed,
        results,
      };
    },

    broadcastAll(input: WsGatewayMessageInput): WsGatewayBroadcastResult {
      return this.broadcast(this.listConnectionIds(), input);
    },

    disconnect(connectionId: string, reason = "SERVER_DISCONNECT"): boolean {
      const id = normalizeId(connectionId);
      const connection = connections.get(id);

      if (!connection) return false;

      try {
        if (connection.socket.readyState === WS_OPEN) {
          connection.socket.close(1000, reason.slice(0, 120));
        }
      } finally {
        connections.delete(id);
      }

      return true;
    },
  };
}

function normalizeId(value: string | undefined): string {
  return String(value ?? "").trim();
}

function normalizeKappa(value: number | undefined): number {
  if (!Number.isInteger(value) || value <= 0) return DEFAULT_KAPPA;
  return value;
}

function assertValidTick(tick: number): void {
  if (!Number.isInteger(tick) || tick < 0) {
    throw new Error("INVALID_TICK");
  }
}

function assertValidType(type: string): void {
  if (!/^[a-zA-Z0-9._:-]{1,96}$/.test(type)) {
    throw new Error("INVALID_EVENT_TYPE");
  }
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort(compareStable);
}

function compareStable(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (!isPlainObject(payload)) {
    throw new Error("INVALID_PAYLOAD");
  }

  return sanitizeValue(payload) as Record<string, unknown>;
}

function sanitizeValue(value: unknown): unknown {
  if (value === null) return null;

  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("INVALID_NUMBER");
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (isPlainObject(value)) {
    const output: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value).sort(([a], [b]) => compareStable(a, b))) {
      if (!/^[a-zA-Z0-9._:-]{1,96}$/.test(key)) {
        throw new Error(`INVALID_PAYLOAD_KEY:${key}`);
      }

      if (typeof nestedValue === "undefined") continue;

      output[key] = sanitizeValue(nestedValue);
    }

    return output;
  }

  throw new Error(`UNSUPPORTED_PAYLOAD_VALUE:${typeof value}`);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortStable(value));
}

function sortStable(value: unknown): unknown {
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map(sortStable);
  }

  if (isPlainObject(value)) {
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(value).sort(compareStable)) {
      output[key] = sortStable(value[key]);
    }

    return output;
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
