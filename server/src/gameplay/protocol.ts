export const SERVER_PROTOCOL_VERSION = 5 as const;

export type ClientMessageType =
  | "client_hello"
  | "guest_login"
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

export function envelope<TType extends ServerMessageType, TPayload>(
  type: TType,
  payload: TPayload
): ServerEnvelope<TType, TPayload> {
  return {
    type,
    protocolVersion: SERVER_PROTOCOL_VERSION,
    payload,
    t: Date.now()
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