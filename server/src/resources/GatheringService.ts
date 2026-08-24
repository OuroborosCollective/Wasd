import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { SkillProgressionService } from "../skills/SkillProgressionService.js";
import type { PlayerSkillState, SkillSnapshot } from "../skills/SkillTypes.js";
import type { ResourceGatherMutationSnapshot, ResourceNodeStore } from "./ResourceNodeStore.js";
import { resourceNodeStore } from "./ResourceNodeStore.js";
import type { GatherResourceResult, RequiredToolSlot, ResourceNodeSnapshot } from "./ResourceTypes.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import type { InventoryService } from "../inventory/InventoryService.js";
import type { InventoryItemOrigin, PlayerInventoryState } from "../inventory/InventoryTypes.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { applyPermille, getGatheringToolBonus } from "../equipment/EquipmentBonus.js";
import { resourceEcologyService, type ResourceEcologyService } from "./ResourceEcologyService.js";
import { attachResourceEcologySnapshot, attachResourceEcologySnapshots } from "./ResourceEcologySnapshotAdapter.js";
import type { ResourceNodeEcologySnapshot, ResourceNodeEcologyState } from "./ResourceEcologyTypes.js";

function getMissingToolSlot(
  equipmentSlots: Array<{ slotId: string; itemId: string }>,
  requiredTool?: RequiredToolSlot,
): RequiredToolSlot | null {
  if (!requiredTool) return null;
  const hasTool = equipmentSlots.some((slot) => slot.slotId === requiredTool);
  return hasTool ? null : requiredTool;
}

function getSkillLevel(skills: SkillSnapshot[], skillId: string): number {
  return skills.find((skill) => skill.id === skillId)?.level ?? 1;
}

function cloneSkillState(state: PlayerSkillState): PlayerSkillState {
  return {
    playerId: state.playerId,
    schemaVersion: 2,
    skills: state.skills.map((skill) => ({ ...skill })),
  };
}

function cloneInventoryState(state: PlayerInventoryState): PlayerInventoryState {
  return {
    playerId: state.playerId,
    schemaVersion: 1,
    capacity: state.capacity,
    slots: state.slots.map((slot) => ({ ...slot })),
  };
}

export interface GatherInput {
  playerId: string;
  nodeId: string;
  playerPosition: { x: number; y: number };
  currentTick: number;
  inventoryOrigin?: InventoryItemOrigin;
  onItemReward?: (item: { id: string; name: string; quantity: number }) => void;
}

export interface ListSnapshotsOptions {
  currentTick: number;
  playerPosition?: { x: number; y: number };
}

interface GatheringDependencies {
  readonly getSkillService: () => Promise<SkillProgressionService>;
  readonly getInventoryService: () => Promise<InventoryService>;
  readonly equipment: Pick<typeof equipmentService, "getPlayerEquipment">;
}

interface GatherRollbackSnapshot {
  readonly playerId: string;
  readonly nodeId: string;
  readonly node: ResourceGatherMutationSnapshot;
  readonly ecology: ResourceNodeEcologyState | null;
  readonly skill: PlayerSkillState;
  readonly inventory: PlayerInventoryState;
  readonly appliedOriginUids: readonly string[];
  readonly movementEventCount: number;
}

const DEFAULT_DEPENDENCIES: GatheringDependencies = {
  getSkillService: getSkillProgressionService,
  getInventoryService,
  equipment: equipmentService,
};

export class GatheringService {
  private readonly nodeMutationQueues = new Map<string, Promise<void>>();

  constructor(
    private readonly nodes: ResourceNodeStore = resourceNodeStore,
    private readonly ecology: ResourceEcologyService = resourceEcologyService,
    private readonly dependencies: GatheringDependencies = DEFAULT_DEPENDENCIES,
  ) {}

  registerVisibleChunks(playerPosition: { x: number; y: number }): void {
    this.nodes.registerVisibleChunks(playerPosition);
  }

  getRegisteredChunkCount(): number {
    return this.nodes.getRegisteredChunkCount();
  }

  getTotalNodeCount(): number {
    return this.nodes.getTotalNodeCount();
  }

  async gather(input: GatherInput): Promise<GatherResourceResult> {
    return this.withNodeMutationLock(input.nodeId, () => this.gatherLocked(input));
  }

  private async gatherLocked(input: GatherInput): Promise<GatherResourceResult> {
    const { playerId, nodeId, playerPosition, currentTick, inventoryOrigin, onItemReward } = input;

    const skillService = await this.dependencies.getSkillService();
    const skillState = await skillService.getPlayerSkillState(playerId);

    const nodeSnapshot = this.nodes.getSnapshot(nodeId, currentTick);
    const playerSkillLevel = nodeSnapshot
      ? getSkillLevel(skillState.skills, nodeSnapshot.skillId)
      : 1;

    const ecologyBefore = this.attachEcology(nodeSnapshot, currentTick)?.ecology ?? null;
    if (ecologyBefore && ecologyBefore.currentStock <= 0) {
      return {
        ok: false,
        playerId,
        nodeId,
        reason: "node_depleted",
        snapshot: this.attachEcology(nodeSnapshot, currentTick),
      };
    }

    const equipment = await this.dependencies.equipment.getPlayerEquipment(playerId);
    const requiredTool = nodeSnapshot?.requiredTool;
    const missingTool = getMissingToolSlot(equipment.slots, requiredTool);
    if (missingTool) {
      const snapshot = this.attachEcology(this.nodes.getSnapshot(nodeId, currentTick), currentTick);
      return {
        ok: false,
        playerId,
        nodeId,
        reason: "missing_tool",
        requiredTool: missingTool,
        snapshot,
      };
    }

    const inventoryService = await this.dependencies.getInventoryService();
    const inventoryState = await inventoryService.getPlayerInventory(playerId);
    const rollbackSnapshot: GatherRollbackSnapshot = {
      playerId,
      nodeId,
      node: this.nodes.captureGatherMutationState(playerId, nodeId),
      ecology: this.ecology.captureNodeState(nodeId),
      skill: cloneSkillState(skillState),
      inventory: cloneInventoryState(inventoryState),
      appliedOriginUids: [...inventoryService.getAppliedOriginUids(playerId)],
      movementEventCount: inventoryService.getMovementEventCount(),
    };

    const result = this.nodes.gather({
      playerId,
      nodeId,
      playerPosition,
      currentTick,
      playerSkillLevel,
    });

    if (!result.ok || !result.skillId || !result.xpReward) {
      result.snapshot = this.attachEcology(result.snapshot ?? null, currentTick);
      return result;
    }

    try {
      const ecologyAfter = this.ecology.applyExtraction({ nodeId, currentTick, actorId: playerId });
      if (result.snapshot && ecologyAfter) {
        result.snapshot = attachResourceEcologySnapshot(result.snapshot, ecologyAfter);
      }

      const bonus = getGatheringToolBonus({
        equipment,
        skillId: result.skillId,
      });
      const xpReward = applyPermille(result.xpReward, bonus.xpMultiplierPermille);

      await skillService.applyEvent({
        type: "skill_xp_gain",
        playerId,
        skillId: result.skillId,
        amount: xpReward,
        source: "resource_gather",
      });

      const bonusYield = bonus.tier >= 2 ? 1 : 0;
      if (result.itemRewardId) {
        const totalQuantity = 1 + bonusYield;
        const inventoryResult = await inventoryService.addItem({
          playerId,
          itemId: result.itemRewardId,
          quantity: totalQuantity,
          ...(inventoryOrigin ? { origin: inventoryOrigin } : {}),
        });

        if (!inventoryResult.ok) {
          await this.restoreGatherState(rollbackSnapshot, skillService, inventoryService);
          return {
            ...result,
            ok: false,
            reason: "inventory_write_failed",
            inventoryAdded: false,
            inventoryQuantity: 0,
            bonusYield,
            toolTier: bonus.tier,
            snapshot: this.attachEcology(this.nodes.getSnapshot(nodeId, currentTick), currentTick),
          };
        }

        result.inventoryAdded = true;
        result.inventoryQuantity = inventoryResult.quantity;
        result.bonusYield = bonusYield;
        result.toolTier = bonus.tier;
      }

      if (result.itemRewardId && result.itemRewardName && onItemReward) {
        onItemReward({
          id: result.itemRewardId,
          name: result.itemRewardName,
          quantity: 1 + (result.bonusYield ?? 0),
        });
      }

      return result;
    } catch (error) {
      await this.restoreGatherState(rollbackSnapshot, skillService, inventoryService, error);
      return {
        ok: false,
        playerId,
        nodeId,
        reason: "transaction_failed",
        inventoryAdded: false,
        inventoryQuantity: 0,
        snapshot: this.attachEcology(this.nodes.getSnapshot(nodeId, currentTick), currentTick),
      };
    }
  }

  listResourceSnapshots(currentTick: number, playerPosition?: { x: number; y: number }): ResourceNodeSnapshot[] {
    if (playerPosition) {
      this.registerVisibleChunks(playerPosition);
    }

    const snapshots = this.nodes.listSnapshots(currentTick);
    const ecologySnapshots: ResourceNodeEcologySnapshot[] = snapshots
      .map((snapshot) => {
        this.ecology.registerNode(snapshot);
        return this.ecology.getNodeSnapshot(snapshot.id, currentTick);
      })
      .filter((snapshot): snapshot is ResourceNodeEcologySnapshot => Boolean(snapshot));

    return attachResourceEcologySnapshots(snapshots, ecologySnapshots);
  }

  private async restoreGatherState(
    snapshot: GatherRollbackSnapshot,
    skillService: SkillProgressionService,
    inventoryService: InventoryService,
    cause?: unknown,
  ): Promise<void> {
    const synchronousFailures: unknown[] = [];
    try {
      this.nodes.restoreGatherMutationState(snapshot.node);
    } catch (error) {
      synchronousFailures.push(error);
    }
    try {
      this.ecology.restoreNodeState(snapshot.nodeId, snapshot.ecology);
    } catch (error) {
      synchronousFailures.push(error);
    }

    const results = await Promise.allSettled([
      skillService.restorePlayerSkillState(snapshot.playerId, snapshot.skill),
      inventoryService.restorePlayerInventory(
        snapshot.playerId,
        snapshot.inventory,
        snapshot.appliedOriginUids,
        snapshot.movementEventCount,
      ),
    ]);
    const asynchronousFailures = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason);

    if (synchronousFailures.length > 0 || asynchronousFailures.length > 0) {
      throw new AggregateError(
        [cause, ...synchronousFailures, ...asynchronousFailures].filter(Boolean),
        "gather_transaction_rollback_failed",
      );
    }
  }

  private async withNodeMutationLock<T>(nodeId: string, operation: () => Promise<T>): Promise<T> {
    let release: () => void = () => undefined;
    const previous = this.nodeMutationQueues.get(nodeId) ?? Promise.resolve();
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.nodeMutationQueues.set(nodeId, current);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.nodeMutationQueues.get(nodeId) === current) {
        this.nodeMutationQueues.delete(nodeId);
      }
    }
  }

  private attachEcology(snapshot: ResourceNodeSnapshot | null, currentTick: number): ResourceNodeSnapshot | null {
    if (!snapshot) return null;
    this.ecology.registerNode(snapshot);
    return attachResourceEcologySnapshot(snapshot, this.ecology.getNodeSnapshot(snapshot.id, currentTick));
  }
}

export const gatheringService = new GatheringService();
