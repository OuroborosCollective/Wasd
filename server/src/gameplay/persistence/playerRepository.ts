/**
 * Phase 6: Player Repository
 * 
 * Handles player state persistence with memory fallback.
 * Integrates with the existing PersistenceDirector for actual saves,
 * providing a clean interface for the gameplay contract.
 */

import type { PersistedPlayer } from "./types.js";
import { persistenceDirector, type PlayerSnapshotCore } from "../../modules/persistence/PersistenceDirector.js";

export interface PlayerRepository {
  getPlayer(playerId: string): Promise<PersistedPlayer | null>;
  upsertPlayer(player: PersistedPlayer): Promise<void>;
}

/**
 * Memory-backed player repository for development/degraded mode.
 */
export function createMemoryPlayerRepository(): PlayerRepository {
  const players = new Map<string, PersistedPlayer>();

  return {
    async getPlayer(playerId) {
      return players.get(playerId) ?? null;
    },

    async upsertPlayer(player) {
      players.set(player.id, { ...player });
    }
  };
}

/**
 * Create default player state for new guests.
 */
export function createDefaultPlayer(playerId: string, displayName = "Guest"): PersistedPlayer {
  const now = Date.now();

  return {
    id: playerId,
    displayName,
    sceneId: "main",
    x: 256,
    y: 256,
    hp: 100,
    maxHp: 100,
    createdAtMs: now,
    updatedAtMs: now
  };
}

/**
 * Adapt existing PersistenceDirector for PlayerRepository interface.
 * Loads from existing player snapshot system.
 */
export function createPersistenceDirectorPlayerRepository(): PlayerRepository {
  return {
    async getPlayer(playerId) {
      try {
        const snapshot = await persistenceDirector.loadPlayerSnapshot(playerId);
        if (!snapshot) return null;

        return {
          id: snapshot.id,
          displayName: snapshot.characterName,
          sceneId: "main", // Legacy system doesn't track scene per player
          x: snapshot.kappaX,
          y: snapshot.kappaY,
          hp: snapshot.health,
          maxHp: snapshot.maxHealth,
          createdAtMs: Date.parse(snapshot.lastUpdated) || Date.now(),
          updatedAtMs: Date.now()
        };
      } catch (err) {
        console.warn(`[PlayerRepository] Failed to load player ${playerId}:`, err);
        return null;
      }
    },

    async upsertPlayer(player) {
      try {
        // Convert back to PlayerSnapshotCore for legacy backend
        const snapshot: PlayerSnapshotCore = {
          id: player.id,
          characterName: player.displayName,
          kappaX: player.x,
          kappaY: player.y,
          kappaZ: 0,
          skills: {},
          inventory: [],
          equipment: {},
          gold: 0,
          level: 1,
          health: player.hp,
          maxHealth: player.maxHp,
          mana: 25,
          maxMana: 25,
          stamina: 100,
          maxStamina: 100,
          xp: 0,
          quests: [],
          class: "",
          appearance: null,
          faction: "",
          civilization: "",
          dead: false,
          deathAt: 0,
          flags: {},
          lastUpdated: new Date(player.updatedAtMs).toISOString()
        };

        // Mark dirty - will be persisted on next tick flush
        persistenceDirector.markDirty(player.id);
      } catch (err) {
        console.warn(`[PlayerRepository] Failed to save player ${player.id}:`, err);
        throw err;
      }
    }
  };
}