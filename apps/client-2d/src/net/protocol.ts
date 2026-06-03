import type { EntityState } from "../world/entities";

export const ARELORIA_PROTOCOL_VERSION = 3 as const;

export type ClientMessageType =
  | "client_hello"
  | "guest_login"
  | "input_frame"
  | "skill_cast"
  | "chat_send"
  | "client_heartbeat";

export type ServerMessageType =
  | "welcome"
  | "world_snapshot"
  | "combat_result"
  | "toast"
  | "chat_message"
  | "server_heartbeat";

export interface InputFrame {
  sequenceId: number;
  tickId: number;
  moveX: number;
  moveY: number;
  primary: boolean;
  skill1: boolean;
  pointerX?: number;
  pointerY?: number;
  clientTimeMs: number;
}

export interface WorldSnapshot {
  protocolVersion: number;
  serverTick: number;
  receivedAtMs: number;
  acknowledgedInputSeq?: number;
  localPlayerId?: string;
  entities: EntityState[];
}

export interface ClientHelloPayload {
  client: "REAL_PIXI_CLIENT";
  engine: "PIXI_2D";
  logicHz: number;
  version: string;
  protocolVersion: typeof ARELORIA_PROTOCOL_VERSION;
}

export interface GuestLoginPayload {
  displayName: string;
}

export interface SkillCastPayload {
  sequenceId: number;
  tickId: number;
  skillId: "impact_buster" | "primary";
  x: number;
  y: number;
  clientTimeMs: number;
}

export interface ChatSendPayload {
  text: string;
}

export interface ClientHeartbeatPayload {
  clientTimeMs: number;
  lastServerTick?: number;
}

export interface ServerHeartbeatPayload {
  serverTimeMs: number;
  serverTick?: number;
}

export interface WelcomePayload {
  playerId: string;
  sceneId?: string;
  serverTick?: number;
  protocolVersion?: number;
}

export interface ToastPayload {
  id?: string;
  message: string;
  severity?: "info" | "success" | "warning" | "error";
}

export interface ChatMessagePayload {
  id: string;
  from: string;
  text: string;
  atMs: number;
}

export interface CombatResultPayload {
  id: string;
  atTick: number;
  sourceId?: string;
  targetId?: string;
  x: number;
  y: number;
  amount?: number;
  kind: "damage" | "heal" | "miss" | "block";
}

export interface ClientEnvelope<TType extends ClientMessageType, TPayload> {
  type: TType;
  payload: TPayload;
  t: number;
  protocolVersion: typeof ARELORIA_PROTOCOL_VERSION;
}

export interface ServerEnvelope<TType extends ServerMessageType, TPayload> {
  type: TType;
  payload: TPayload;
  t?: number;
  protocolVersion?: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEntityState(value: unknown): value is EntityState {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.vx === "number" &&
    typeof value.vy === "number"
  );
}

export function isWorldSnapshot(value: unknown): value is WorldSnapshot {
  if (!isRecord(value)) return false;

  return (
    typeof value.serverTick === "number" &&
    Array.isArray(value.entities) &&
    value.entities.every(isEntityState)
  );
}

export function isWelcomePayload(value: unknown): value is WelcomePayload {
  return isRecord(value) && typeof value.playerId === "string";
}

export function isToastPayload(value: unknown): value is ToastPayload {
  return isRecord(value) && typeof value.message === "string";
}

export function isChatMessagePayload(value: unknown): value is ChatMessagePayload {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.from === "string" &&
    typeof value.text === "string" &&
    typeof value.atMs === "number"
  );
}

export function isCombatResultPayload(value: unknown): value is CombatResultPayload {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.atTick === "number" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.kind === "string"
  );
}

export function isServerHeartbeatPayload(
  value: unknown
): value is ServerHeartbeatPayload {
  return isRecord(value) && typeof value.serverTimeMs === "number";
}

export function createClientEnvelope<TType extends ClientMessageType, TPayload>(
  type: TType,
  payload: TPayload
): ClientEnvelope<TType, TPayload> {
  return {
    type,
    payload,
    t: Date.now(),
    protocolVersion: ARELORIA_PROTOCOL_VERSION
  };
}