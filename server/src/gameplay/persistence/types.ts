/**
 * Phase 6: Durable Gameplay Persistence Types
 * 
 * Defines the data structures for server-authoritative persistence
 * of gameplay state (players, inventory, equipment, quests, world entities, sessions).
 * 
 * These types complement the existing PersistenceDirector and are used
 * by the GameplayPersistence facade for the Protocol v5 gameplay contract.
 */

export type ServerEntityKind = "player" | "npc" | "loot" | "marker";

export interface PersistedPlayer {
  id: string;
  displayName: string;
  sceneId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface PersistedInventorySlot {
  playerId: string;
  index: number;
  itemId: string | null;
  quantity: number;
}

export interface PersistedEquipmentSlot {
  playerId: string;
  slot: "weapon" | "armor" | "trinket";
  itemId: string | null;
}

export interface PersistedQuestProgress {
  playerId: string;
  questId: string;
  status: "locked" | "available" | "active" | "completed";
  tracked: boolean;
  objectivesJson: string;
  updatedAtMs: number;
}

export interface PersistedWorldEntity {
  id: string;
  sceneId: string;
  kind: "player" | "npc" | "loot" | "marker";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp?: number;
  maxHp?: number;
  name?: string;
  dataJson?: string;
  updatedAtMs: number;
}

export interface PersistedSession {
  id: string;
  playerId: string;
  sceneId: string;
  lastSeenAtMs: number;
}

export interface GameplayPersistenceStatus {
  enabled: boolean;
  mode: "database" | "memory";
  healthy: boolean;
  reason?: string;
}