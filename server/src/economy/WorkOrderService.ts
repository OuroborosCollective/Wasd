import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import { getWalletService } from "./economyRuntime.js";
import { WorkOrderStore, workOrderStore } from "./WorkOrderStore.js";
import type { WorkOrderContributionResult, WorkOrderSnapshot } from "./WorkOrderTypes.js";

export interface WorkOrderServiceDeps {
  readonly getInventoryService?: typeof getInventoryService;
  readonly getWalletService?: typeof getWalletService;
  readonly getSkillProgressionService?: typeof getSkillProgressionService;
}

function normalizeTick(value: unknown): number {
  const tick = Number(value ?? 0);
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function normalizeQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, quantity);
}

export class WorkOrderService {
  constructor(
    private readonly store: WorkOrderStore = workOrderStore,
    private readonly deps: WorkOrderServiceDeps = {},
  ) {}

  listSnapshots(currentTick: number): readonly WorkOrderSnapshot[] {
    return this.store.listSnapshots(currentTick);
  }

  getSnapshot(workOrderId: string, currentTick: number): WorkOrderSnapshot | null {
    return this.store.getSnapshot(workOrderId, currentTick);
  }

  async deliver(input: {
    readonly playerId: string;
    readonly workOrderId: string;
    readonly quantity: number;
    readonly currentTick?: number;
  }): Promise<WorkOrderContributionResult> {
    const currentTick = normalizeTick(input.currentTick);
    const definition = this.store.getDefinition(input.workOrderId);
    const quantity = normalizeQuantity(input.quantity);

    if (!input.playerId || input.playerId === "anonymous") {
      return this.store.contribute({ playerId: input.playerId, workOrderId: input.workOrderId, itemId: definition?.itemId ?? "wood_log", quantity, currentTick });
    }

    if (!definition) {
      return this.store.contribute({ playerId: input.playerId, workOrderId: input.workOrderId, itemId: "wood_log", quantity, currentTick });
    }

    if (quantity <= 0) {
      return this.store.contribute({ playerId: input.playerId, workOrderId: input.workOrderId, itemId: definition.itemId, quantity, currentTick });
    }

    const before = this.store.getSnapshot(definition.id, currentTick);
    if (!before || before.completed) {
      return this.store.contribute({ playerId: input.playerId, workOrderId: definition.id, itemId: definition.itemId, quantity, currentTick });
    }

    const deliverQuantity = Math.min(quantity, before.remainingCount);
    const inventoryService = await (this.deps.getInventoryService ?? getInventoryService)();
    const hasItems = await inventoryService.hasItems({
      playerId: input.playerId,
      items: [{ itemId: definition.itemId, quantity: deliverQuantity }],
    });

    if (!hasItems) {
      return Object.freeze({
        ok: false,
        playerId: input.playerId,
        workOrderId: definition.id,
        itemId: definition.itemId,
        deliveredCount: 0,
        totalDeliveredCount: before.deliveredCount,
        remainingCount: before.remainingCount,
        completed: before.completed,
        rewardGold: 0,
        rewardXp: 0,
        rewardApplied: false,
        currentTick,
        reason: "missing_items",
      });
    }

    const removed = await inventoryService.removeItem({
      playerId: input.playerId,
      itemId: definition.itemId,
      quantity: deliverQuantity,
    });

    if (!removed.ok) {
      return Object.freeze({
        ok: false,
        playerId: input.playerId,
        workOrderId: definition.id,
        itemId: definition.itemId,
        deliveredCount: 0,
        totalDeliveredCount: before.deliveredCount,
        remainingCount: before.remainingCount,
        completed: before.completed,
        rewardGold: 0,
        rewardXp: 0,
        rewardApplied: false,
        currentTick,
        reason: "missing_items",
      });
    }

    const result = this.store.contribute({
      playerId: input.playerId,
      workOrderId: definition.id,
      itemId: definition.itemId,
      quantity: deliverQuantity,
      currentTick,
    });

    if (!result.ok) {
      await inventoryService.addItem({
        playerId: input.playerId,
        itemId: definition.itemId,
        quantity: deliverQuantity,
        origin: {
          uid: `workorder:${definition.id}:restore:${currentTick}:${before.deliveredCount}`,
          tick: currentTick,
          source: "system_delta",
          sourceHash: result.contributionHash ?? definition.id,
        },
      });
      return result;
    }

    if (!result.completed) return result;

    const walletService = await (this.deps.getWalletService ?? getWalletService)();
    if (definition.rewardGold > 0) {
      await walletService.addCoins({ playerId: input.playerId, amount: definition.rewardGold });
    }

    if (definition.rewardXp > 0) {
      const skillService = await (this.deps.getSkillProgressionService ?? getSkillProgressionService)();
      await skillService.applyEvent({
        type: "skill_xp_gain",
        playerId: input.playerId,
        skillId: definition.rewardSkillId,
        amount: definition.rewardXp,
        source: "quest_reward",
      });
    }

    return Object.freeze({
      ...result,
      rewardApplied: true,
    });
  }

  clearForTests(): void {
    this.store.clearForTests();
  }
}

export const workOrderService = new WorkOrderService();
