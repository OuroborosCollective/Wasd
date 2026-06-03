import { envelope } from "./protocol.js";
import { getGameplayPersistence, createGameplayPersistence } from "./persistence/gameplayPersistence.js";
import { createDefaultPlayer } from "./persistence/playerRepository.js";
import type { ServerEntityKind } from "./persistence/types.js";

export type { ServerEntityKind };
export { createDefaultPlayer };

export interface ServerEntity {
  id: string;
  kind: ServerEntityKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp?: number;
  maxHp?: number;
  name?: string;
}

export interface ServerInputFrame {
  sequenceId: number;
  tickId: number;
  moveX: number;
  moveY: number;
  primary: boolean;
  skill1: boolean;
  clientTimeMs?: number;
}

export interface GameplaySession {
  playerId: string;
  sceneId: string;
  serverTick: number;
  acknowledgedInputSeq: number;
  entities: Map<string, ServerEntity>;
  skillCooldowns: Map<string, number>;
}

function clampAxis(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);

  if (len <= 0.0001) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / len,
    y: y / len
  };
}

export function createGameplaySession(playerId: string): GameplaySession {
  const entities = new Map<string, ServerEntity>();

  entities.set(playerId, {
    id: playerId,
    kind: "player",
    x: 256,
    y: 256,
    vx: 0,
    vy: 0,
    hp: 100,
    maxHp: 100,
    name: "Guest"
  });

  entities.set("npc_elder", {
    id: "npc_elder",
    kind: "npc",
    x: 360,
    y: 260,
    vx: 0,
    vy: 0,
    hp: 100,
    maxHp: 100,
    name: "Town Elder"
  });

  entities.set("loot_demo_1", {
    id: "loot_demo_1",
    kind: "loot",
    x: 300,
    y: 300,
    vx: 0,
    vy: 0,
    name: "Small Health Potion"
  });

  return {
    playerId,
    sceneId: "main",
    serverTick: 0,
    acknowledgedInputSeq: 0,
    entities,
    skillCooldowns: new Map()
  };
}

export function makeWelcome(session: GameplaySession) {
  return envelope("welcome", {
    playerId: session.playerId,
    sceneId: session.sceneId,
    serverTick: session.serverTick,
    protocolVersion: 5
  });
}

export function makeWorldSnapshot(session: GameplaySession) {
  return envelope("world_snapshot", {
    protocolVersion: 5,
    serverTick: session.serverTick,
    acknowledgedInputSeq: session.acknowledgedInputSeq,
    localPlayerId: session.playerId,
    receivedAtMs: 0,
    entities: Array.from(session.entities.values())
  });
}

export function applyInputFrame(
  session: GameplaySession,
  raw: unknown,
  fixedDtSec = 0.1
): boolean {
  if (typeof raw !== "object" || raw === null) return false;

  const payload = raw as Partial<ServerInputFrame>;

  if (
    typeof payload.sequenceId !== "number" ||
    typeof payload.tickId !== "number"
  ) {
    return false;
  }

  const player = session.entities.get(session.playerId);

  if (!player) return false;

  const moveX = clampAxis(payload.moveX);
  const moveY = clampAxis(payload.moveY);
  const dir = normalize(moveX, moveY);

  const speed = 140;

  player.vx = dir.x * speed;
  player.vy = dir.y * speed;
  player.x += player.vx * fixedDtSec;
  player.y += player.vy * fixedDtSec;

  session.serverTick = Math.max(session.serverTick + 1, payload.tickId);
  session.acknowledgedInputSeq = Math.max(
    session.acknowledgedInputSeq,
    payload.sequenceId
  );

  return true;
}

export function distanceToEntity(
  session: GameplaySession,
  entityId: string
): number {
  const player = session.entities.get(session.playerId);
  const entity = session.entities.get(entityId);

  if (!player || !entity) return Number.POSITIVE_INFINITY;

  return Math.hypot(entity.x - player.x, entity.y - player.y);
}

export function removeEntity(
  session: GameplaySession,
  entityId: string
): boolean {
  return session.entities.delete(entityId);
}

/**
 * Create a gameplay session from persistence.
 * Loads player state and world entities, or creates defaults for new players.
 */
export async function createGameplaySessionFromPersistence(
  playerId: string,
  displayName = "Guest"
): Promise<GameplaySession> {
  const persistence = getGameplayPersistence();
  const player = await persistence.loadOrCreatePlayer(playerId, displayName);

  const session = createGameplaySession(player.id);
  session.sceneId = player.sceneId;

  const playerEntity = session.entities.get(player.id);

  if (playerEntity) {
    playerEntity.x = player.x;
    playerEntity.y = player.y;
    playerEntity.hp = player.hp;
    playerEntity.maxHp = player.maxHp;
    playerEntity.name = player.displayName;
  }

  // Load persisted world entities for this scene
  const persistedEntities = await persistence.worldEntities.getSceneEntities(player.sceneId);

  for (const entity of persistedEntities) {
    if (entity.id === player.id) continue;

    session.entities.set(entity.id, {
      id: entity.id,
      kind: entity.kind,
      x: entity.x,
      y: entity.y,
      vx: entity.vx,
      vy: entity.vy,
      hp: entity.hp,
      maxHp: entity.maxHp,
      name: entity.name
    });
  }

  return session;
}

/**
 * Save the player entity from a session to persistence.
 * Called periodically or on disconnect.
 */
export async function saveSessionPlayer(session: GameplaySession): Promise<void> {
  const player = session.entities.get(session.playerId);

  if (!player) return;

  await getGameplayPersistence().savePlayerFromEntity({
    id: player.id,
    x: player.x,
    y: player.y,
    hp: player.hp,
    maxHp: player.maxHp,
    name: player.name
  });
}

/**
 * Save world entities from a session to persistence.
 * Called periodically or on significant world state changes.
 */
export async function saveSessionWorldEntities(session: GameplaySession): Promise<void> {
  const persistence = getGameplayPersistence();

  for (const entity of session.entities.values()) {
    // Don't persist player entity position (saved separately)
    if (entity.kind === "player") continue;

    await persistence.saveWorldEntity(session.sceneId, {
      id: entity.id,
      kind: entity.kind,
      x: entity.x,
      y: entity.y,
      vx: entity.vx,
      vy: entity.vy,
      hp: entity.hp,
      maxHp: entity.maxHp,
      name: entity.name
    });
  }
}