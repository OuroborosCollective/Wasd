// Protocol v7: Identity, Auth Binding & Stable Player Ownership
export const SERVER_PROTOCOL_VERSION = 7 as const;

export type ClientMessageType =
  | "client_hello"
  | "guest_login"
  | "identity_resume"
  | "character_list_request"
  | "character_select"
  | "character_create"
  | "account_bind_request"
  | "input_frame"
  | "skill_cast"
  | "loot_pickup_request"
  | "npc_interact_request"
  | "inventory_action"
  | "equipment_action"
  | "quest_accept"
  | "quest_track"
  | "chunk_observe"
  | "chat_send"
  | "client_heartbeat";

export type ServerMessageType =
  | "welcome"
  | "identity_challenge"
  | "identity_resume_result"
  | "character_list"
  | "character_select_result"
  | "character_create_result"
  | "ownership_error"
  | "world_snapshot"
  | "inventory_snapshot"
  | "equipment_snapshot"
  | "quest_snapshot"
  | "loot_pickup_result"
  | "npc_dialogue"
  | "skill_result"
  | "combat_result"
  | "chunk_snapshot"
  | "gameplay_event"
  | "chat_message"
  | "toast"
  | "server_heartbeat"
  | "server_error";

export interface ServerEnvelope<TType extends ServerMessageType, TPayload> {
  type: TType;
  protocolVersion: typeof SERVER_PROTOCOL_VERSION;
  payload: TPayload;
  t: number;
}

export interface ClientEnvelope<TType extends ClientMessageType = ClientMessageType> {
  type: TType;
  protocolVersion?: number;
  payload?: unknown;
  t?: number;
}

export interface ServerErrorPayload {
  requestId?: string;
  code: string;
  message: string;
}

function stableHash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function deterministicEnvelopeTime(type: ServerMessageType, payload: unknown): number {
  if (isRecord(payload)) {
    const explicit = payload.tick ?? payload.serverTick ?? payload.logicalIndex ?? payload.t;
    const n = Number(explicit);
    if (Number.isSafeInteger(n) && n >= 0) return n;
  }
  return stableHash32(`${SERVER_PROTOCOL_VERSION}:${type}:${JSON.stringify(payload ?? null)}`);
}

export function envelope<TType extends ServerMessageType, TPayload>(
  type: TType,
  payload: TPayload
): ServerEnvelope<TType, TPayload> {
  return {
    type,
    protocolVersion: SERVER_PROTOCOL_VERSION,
    payload,
    t: deterministicEnvelopeTime(type, payload)
  };
}

export function serverError(
  code: string,
  message: string,
  requestId?: string
): ServerEnvelope<"server_error", ServerErrorPayload> {
  return envelope("server_error", {
    requestId,
    code,
    message
  });
}

export function safeJsonParse(raw: unknown): unknown {
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getRequestId(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  return typeof payload.requestId === "string" ? payload.requestId : undefined;
}

export function isClientEnvelope(value: unknown): value is ClientEnvelope {
  return isRecord(value) && typeof value.type === "string";
}
