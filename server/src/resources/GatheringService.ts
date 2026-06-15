import { getSkillProgressionService } from "../skills/skillRuntime.js";
import type { PlayerSkillState, SkillSnapshot } from "../skills/SkillTypes.js";
import type { ResourceNodeStore } from "./ResourceNodeStore.js";
import { resourceNodeStore } from "./ResourceNodeStore.js";
import type { GatherResourceResult, RequiredToolSlot, ResourceNodeSnapshot } from "./ResourceTypes.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { equipmentService } from "../equipment/equipmentRuntime.js";
import { applyPermille, getGatheringToolBonus } from "../equipment/EquipmentBonus.js";
import { resourceEcologyService, type ResourceEcologyService } from "./ResourceEcologyService.js";
import { attachResourceEcologySnapshot, attachResourceEcologySnapshots } from "./ResourceEcologySnapshotAdapter.js";

function getMissingToolSlot(
  equipmentSlots: Array<{ slotId: string; itemId: string }>,
  requiredTool?: RequiredToolSlot,
): RequiredToolSlot | null {
  if (!requiredTool) return null;
  const hasTool = equipmentSlots.some((slot) => slot.slotId === requiredTool);
  return hasTool ? null : requiredTool;
}

function getSkillLevel(skills: SkillSnapshot[], skillId: string): number {
  return skills.find((s) => s.id === skillId)?.level ?? 1;
}

export interface GatherInput {
  playerId: string;
  nodeId: string;
  playerPosition: { x: number; y: number };
  currentTick: number;
  onItemReward?: (item: { id: string; name: string; quantity: number }) => void;
}

export interface ListSnapshotsOptions {
  currentTick: number;
  playerPosition?: { x: number; y: number };
}

export class GatheringService {
  constructor(
    private readonly nodes: ResourceNodeStore = resourceNodeStore,
    private readonly ecology: ResourceEcologyService = resourceEcologyService,
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
    const { playerId, nodeId, playerPosition, currentTick, onItemReward } = input;

    const skillService = await getSkillProgressionService();
    const skillState: PlayerSkillState = await skillService.getPlayerSkillState(playerId);

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

    const equipment = await equipmentService.getPlayerEquipment(playerId);
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
      const inventoryService = await getInventoryService();
      const totalQuantity = 1 + bonusYield;
      const inventoryResult = await inventoryService.addItem({
        playerId,
        itemId: result.itemRewardId,
        quantity: totalQuantity,
      });

      result.inventoryAdded = inventoryResult.ok;
      result.inventoryQuantity = inventoryResult.ok ? inventoryResult.quantity : 0;
      result.bonusYield = bonusYield;
      result.toolTier = bonus.tier;

      if (!inventoryResult.ok) {
        console.warn(
          `[gathering] inventory add failed for ${playerId}: ${inventoryResult.reason}`,
        );
      }
    }

    if (result.itemRewardId && result.itemRewardName && onItemReward) {
      onItemReward({
        id: result.itemRewardId,
        name: result.itemRewardName,
        quantity: 1 + bonusYield,
      });
    }

    return result;
  }

  listResourceSnapshots(currentTick: number, playerPosition?: { x: number; y: number }): readonly ResourceNodeSnapshot[] {
    if (playerPosition) {
      this.registerVisibleChunks(playerPosition);
    }

    const snapshots = this.nodes.listSnapshots(currentTick);
    const ecologySnapshots = snapshots.map((snapshot) => {
      this.ecology.registerNode(snapshot);
      return this.ecology.getNodeSnapshot(snapshot.id, currentTick);
    }).filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));

    return attachResourceEcologySnapshots(snapshots, ecologySnapshots);
  }

  private attachEcology(snapshot: ResourceNodeSnapshot | null, currentTick: number): ResourceNodeSnapshot | null {
    if (!snapshot) return null;
    this.ecology.registerNode(snapshot);
    return attachResourceEcologySnapshot(snapshot, this.ecology.getNodeSnapshot(snapshot.id, currentTick));
  }
}

export const gatheringService = new GatheringService();
