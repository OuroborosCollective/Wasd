/**
 * LIVE GAMEPLAY SNAPSHOT COMPOSER
 *
 * Deterministic, server-authoritative composition of gameplay snapshots.
 * Collects data from stores/services and produces stable snapshot output.
 *
 * Rules:
 * - No Math.random()
 * - No Date.now() for gameplay state
 * - All arrays sorted deterministically
 * - No mutation of source data
 */

import type {
  LiveGameplaySnapshot,
  LiveGameplayInventoryItem,
  LiveGameplayEquipmentSlot,
  LiveGameplaySkillState,
  LiveGameplayResourceNode,
  LiveGameplayCombatView,
  LiveGameplayCraftingView,
  LiveGameplayFactionView,
  LiveGameplayWorldView,
} from "./LiveGameplaySnapshotTypes.js";

// Phase 3: Extended deps for v2 snapshot
export interface LiveGameplaySnapshotComposerDeps {
  readonly getInventoryItems: (playerId: string) => readonly LiveGameplayInventoryItem[] | Promise<readonly LiveGameplayInventoryItem[]>;
  readonly getEquipmentSlots: (playerId: string) => readonly LiveGameplayEquipmentSlot[] | Promise<readonly LiveGameplayEquipmentSlot[]>;
  readonly getSkillStates: (playerId: string) => readonly LiveGameplaySkillState[] | Promise<readonly LiveGameplaySkillState[]>;
  readonly getResourceNodes: (playerId: string) => readonly LiveGameplayResourceNode[] | Promise<readonly LiveGameplayResourceNode[]>;
  readonly getCombatView: (playerId: string) => LiveGameplayCombatView | Promise<LiveGameplayCombatView>;
  readonly getCraftingView: (playerId: string) => LiveGameplayCraftingView | Promise<LiveGameplayCraftingView>;
  readonly getFactionView: (playerId: string) => LiveGameplayFactionView | Promise<LiveGameplayFactionView>;
  readonly getWorldView: (playerId: string) => LiveGameplayWorldView | Promise<LiveGameplayWorldView>;
}

export class LiveGameplaySnapshotComposer {
  public constructor(private readonly deps: LiveGameplaySnapshotComposerDeps) {}

  public async compose(playerId: string, logicalIndex: number): Promise<LiveGameplaySnapshot> {
    const [
      inventory,
      equipment,
      skills,
      resourceNodes,
      combat,
      crafting,
      faction,
      world,
    ] = await Promise.all([
      this.deps.getInventoryItems(playerId),
      this.deps.getEquipmentSlots(playerId),
      this.deps.getSkillStates(playerId),
      this.deps.getResourceNodes(playerId),
      this.deps.getCombatView(playerId),
      this.deps.getCraftingView(playerId),
      this.deps.getFactionView(playerId),
      this.deps.getWorldView(playerId),
    ]);

    return Object.freeze({
      schemaVersion: "live-gameplay-snapshot.v2" as const,
      playerId,
      logicalIndex: this.safeIndex(logicalIndex),
      tickRateHz: 10 as const,
      tickMs: 100 as const,
      inventory: Object.freeze([...inventory].sort((a, b) => a.itemId.localeCompare(b.itemId))),
      equipment: Object.freeze([...equipment].sort((a, b) => a.slot.localeCompare(b.slot))),
      skills: Object.freeze([...skills].sort((a, b) => a.skillId.localeCompare(b.skillId))),
      resourceNodes: Object.freeze([...resourceNodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId))),
      combat: Object.freeze({
        ...combat,
        cooldowns: Object.freeze([...combat.cooldowns].sort((a, b) => a.id.localeCompare(b.id))),
      }),
      crafting: Object.freeze({
        knownRecipes: Object.freeze([...crafting.knownRecipes].sort((a, b) => a.recipeId.localeCompare(b.recipeId))),
        activeCraft: crafting.activeCraft ? Object.freeze({ ...crafting.activeCraft }) : null,
      }),
      faction: Object.freeze({
        ...faction,
        reputation: Object.freeze([...faction.reputation].sort((a, b) => a.factionId.localeCompare(b.factionId))),
      }),
      world: Object.freeze({ ...world }),
    });
  }

  private safeIndex(value: number): number {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }
}