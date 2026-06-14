/**
 * EQUIPMENT SERVICE
 *
 * Server-authoritative equipment service with staged inventory/equipment transactions.
 * Deterministic: No Date.now(), no Math.random().
 */

import { getInventoryService as defaultGetInventoryService, createPersistedPlayerInventoryState } from "../inventory/inventoryRuntime.js";
import type { InventoryService } from "../inventory/InventoryService.js";
import type { InventoryItemId, PlayerInventoryState } from "../inventory/InventoryTypes.js";
import { getSkillProgressionService as defaultGetSkillProgressionService } from "../skills/skillRuntime.js";
import type { PlayerSkillState } from "../skills/SkillTypes.js";
import {
  createPersistedPlayerEquipmentState,
  type EquipmentPersistenceAdapter,
} from "./EquipmentPersistence.js";
import {
  validateEquipmentRequirements,
  type UnmetEquipmentRequirement,
} from "./EquipmentRequirementValidator.js";
import { EquipmentStore } from "./EquipmentStore.js";
import {
  EQUIPMENT_DEFINITIONS,
  isEquipmentItemId,
  type EquipmentSlotId,
  type PlayerEquipmentState,
} from "./EquipmentTypes.js";
import {
  planEquipTransaction,
  planUnequipTransaction,
} from "./EquipmentTransactionPlanner.js";

export { createPersistedPlayerInventoryState as createPersistedInventoryState };

export interface InventoryServiceLike {
  getPlayerInventory(playerId: string): Promise<PlayerInventoryState>;
  persistInventory(playerId: string, state: PlayerInventoryState): Promise<void>;
  replacePlayerInventory(playerId: string, state: PlayerInventoryState): void | Promise<void>;
}

export interface SkillServiceLike {
  getPlayerSkillState(playerId: string): Promise<PlayerSkillState>;
}

export interface AtomicEquipResult {
  ok: boolean;
  playerId: string;
  itemId: string;
  reason?: "equipped" | "invalid_item" | "item_not_owned" | "invalid_player" | "inventory_full" | "requirements_not_met";
  unequippedItemId?: string;
  unmetRequirements?: readonly UnmetEquipmentRequirement[];
  equipment?: PlayerEquipmentState;
  inventoryDelta?: { itemId: InventoryItemId; delta: number };
}

export interface AtomicUnequipResult {
  ok: boolean;
  playerId: string;
  slotId: EquipmentSlotId;
  reason?: "unequipped" | "slot_empty" | "invalid_player" | "inventory_full";
  unequippedItemId?: string;
  equipment?: PlayerEquipmentState;
  inventoryDelta?: { itemId: InventoryItemId; delta: number };
}

export class EquipmentService {
  private readonly hydratedPlayers = new Set<string>();
  private readonly getInventoryService: () => Promise<InventoryServiceLike>;
  private readonly getSkillService: () => Promise<SkillServiceLike>;

  constructor(
    private readonly store: EquipmentStore,
    private readonly persistence: EquipmentPersistenceAdapter,
    getInventoryService?: () => Promise<InventoryServiceLike>,
    getSkillService?: () => Promise<SkillServiceLike>,
  ) {
    this.getInventoryService = getInventoryService ?? defaultGetInventoryService;
    this.getSkillService = getSkillService ?? defaultGetSkillProgressionService;
  }

  async getPlayerEquipment(playerId: string): Promise<PlayerEquipmentState> {
    await this.hydratePlayer(playerId);
    return this.store.getPlayerEquipment(playerId);
  }

  async equipItem(input: {
    playerId: string;
    itemId: string;
  }): Promise<AtomicEquipResult> {
    const { playerId, itemId } = input;

    if (!playerId || playerId === "anonymous") {
      return { ok: false, playerId, itemId, reason: "invalid_player" };
    }

    if (!isEquipmentItemId(itemId)) {
      return { ok: false, playerId, itemId, reason: "invalid_item" };
    }

    const itemDefinition = EQUIPMENT_DEFINITIONS[itemId];
    const requirements = itemDefinition.requirements ?? [];

    if (requirements.length > 0) {
      const skillService = await this.getSkillService();
      const skillState = await skillService.getPlayerSkillState(playerId);
      const requirementResult = validateEquipmentRequirements(itemDefinition, skillState);

      if (!requirementResult.ok) {
        return {
          ok: false,
          playerId,
          itemId,
          reason: "requirements_not_met",
          unmetRequirements: requirementResult.unmet,
        };
      }
    }

    await this.hydratePlayer(playerId);

    const inventoryService = await this.getInventoryService();
    const currentInventory = await inventoryService.getPlayerInventory(playerId);
    const currentEquipment = this.store.getPlayerEquipment(playerId);
    const targetSlotId = itemDefinition.slotId;
    const slotWasOccupied = currentEquipment.slots.some((slot) => slot.slotId === targetSlotId);

    const planned = planEquipTransaction({
      playerId,
      itemId,
      inventory: currentInventory,
      equipment: currentEquipment,
    });

    if (!planned) {
      return { ok: false, playerId, itemId, reason: slotWasOccupied ? "inventory_full" : "item_not_owned" };
    }

    await this.commitStagedStates({
      playerId,
      inventoryService,
      currentInventory,
      nextInventory: planned.nextInventory,
      nextEquipment: planned.nextEquipment,
    });

    return {
      ok: true,
      playerId,
      itemId,
      reason: "equipped",
      unequippedItemId: planned.replacedItemId,
      equipment: planned.nextEquipment,
      inventoryDelta: { itemId, delta: -1 },
    };
  }

  async unequipItem(input: {
    playerId: string;
    slotId: EquipmentSlotId;
  }): Promise<AtomicUnequipResult> {
    const { playerId, slotId } = input;

    if (!playerId || playerId === "anonymous") {
      return { ok: false, playerId, slotId, reason: "invalid_player" };
    }

    await this.hydratePlayer(playerId);

    const inventoryService = await this.getInventoryService();
    const currentInventory = await inventoryService.getPlayerInventory(playerId);
    const currentEquipment = this.store.getPlayerEquipment(playerId);
    const slotExists = currentEquipment.slots.some((slot) => slot.slotId === slotId);

    if (!slotExists) {
      return { ok: false, playerId, slotId, reason: "slot_empty" };
    }

    const planned = planUnequipTransaction({
      playerId,
      slotId,
      inventory: currentInventory,
      equipment: currentEquipment,
    });

    if (!planned) {
      return { ok: false, playerId, slotId, reason: "inventory_full" };
    }

    await this.commitStagedStates({
      playerId,
      inventoryService,
      currentInventory,
      nextInventory: planned.nextInventory,
      nextEquipment: planned.nextEquipment,
    });

    return {
      ok: true,
      playerId,
      slotId,
      reason: "unequipped",
      unequippedItemId: planned.removedItemId,
      equipment: planned.nextEquipment,
      inventoryDelta: { itemId: planned.removedItemId, delta: +1 },
    };
  }

  async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadPlayerEquipment(playerId);
    if (persisted) {
      this.store.replacePlayerEquipment(playerId, persisted);
    }

    this.hydratedPlayers.add(playerId);
  }

  clearForTests(): void {
    this.hydratedPlayers.clear();
  }

  private async commitStagedStates(input: {
    playerId: string;
    inventoryService: InventoryServiceLike;
    currentInventory: PlayerInventoryState;
    nextInventory: PlayerInventoryState;
    nextEquipment: PlayerEquipmentState;
  }): Promise<void> {
    let inventoryPersisted = false;

    try {
      await input.inventoryService.persistInventory(input.playerId, input.nextInventory);
      inventoryPersisted = true;
      await this.persistence.savePlayerEquipment(
        createPersistedPlayerEquipmentState(input.playerId, input.nextEquipment),
      );
    } catch (error) {
      if (inventoryPersisted) {
        await input.inventoryService.persistInventory(input.playerId, input.currentInventory).catch(() => undefined);
      }
      throw error;
    }

    await input.inventoryService.replacePlayerInventory(input.playerId, input.nextInventory);
    this.store.replacePlayerEquipment(input.playerId, input.nextEquipment);
  }
}

export type { PlayerEquipmentState, EquipmentSlotId };
export type EquipItemResult = AtomicEquipResult;
export type UnequipItemResult = AtomicUnequipResult;
