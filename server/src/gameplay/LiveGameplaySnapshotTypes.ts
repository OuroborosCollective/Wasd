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

// Phase 3: Extended types for v2 snapshot
export interface LiveGameplayCooldownView {
  readonly id: string;
  readonly remainingTicks: number;
  readonly totalTicks: number;
}

export interface LiveGameplayCombatView {
  readonly hp: number;
  readonly maxHp: number;
  readonly stamina: number;
  readonly maxStamina: number;
  readonly targetId: string | null;
  readonly cooldowns: readonly LiveGameplayCooldownView[];
}

export interface LiveGameplayCraftingRecipeView {
  readonly recipeId: string;
  readonly outputItemId: string;
  readonly known: boolean;
}

export interface LiveGameplayCraftingJobView {
  readonly jobId: string;
  readonly recipeId: string;
  readonly startedAtTick: number;
  readonly completesAtTick: number;
}

export interface LiveGameplayCraftingView {
  readonly knownRecipes: readonly LiveGameplayCraftingRecipeView[];
  readonly activeCraft: LiveGameplayCraftingJobView | null;
}

export interface LiveGameplayReputationView {
  readonly factionId: string;
  readonly value: number;
}

export interface LiveGameplayFactionView {
  readonly guildId: string | null;
  readonly factionId: string | null;
  readonly reputation: readonly LiveGameplayReputationView[];
}

export interface LiveGameplayWorldView {
  readonly chunkId: string;
  readonly biomeId: string;
  readonly safeZone: boolean;
}

export interface LiveGameplaySnapshot {
  readonly schemaVersion: "live-gameplay-snapshot.v2";
  readonly playerId: string;
  readonly logicalIndex: number;
  readonly tickRateHz: 10;
  readonly tickMs: 100;
  readonly inventory: readonly LiveGameplayInventoryItem[];
  readonly equipment: readonly LiveGameplayEquipmentSlot[];
  readonly skills: readonly LiveGameplaySkillState[];
  readonly resourceNodes: readonly LiveGameplayResourceNode[];
  readonly combat: LiveGameplayCombatView;
  readonly crafting: LiveGameplayCraftingView;
  readonly faction: LiveGameplayFactionView;
  readonly world: LiveGameplayWorldView;
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