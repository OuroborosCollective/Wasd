import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { loadRegionalWorkOrdersFromGameData } from "./WorkOrderGameData.js";
import type {
  RegionalWorkOrderDefinition,
  RegionalWorkOrderGameData,
  WorkOrderContributionResult,
  WorkOrderProgressState,
  WorkOrderSnapshot,
} from "./WorkOrderTypes.js";

function normalizeTick(value: unknown): number {
  const tick = Number(value ?? 0);
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : 0;
}

function normalizeQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, quantity);
}

function snapshotHash(input: WorkOrderSnapshot): string {
  return stableHash32([
    "WORK_ORDER_SNAPSHOT_V1",
    input.workOrderId,
    input.regionId,
    input.itemId,
    input.deliveredCount,
    input.requiredCount,
    input.remainingCount,
    input.completed ? 1 : 0,
    input.completedTick ?? 0,
    input.unlocks.join(","),
  ].join("|")).toString(16);
}

function contributionHash(input: {
  readonly playerId: string;
  readonly workOrderId: string;
  readonly itemId: string;
  readonly deliveredCount: number;
  readonly totalDeliveredCount: number;
  readonly currentTick: number;
  readonly completed: boolean;
}): string {
  return stableHash32([
    "WORK_ORDER_CONTRIBUTION_V1",
    input.playerId,
    input.workOrderId,
    input.itemId,
    input.deliveredCount,
    input.totalDeliveredCount,
    input.currentTick,
    input.completed ? 1 : 0,
  ].join("|")).toString(16);
}

export class WorkOrderStore {
  private readonly definitions = new Map<string, RegionalWorkOrderDefinition>();
  private readonly progress = new Map<string, WorkOrderProgressState>();

  constructor(private readonly gameData: RegionalWorkOrderGameData = loadRegionalWorkOrdersFromGameData()) {
    for (const order of gameData.workOrders) {
      this.definitions.set(order.id, order);
      this.progress.set(order.id, Object.freeze({ workOrderId: order.id, deliveredCount: 0 }));
    }
  }

  listDefinitions(): readonly RegionalWorkOrderDefinition[] {
    return Object.freeze([...this.definitions.values()].sort((a, b) => a.id.localeCompare(b.id)));
  }

  getDefinition(workOrderId: string): RegionalWorkOrderDefinition | undefined {
    return this.definitions.get(workOrderId);
  }

  getGameData(): RegionalWorkOrderGameData {
    return this.gameData;
  }

  getProgress(workOrderId: string): WorkOrderProgressState | null {
    const progress = this.progress.get(workOrderId);
    return progress ? Object.freeze({ ...progress }) : null;
  }

  getSnapshot(workOrderId: string, currentTick: number): WorkOrderSnapshot | null {
    const definition = this.definitions.get(workOrderId);
    if (!definition) return null;

    const progress = this.progress.get(workOrderId) ?? { workOrderId, deliveredCount: 0 };
    const deliveredCount = Math.min(definition.requiredCount, Math.max(0, Math.floor(progress.deliveredCount)));
    const remainingCount = Math.max(0, definition.requiredCount - deliveredCount);
    const completed = remainingCount === 0;
    const progressPermille = Math.min(1000, Math.floor((deliveredCount * 1000) / definition.requiredCount));
    const completedTick = progress.completedTick ?? (completed ? normalizeTick(currentTick) : undefined);

    const base = Object.freeze({
      workOrderId: definition.id,
      title: definition.title,
      regionId: definition.regionId,
      npcId: definition.npcId,
      itemId: definition.itemId,
      requiredCount: definition.requiredCount,
      deliveredCount,
      remainingCount,
      rewardGold: definition.rewardGold,
      rewardXp: definition.rewardXp,
      rewardSkillId: definition.rewardSkillId,
      completed,
      progressPermille,
      unlocks: definition.unlocks,
      ...(completedTick !== undefined ? { completedTick } : {}),
      ...(progress.completionHash ? { completionHash: progress.completionHash } : {}),
    }) as Omit<WorkOrderSnapshot, "snapshotHash">;

    return Object.freeze({ ...base, snapshotHash: snapshotHash({ ...base, snapshotHash: "" }) });
  }

  listSnapshots(currentTick: number): readonly WorkOrderSnapshot[] {
    return Object.freeze(this.listDefinitions()
      .map((order) => this.getSnapshot(order.id, currentTick))
      .filter((snapshot): snapshot is WorkOrderSnapshot => Boolean(snapshot))
      .sort((a, b) => a.workOrderId.localeCompare(b.workOrderId)));
  }

  contribute(input: {
    readonly playerId: string;
    readonly workOrderId: string;
    readonly itemId: string;
    readonly quantity: number;
    readonly currentTick: number;
  }): WorkOrderContributionResult {
    const currentTick = normalizeTick(input.currentTick);
    if (!input.playerId || input.playerId === "anonymous") {
      return this.failure(input.playerId, input.workOrderId, currentTick, "invalid_player");
    }

    const definition = this.definitions.get(input.workOrderId);
    if (!definition) {
      return this.failure(input.playerId, input.workOrderId, currentTick, "invalid_order");
    }

    const quantity = normalizeQuantity(input.quantity);
    if (quantity <= 0) {
      return this.failure(input.playerId, input.workOrderId, currentTick, "invalid_quantity", definition);
    }

    if (input.itemId !== definition.itemId) {
      return this.failure(input.playerId, input.workOrderId, currentTick, "wrong_item", definition);
    }

    const previous = this.progress.get(definition.id) ?? { workOrderId: definition.id, deliveredCount: 0 };
    if (previous.completedTick !== undefined || previous.deliveredCount >= definition.requiredCount) {
      return this.failure(input.playerId, input.workOrderId, currentTick, "already_completed", definition);
    }

    const remaining = Math.max(0, definition.requiredCount - previous.deliveredCount);
    const deliveredCount = Math.min(quantity, remaining);
    const totalDeliveredCount = Math.min(definition.requiredCount, previous.deliveredCount + deliveredCount);
    const completed = totalDeliveredCount >= definition.requiredCount;
    const hash = contributionHash({
      playerId: input.playerId,
      workOrderId: definition.id,
      itemId: definition.itemId,
      deliveredCount,
      totalDeliveredCount,
      currentTick,
      completed,
    });

    this.progress.set(definition.id, Object.freeze({
      workOrderId: definition.id,
      deliveredCount: totalDeliveredCount,
      ...(completed ? { completedTick: currentTick, completionHash: hash } : {}),
    }));

    return Object.freeze({
      ok: true,
      playerId: input.playerId,
      workOrderId: definition.id,
      itemId: definition.itemId,
      deliveredCount,
      totalDeliveredCount,
      remainingCount: Math.max(0, definition.requiredCount - totalDeliveredCount),
      completed,
      rewardGold: completed ? definition.rewardGold : 0,
      rewardXp: completed ? definition.rewardXp : 0,
      rewardApplied: false,
      currentTick,
      contributionHash: hash,
      reason: completed ? "completed" : "delivered",
    });
  }

  replaceProgress(progress: readonly WorkOrderProgressState[]): void {
    this.progress.clear();
    for (const order of this.definitions.values()) {
      this.progress.set(order.id, Object.freeze({ workOrderId: order.id, deliveredCount: 0 }));
    }
    for (const entry of progress) {
      if (!this.definitions.has(entry.workOrderId)) continue;
      const definition = this.definitions.get(entry.workOrderId)!;
      this.progress.set(entry.workOrderId, Object.freeze({
        workOrderId: entry.workOrderId,
        deliveredCount: Math.min(definition.requiredCount, normalizeQuantity(entry.deliveredCount)),
        ...(entry.completedTick !== undefined ? { completedTick: normalizeTick(entry.completedTick) } : {}),
        ...(entry.completionHash ? { completionHash: entry.completionHash } : {}),
      }));
    }
  }

  clearForTests(): void {
    this.replaceProgress([]);
  }

  private failure(
    playerId: string,
    workOrderId: string,
    currentTick: number,
    reason: WorkOrderContributionResult["reason"],
    definition?: RegionalWorkOrderDefinition,
  ): WorkOrderContributionResult {
    const progress = definition ? this.progress.get(definition.id) : null;
    const delivered = progress?.deliveredCount ?? 0;
    return Object.freeze({
      ok: false,
      playerId,
      workOrderId,
      itemId: definition?.itemId,
      deliveredCount: 0,
      totalDeliveredCount: delivered,
      remainingCount: definition ? Math.max(0, definition.requiredCount - delivered) : 0,
      completed: definition ? delivered >= definition.requiredCount : false,
      rewardGold: 0,
      rewardXp: 0,
      rewardApplied: false,
      currentTick,
      reason,
    });
  }
}

export const workOrderStore = new WorkOrderStore();
