import type { EntityState } from "../world/entities";
import type { InventorySlot } from "../game/inventory";
import type { EquipmentSlotId } from "../game/equipment";
import type { QuestState } from "../game/quests";
import type { SkillId } from "../game/skills";

export const ARELORIA_PROTOCOL_VERSION = 5 as const;

export type ClientMessageType =
  | "client_hello"
  | "guest_login"
  | "input_frame"
  | "skill_cast"
  | "chat_send"
  | "client_heartbeat"
  | "loot_pickup_request"
  | "npc_interact_request"
  | "inventory_action"
  | "equipment_action"
  | "quest_accept"
  | "quest_track"
  | "chunk_observe";

export type ServerMessageType =
  | "welcome"
  | "world_snapshot"
  | "combat_result"
  | "toast"
  | "chat_message"
  | "server_heartbeat"
  | "inventory_snapshot"
  | "equipment_snapshot"
  | "quest_snapshot"
  | "loot_pickup_result"
  | "npc_dialogue"
  | "skill_result"
  | "chunk_snapshot"
  | "gameplay_event";

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

// Phase 4 Payload Types

export interface LootPickupRequestPayload {
  tickId: number;
  sequenceId: number;
  entityId: string;
}

export interface NpcInteractRequestPayload {
  tickId: number;
  sequenceId: number;
  npcId: string;
}

export interface InventorySnapshotPayload {
  slots: InventorySlot[];
}

export interface EquipmentSnapshotPayload {
  slots: Record<EquipmentSlotId, string | null>;
}

export interface QuestSnapshotPayload {
  quests: QuestState[];
}

export interface LootPickupResultPayload {
  ok: boolean;
  entityId?: string;
  itemId?: string;
  quantity?: number;
  reason?: string;
}

export interface NpcDialoguePayload {
  npcId: string;
  npcName: string;
  text: string;
}

export interface ServerErrorPayload {
  requestId?: string;
  code: string;
  message: string;
}

export interface SkillResultPayload {
  requestId?: string;
  ok: boolean;
  skillId: SkillId;
  reason?: string;
  cooldownRemainingTicks?: number;
}

export interface ChunkObservePayload {
  centerChunkId: string;
  chunks: string[];
}

export interface ChunkSnapshotPayload {
  chunkId: string;
  serverTick: number;
  tiles: Array<{
    x: number;
    y: number;
    terrain: "grass" | "forest" | "water" | "mountain" | "road" | "town";
  }>;
  entities?: EntityState[];
}

export interface GameplayEventPayload {
  eventType: string;
  data: Record<string, unknown>;
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

// Phase 4 Payload Validators

export function isInventorySnapshotPayload(value: unknown): value is InventorySnapshotPayload {
  return isRecord(value) && Array.isArray(value.slots);
}

export function isEquipmentSnapshotPayload(value: unknown): value is EquipmentSnapshotPayload {
  return (
    isRecord(value) &&
    isRecord(value.slots) &&
    typeof value.slots.weapon === "string" ||
    value.slots.weapon === null
  );
}

export function isQuestSnapshotPayload(value: unknown): value is QuestSnapshotPayload {
  return isRecord(value) && Array.isArray(value.quests);
}

export function isLootPickupResultPayload(value: unknown): value is LootPickupResultPayload {
  return isRecord(value) && typeof value.ok === "boolean";
}

export function isNpcDialoguePayload(value: unknown): value is NpcDialoguePayload {
  return (
    isRecord(value) &&
    typeof value.npcId === "string" &&
    typeof value.npcName === "string" &&
    typeof value.text === "string"
  );
}

export function isChunkObservePayload(value: unknown): value is ChunkObservePayload {
  return (
    isRecord(value) &&
    typeof value.centerChunkId === "string" &&
    Array.isArray(value.chunks)
  );
}

export function isSkillResultPayload(value: unknown): value is SkillResultPayload {
  return (
    isRecord(value) &&
    typeof value.ok === "boolean" &&
    typeof value.skillId === "string"
  );
}

export function isServerErrorPayload(value: unknown): value is ServerErrorPayload {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

export function isChunkSnapshotPayload(value: unknown): value is ChunkSnapshotPayload {
  return (
    isRecord(value) &&
    typeof value.chunkId === "string" &&
    typeof value.serverTick === "number" &&
    Array.isArray(value.tiles)
  );
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