/**
 * Phase 6: Gameplay Persistence Facade
 *
 * Unified interface for server-authoritative gameplay persistence.
 * Integrates with existing PersistenceDirector and provides memory fallback.
 *
 * Server authoritative rules:
 * 1. Server remains authoritative over all client state
 * 2. Client never directly persists gameplay state
 * 3. Persistence writes only server-confirmed states
 * 4. DB errors degrade gracefully without crashing WebSocket
 * 5. Server can run without DB in memory fallback mode
 */

import {
  createDefaultPlayer,
  createMemoryPlayerRepository,
  createPersistenceDirectorPlayerRepository,
  type PlayerRepository
} from "./playerRepository.js";
import {
  createMemoryInventoryRepository,
  type InventoryRepository
} from "./inventoryRepository.js";
import {
  createMemoryEquipmentRepository,
  type EquipmentRepository
} from "./equipmentRepository.js";
import {
  createMemoryQuestRepository,
  type QuestRepository
} from "./questRepository.js";
import {
  createMemoryWorldEntityRepository,
  type WorldEntityRepository
} from "./worldEntityRepository.js";
import {
  createMemorySessionRepository,
  type SessionRepository
} from "./sessionRepository.js";
import type {
  GameplayPersistenceStatus,
  PersistedInventorySlot,
  PersistedPlayer,
  PersistedWorldEntity
} from "./types.js";

const PERSISTENCE_TICK_MS = 100;

type TickStamped = { currentTick?: number; tick?: number };

function tickMs(input: TickStamped, fallbackMs = 0): number {
  const raw = input.currentTick ?? input.tick;
  if (!Number.isFinite(raw) || Number(raw) < 0) return fallbackMs;
  return Math.trunc(Number(raw)) * PERSISTENCE_TICK_MS;
}

export interface GameplayPersistence {
  status(): GameplayPersistenceStatus;

  players: PlayerRepository;
  inventory: InventoryRepository;
  equipment: EquipmentRepository;
  quests: QuestRepository;
  worldEntities: WorldEntityRepository;
  sessions: SessionRepository;

  loadOrCreatePlayer(playerId: string, displayName?: string, currentTick?: number): Promise<PersistedPlayer>;
  savePlayerFromEntity(entity: {
    id: string;
    x: number;
    y: number;
    hp?: number;
    maxHp?: number;
    name?: string;
    currentTick?: number;
    tick?: number;
  }): Promise<void>;

  saveInventorySnapshot(
    playerId: string,
    slots: Array<{ index: number; stack: { itemId: string; quantity: number } | null }>
  ): Promise<void>;

  saveWorldEntity(sceneId: string, entity: {
    id: string;
    kind: PersistedWorldEntity["kind"];
    x: number;
    y: number;
    vx: number;
    vy: number;
    hp?: number;
    maxHp?: number;
    name?: string;
    currentTick?: number;
    tick?: number;
  }): Promise<void>;
}

function shouldUseMemoryFallback(): boolean {
  const devMode = process.env.NODE_ENV !== "production";
  const forceMemory = process.env.FORCE_MEMORY_PERSISTENCE === "true";
  return devMode || forceMemory;
}

export function createGameplayPersistence(): GameplayPersistence {
  const useMemory = shouldUseMemoryFallback();

  const players: PlayerRepository = useMemory
    ? createMemoryPlayerRepository()
    : createPersistenceDirectorPlayerRepository();

  const inventory = createMemoryInventoryRepository();
  const equipment = createMemoryEquipmentRepository();
  const quests = createMemoryQuestRepository();
  const worldEntities = createMemoryWorldEntityRepository();
  const sessions = createMemorySessionRepository();

  return {
    status() {
      return {
        enabled: true,
        mode: useMemory ? "memory" : "database",
        healthy: true,
        reason: useMemory
          ? "Using in-memory persistence fallback (dev mode or DB unavailable)"
          : "Using PersistenceDirector backend"
      };
    },

    players,
    inventory,
    equipment,
    quests,
    worldEntities,
    sessions,

    async loadOrCreatePlayer(playerId, displayName = "Guest", currentTick = 0) {
      const existing = await players.getPlayer(playerId);

      if (existing) return existing;

      const created = createDefaultPlayer(playerId, displayName, currentTick);
      await players.upsertPlayer(created);

      return created;
    },

    async savePlayerFromEntity(entity) {
      const existing = await players.getPlayer(entity.id);
      const updatedAtMs = tickMs(entity, existing?.updatedAtMs ?? 0);

      await players.upsertPlayer({
        id: entity.id,
        displayName: entity.name ?? existing?.displayName ?? "Guest",
        sceneId: existing?.sceneId ?? "main",
        x: entity.x,
        y: entity.y,
        hp: entity.hp ?? existing?.hp ?? 100,
        maxHp: entity.maxHp ?? existing?.maxHp ?? 100,
        createdAtMs: existing?.createdAtMs ?? updatedAtMs,
        updatedAtMs
      });
    },

    async saveInventorySnapshot(playerId, slots) {
      const persistedSlots: PersistedInventorySlot[] = slots.map((slot) => ({
        playerId,
        index: slot.index,
        itemId: slot.stack?.itemId ?? null,
        quantity: slot.stack?.quantity ?? 0
      }));

      await inventory.saveInventory(playerId, persistedSlots);
    },

    async saveWorldEntity(sceneId, entity) {
      await worldEntities.upsertEntity({
        ...entity,
        sceneId,
        updatedAtMs: tickMs(entity)
      });
    }
  };
}

let singleton: GameplayPersistence | null = null;

export function getGameplayPersistence(): GameplayPersistence {
  if (!singleton) {
    singleton = createGameplayPersistence();
  }
  return singleton;
}
