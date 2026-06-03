import type { EntityState } from "../world/entities";

export type ClientMessageType =
  | "client_hello"
  | "guest_login"
  | "input_frame"
  | "skill_cast"
  | "client_heartbeat";

export type ServerMessageType =
  | "welcome"
  | "world_snapshot"
  | "combat_result"
  | "toast"
  | "server_heartbeat";

export interface InputFrame {
  tickId: number;
  moveX: number;
  moveY: number;
  primary: boolean;
  skill1: boolean;
  pointerX?: number;
  pointerY?: number;
}

export interface WorldSnapshot {
  serverTick: number;
  receivedAtMs: number;
  entities: EntityState[];
}

export interface ClientHelloPayload {
  client: "REAL_PIXI_CLIENT";
  engine: "PIXI_2D";
  logicHz: number;
  version: string;
}

export interface GuestLoginPayload {
  displayName: string;
}

export interface SkillCastPayload {
  tickId: number;
  skillId: "impact_buster" | "primary";
  x: number;
  y: number;
}

export interface ClientEnvelope<TType extends ClientMessageType, TPayload> {
  type: TType;
  payload: TPayload;
  t: number;
}

export interface ServerEnvelope<TType extends ServerMessageType, TPayload> {
  type: TType;
  payload: TPayload;
  t?: number;
}

export interface WelcomePayload {
  playerId: string;
  sceneId?: string;
  serverTick?: number;
}

export interface ToastPayload {
  message: string;
  severity?: "info" | "success" | "warning" | "error";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isWorldSnapshot(value: unknown): value is WorldSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.serverTick === "number" &&
    Array.isArray(value.entities)
  );
}

export function createClientEnvelope<TType extends ClientMessageType, TPayload>(
  type: TType,
  payload: TPayload
): ClientEnvelope<TType, TPayload> {
  return {
    type,
    payload,
    t: Date.now()
  };
}