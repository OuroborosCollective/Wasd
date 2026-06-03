import { envelope } from "./protocol";

export interface ServerEntity {
  id: string;
  kind: "player" | "npc" | "loot" | "marker";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp?: number;
  maxHp?: number;
  name?: string;
}

export interface GameplaySession {
  playerId: string;
  sceneId: string;
  serverTick: number;
  acknowledgedInputSeq: number;
  entities: Map<string, ServerEntity>;
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
    entities
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