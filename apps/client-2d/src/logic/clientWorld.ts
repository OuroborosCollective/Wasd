import type { InputFrame, WorldSnapshot } from "../net/protocol";
import type { EntityState, WorldViewState } from "../world/entities";
import { cloneEntity } from "../world/entities";
import { applyPlayerInput } from "./playerController";

export interface ClientWorldOptions {
  localPlayerId?: string;
  spawnX: number;
  spawnY: number;
  playerSpeed: number;
}

export interface ClientWorld {
  readonly localPlayerId: string;
  spawnLocalPlayer(): void;
  setLocalPlayerId(id: string): void;
  applyInput(input: InputFrame, fixedDtSec: number): void;
  applySnapshot(snapshot: WorldSnapshot): void;
  getViewState(): WorldViewState;
  getEntityCount(): number;
}

function createGuestPlayerId(): string {
  return `guest_${Math.random().toString(36).slice(2, 10)}`;
}

export function createClientWorld(options: ClientWorldOptions): ClientWorld {
  let localPlayerId = options.localPlayerId ?? createGuestPlayerId();
  let tickId = 0;

  const entities = new Map<string, EntityState>();

  function ensureLocalPlayer(): EntityState {
    const existing = entities.get(localPlayerId);

    if (existing) return existing;

    const player: EntityState = {
      id: localPlayerId,
      kind: "player",
      x: options.spawnX,
      y: options.spawnY,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      name: "Guest"
    };

    entities.set(localPlayerId, player);
    return player;
  }

  return {
    get localPlayerId() {
      return localPlayerId;
    },

    spawnLocalPlayer() {
      ensureLocalPlayer();

      if (!entities.has("npc_training_dummy")) {
        entities.set("npc_training_dummy", {
          id: "npc_training_dummy",
          kind: "npc",
          x: options.spawnX + 140,
          y: options.spawnY + 40,
          vx: 0,
          vy: 0,
          hp: 60,
          maxHp: 60,
          name: "Training Dummy"
        });
      }

      if (!entities.has("marker_spawn")) {
        entities.set("marker_spawn", {
          id: "marker_spawn",
          kind: "marker",
          x: options.spawnX,
          y: options.spawnY,
          vx: 0,
          vy: 0,
          name: "Spawn"
        });
      }
    },

    setLocalPlayerId(id) {
      if (!id || id === localPlayerId) return;

      const old = entities.get(localPlayerId);
      localPlayerId = id;

      if (old) {
        entities.delete(old.id);
        entities.set(id, {
          ...old,
          id,
          name: old.name ?? "Player"
        });
      }
    },

    applyInput(input, fixedDtSec) {
      tickId = input.tickId;

      const player = ensureLocalPlayer();
      const nextPlayer = applyPlayerInput(player, input, fixedDtSec, {
        speedUnitsPerSecond: options.playerSpeed
      });

      entities.set(localPlayerId, nextPlayer);

      if (input.skill1) {
        const markerId = `skill_${input.tickId}`;

        entities.set(markerId, {
          id: markerId,
          kind: "marker",
          x: nextPlayer.x,
          y: nextPlayer.y,
          vx: 0,
          vy: 0,
          name: "Impact"
        });
      }

      for (const [id, entity] of entities) {
        if (id.startsWith("skill_")) {
          const createdTick = Number(id.replace("skill_", ""));
          if (Number.isFinite(createdTick) && tickId - createdTick > 8) {
            entities.delete(id);
          }
        }
      }
    },

    applySnapshot(snapshot) {
      for (const entity of snapshot.entities) {
        entities.set(entity.id, cloneEntity(entity));
      }
    },

    getViewState() {
      return {
        tickId,
        localPlayerId,
        entities: Array.from(entities.values()).map(cloneEntity)
      };
    },

    getEntityCount() {
      return entities.size;
    }
  };
}