import type { InputFrame, WorldSnapshot } from "../net/protocol";
import type { EntityState, WorldViewState } from "../world/entities";
import { cloneEntity } from "../world/entities";
import { applyPlayerInput } from "./playerController";
import { reconcileLocalEntity } from "./reconciliation";

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
  applySnapshot(snapshot: WorldSnapshot, pendingInputs?: InputFrame[], fixedDtSec?: number): void;
  getViewState(): WorldViewState;
  getEntityCount(): number;
  getTickId(): number;
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

  function applyInputToLocalPlayer(input: InputFrame, fixedDtSec: number): void {
    const player = ensureLocalPlayer();

    const nextPlayer = applyPlayerInput(player, input, fixedDtSec, {
      speedUnitsPerSecond: options.playerSpeed
    });

    entities.set(localPlayerId, nextPlayer);

    if (input.skill1) {
      const markerId = `skill_${input.sequenceId}`;

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
  }

  function cleanupTransientMarkers(): void {
    for (const [id] of entities) {
      if (id.startsWith("skill_")) {
        const seq = Number(id.replace("skill_", ""));

        if (Number.isFinite(seq) && seq < tickId - 20) {
          entities.delete(id);
        }
      }
    }
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
      applyInputToLocalPlayer(input, fixedDtSec);
      cleanupTransientMarkers();
    },

    applySnapshot(snapshot, pendingInputs = [], fixedDtSec = 0.1) {
      tickId = Math.max(tickId, snapshot.serverTick);

      if (snapshot.localPlayerId) {
        this.setLocalPlayerId(snapshot.localPlayerId);
      }

      const localBefore = entities.get(localPlayerId);

      for (const serverEntity of snapshot.entities) {
        if (serverEntity.id === localPlayerId && localBefore) {
          entities.set(
            localPlayerId,
            reconcileLocalEntity(localBefore, cloneEntity(serverEntity))
          );
        } else {
          entities.set(serverEntity.id, cloneEntity(serverEntity));
        }
      }

      for (const input of pendingInputs) {
        applyInputToLocalPlayer(input, fixedDtSec);
      }

      cleanupTransientMarkers();
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
    },

    getTickId() {
      return tickId;
    }
  };
}