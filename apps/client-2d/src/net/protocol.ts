import type { EntityState } from "../world/entities";
import type { InventorySlot } from "../game/inventory";
import type { EquipmentSlotId } from "../game/equipment";
import type { QuestState } from "../game/quests";
import type { SkillId } from "../game/skills";

export const ARELORIA_PROTOCOL_VERSION = 7 as const;

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
  | "identity_challenge"
  | "identity_resume_result"
  | "character_list"
  | "character_select_result"
  | "character_create_result"
  | "ownership_error"
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
  | "gameplay_event"
  | "causal_catchup_summary"
  | "server_error";

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

export interface IdentityClientFields {
  stableGuestId?: string;
  sessionToken?: string;
  accountId?: string;
  selectedCharacterId?: string;
}

export interface ClientHelloPayload extends IdentityClientFields {
  client: "REAL_PIXI_CLIENT";
  engine: "PIXI_2D";
  logicHz: number;
  version: string;
  protocolVersion: typeof ARELORIA_PROTOCOL_VERSION;
}

export interface GuestLoginPayload extends IdentityClientFields {
  displayName: string;
}

export interface WelcomePayload {
  playerId: string;
  sceneId?: string;
  serverTick?: number;
  protocolVersion?: number;
  sessionToken?: string;
  identityId?: string;
  characterId?: string;
  characterName?: string;
  resumed?: boolean;
}

export interface CharacterSummaryPayload {
  id: string;
  name: string;
  sceneId: string;
  level?: number;
  updatedAtMs?: number;
}

export interface CharacterListPayload {
  characters: CharacterSummaryPayload[];
  selectedCharacterId?: string;
}

export interface CharacterSelectResultPayload {
  ok: boolean;
  reason?: string;
  character?: CharacterSummaryPayload;
  sessionToken?: string;
}

export interface CharacterCreateResultPayload {
  ok: boolean;
  reason?: string;
  character?: CharacterSummaryPayload;
  sessionToken?: string;
}

export interface OwnershipErrorPayload {
  code: string;
  message: string;
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
  clientSentAtMs?: number;
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

export type NPCActivityState =
  | "idle"
  | "wandering"
  | "working"
  | "guarding"
  | "fleeing"
  | "attacking";

export type NPCWorkRole =
  | "blacksmith"
  | "farmer"
  | "merchant"
  | "guard"
  | "healer"
  | "scholar"
  | "tavern_keeper"
  | "fisherman"
  | "woodcutter"
  | "miner"
  | "craftsman"
  | "noble"
  | "citizen";

export type MonsterArchetype = "beast" | "undead" | "elemental" | "demon" | "golem";

export interface NPCActivityEntry {
  entityId: string;
  name: string;
  activity: NPCActivityState;
  intentTargetId?: string;
  chunkKey: string;
  position: { x: number; y: number };
  facing?: number;
  movementIntent?: { x: number; y: number };
  statusTextKey?: string;
  workRole?: NPCWorkRole;
  monsterArchetype?: MonsterArchetype;
  activityHash: string;
  sourceTick: number;
}

export interface ActivityMemoryEvent {
  id: string;
  entityId: string;
  tick: number;
  eventType: string;
  fromActivity?: string;
  toActivity?: string;
  targetId?: string;
  data?: Record<string, unknown>;
}

export interface NPCActivitySnapshotPayload {
  serverTick: number;
  entries: NPCActivityEntry[];
  memoryEvents: ActivityMemoryEvent[];
  entityCount: number;
  snapshotHash: string;
}

export type CausalCatchupEventType =
  | "resource_depleted"
  | "market_price_changed"
  | "npc_activity_changed"
  | "quest_completed"
  | "combat_result"
  | "governance_action"
  | "legend_recorded";

export interface CausalCatchupEventPayload {
  eventId: string;
  type: CausalCatchupEventType;
  tick: number;
  significancePerMille: number;
  regionId: string;
  chunkKey: string;
  payloadHash: string;
  eventHash: string;
}

export interface CausalCatchupSummaryPayload {
  eventCount: number;
  firstTick: number | null;
  lastTick: number | null;
  events: CausalCatchupEventPayload[];
  summaryHash: string;
  sideChannelOnly: true;
}

export interface ClientEnvelope<TType extends ClientMessageType, TPayload> {
  type: TType;
  payload: TPayload;
  t: number;
  protocolVersion: typeof ARELORIA_PROTOCOL_VERSION;
}

export interface ServerEnvelope<TType extends ServerMessageType | unknown, TPayload> {
  type: TType;
  payload: TPayload;
  t?: number;
  protocolVersion?: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
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

export function isServerHeartbeatPayload(value: unknown): value is ServerHeartbeatPayload {
  return isRecord(value) && typeof value.serverTimeMs === "number";
}

export function isInventorySnapshotPayload(value: unknown): value is InventorySnapshotPayload {
  return isRecord(value) && Array.isArray(value.slots);
}

export function isEquipmentSnapshotPayload(value: unknown): value is EquipmentSnapshotPayload {
  return isRecord(value) && isRecord(value.slots);
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
  return isRecord(value) && typeof value.centerChunkId === "string" && Array.isArray(value.chunks);
}

export function isSkillResultPayload(value: unknown): value is SkillResultPayload {
  return isRecord(value) && typeof value.ok === "boolean" && typeof value.skillId === "string";
}

export function isServerErrorPayload(value: unknown): value is ServerErrorPayload {
  return isRecord(value) && typeof value.code === "string" && typeof value.message === "string";
}

export function isChunkSnapshotPayload(value: unknown): value is ChunkSnapshotPayload {
  return (
    isRecord(value) &&
    typeof value.chunkId === "string" &&
    typeof value.serverTick === "number" &&
    Array.isArray(value.tiles)
  );
}

export function isCharacterListPayload(value: unknown): value is CharacterListPayload {
  return isRecord(value) && Array.isArray(value.characters);
}

export function isCharacterSelectResultPayload(value: unknown): value is CharacterSelectResultPayload {
  return isRecord(value) && typeof value.ok === "boolean";
}

export function isCharacterCreateResultPayload(value: unknown): value is CharacterCreateResultPayload {
  return isRecord(value) && typeof value.ok === "boolean";
}

export function isOwnershipErrorPayload(value: unknown): value is OwnershipErrorPayload {
  return isRecord(value) && typeof value.code === "string" && typeof value.message === "string";
}

function isCausalCatchupEventPayload(value: unknown): value is CausalCatchupEventPayload {
  return (
    isRecord(value) &&
    typeof value.eventId === "string" &&
    typeof value.type === "string" &&
    typeof value.tick === "number" &&
    typeof value.significancePerMille === "number" &&
    typeof value.regionId === "string" &&
    typeof value.chunkKey === "string" &&
    typeof value.payloadHash === "string" &&
    typeof value.eventHash === "string"
  );
}

export function isCausalCatchupSummaryPayload(value: unknown): value is CausalCatchupSummaryPayload {
  return (
    isRecord(value) &&
    typeof value.eventCount === "number" &&
    isNullableNumber(value.firstTick) &&
    isNullableNumber(value.lastTick) &&
    Array.isArray(value.events) &&
    value.events.every(isCausalCatchupEventPayload) &&
    typeof value.summaryHash === "string" &&
    value.sideChannelOnly === true
  );
}

export function isNPCActivitySnapshotPayload(value: unknown): value is NPCActivitySnapshotPayload {
  if (!isRecord(value)) return false;

  if (typeof value.serverTick !== "number") return false;
  if (!Array.isArray(value.entries)) return false;
  if (!Array.isArray(value.memoryEvents)) return false;
  if (typeof value.entityCount !== "number") return false;
  if (typeof value.snapshotHash !== "string") return false;

  for (const entry of value.entries) {
    if (!isRecord(entry)) return false;
    if (typeof entry.entityId !== "string") return false;
    if (typeof entry.name !== "string") return false;
    if (typeof entry.activity !== "string") return false;
    if (typeof entry.chunkKey !== "string") return false;
    if (!isRecord(entry.position)) return false;
    if (typeof entry.position.x !== "number") return false;
    if (typeof entry.position.y !== "number") return false;
    if (typeof entry.activityHash !== "string") return false;
    if (typeof entry.sourceTick !== "number") return false;
  }

  return true;
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
