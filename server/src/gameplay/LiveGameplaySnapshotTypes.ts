/**
 * LIVE GAMEPLAY SNAPSHOT TYPES
 *
 * Deterministic, server-authoritative snapshot types for ARELogic integration.
 * These types provide a stable contract for the 2D client.
 *
 * Rules:
 * - No Math.random() for gameplay values
 * - No Date.now() for gameplay state
 * - Empty arrays instead of undefined
 * - All arrays sorted deterministically by id
 */

export interface LiveGameplayInventoryItem {
  readonly itemId: string;
  readonly quantity: number;
}

export interface LiveGameplayEquipmentSlot {
  readonly slot: string;
  readonly itemId: string | null;
}

export interface LiveGameplaySkillState {
  readonly skillId: string;
  readonly xp: number;
  readonly level: number;
}

export interface LiveGameplayResourceNode {
  readonly nodeId: string;
  readonly resourceId: string;
  readonly skillId: string;
  readonly x: number;
  readonly y: number;
  readonly available: boolean;
}

export interface LiveGameplayWallet {
  readonly coin: number;
}

export interface LiveGameplaySnapshot {
  readonly schemaVersion: "live-gameplay-snapshot.v1";
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly tickRateHz: 10;
  readonly tickMs: 100;
  readonly inventory: readonly LiveGameplayInventoryItem[];
  readonly equipment: readonly LiveGameplayEquipmentSlot[];
  readonly skills: readonly LiveGameplaySkillState[];
  readonly resourceNodes: readonly LiveGameplayResourceNode[];
  readonly wallet: LiveGameplayWallet;
}

export interface GatherResult {
  readonly ok: boolean;
  readonly playerId: string;
  readonly nodeId: string;
  readonly resourceId: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly skillId: string;
  readonly xpGranted: number;
  readonly reason?: string;
}