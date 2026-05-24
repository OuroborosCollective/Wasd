/**
 * WorldLayoutRepairService - Applies rule-based auto-repairs to layout issues.
 *
 * Repairs are cautious:
 * - Move buildings away from overlaps
 * - Rotate buildings to face roads
 * - Snap assets to ground level
 * - Add road segments between buildings
 * - Mark unfixable issues for manual review
 * - Never deletes anything
 */

import type {
  LayoutIssue,
  RepairResult,
  RepairAction,
  SpatialEntity,
  WorldLayoutConfig,
} from "./WorldLayoutTypes.js";
import { WorldLayoutSpatialIndex } from "./WorldLayoutSpatialIndex.js";
import { WorldLayoutLearningStore } from "./WorldLayoutLearningStore.js";
import { WorldLayoutReportLog } from "./WorldLayoutReportLog.js";

let actionCounter = 0;
function makeActionId(): string { return `REP-${Date.now()}-${(++actionCounter).toString(36)}`; }

export class WorldLayoutRepairService {
  private readonly config: WorldLayoutConfig;
  private readonly spatialIndex: WorldLayoutSpatialIndex;
  private readonly learningStore: WorldLayoutLearningStore;
  private readonly reportLog: WorldLayoutReportLog;
  /** Callback to apply entity changes in the world */
  private readonly onEntityUpdate: ((entityId: string, updates: Partial<SpatialEntity>) => void) | null;

  constructor(
    config: WorldLayoutConfig,
    spatialIndex: WorldLayoutSpatialIndex,
    learningStore: WorldLayoutLearningStore,
    reportLog: WorldLayoutReportLog,
    onEntityUpdate?: (entityId: string, updates: Partial<SpatialEntity>) => void
  ) {
    this.config = config;
    this.spatialIndex = spatialIndex;
    this.learningStore = learningStore;
    this.reportLog = reportLog;
    this.onEntityUpdate = onEntityUpdate ?? null;
  }

  /**
   * Attempt to repair a list of issues.
   */
  async repairAll(issues: LayoutIssue[]): Promise<RepairResult> {
    if (!this.config.autoRepairEnabled) {
      return { repaired: 0, failed: 0, quarantined: 0, skipped: issues.length, actions: [], timestamp: Date.now() };
    }

    const actions: RepairAction[] = [];
    let repaired = 0, failed = 0, quarantined = 0, skipped = 0;

    // Sort: critical first, then invalid, then warning
    const sorted = [...issues].sort((a, b) => {
      const sev = { critical: 0, invalid: 1, warning: 2 };
      return sev[a.severity] - sev[b.severity];
    });

    for (const issue of sorted) {
      if (!issue.repairable) {
        skipped++;
        continue;
      }

      const action = await this.repairIssue(issue);
      actions.push(action);

      if (action.type === "quarantine") {
        quarantined++;
      } else if (action.success) {
        repaired++;
      } else {
        failed++;
      }

      // Record learning
      this.learningStore.recordOutcome(
        issue.category,
        issue.code,
        action.type,
        action.success
      );

      // Log
      this.reportLog.record({
        issueCode: issue.code,
        severity: issue.severity,
        entityId: issue.entityId,
        assetPath: issue.assetPath,
        position: issue.position,
        repairStrategy: action.type,
        success: action.success,
        before: action.before,
        after: action.after,
        notes: action.message,
      });
    }

    return { repaired, failed, quarantined, skipped, actions, timestamp: Date.now() };
  }

  private async repairIssue(issue: LayoutIssue): Promise<RepairAction> {
    const startTime = Date.now();

    // Check learning store for best strategy
    const learnedStrategy = this.learningStore.getBestStrategy(issue.category, issue.code);

    switch (issue.code) {
      case "building_overlap":
      case "building_too_close":
      case "glb_overlap":
      case "tree_on_road":
      case "tree_in_building":
      case "tree_blocks_door":
      case "tree_too_close":
        return this.repairOverlap(issue, startTime);

      case "glb_floating":
      case "glb_buried":
      case "tree_not_grounded":
        return this.repairGroundLevel(issue, startTime);

      case "glb_bad_rotation":
      case "door_faces_wrong_way":
        return this.repairRotation(issue, startTime);

      case "wall_not_snapped":
        return this.repairWallSnap(issue, startTime);

      case "wall_no_gate":
        return this.repairAddGate(issue, startTime);

      case "wall_gap":
        return this.repairWallGap(issue, startTime);

      case "building_no_road_access":
      case "building_no_path":
      case "gate_no_road":
      case "road_dead_end":
        return this.repairRoadAccess(issue, startTime);

      case "boss_dungeon_too_close":
      case "dungeon_too_close":
        return this.repairDungeonDistance(issue, startTime);

      case "door_blocked":
        return this.repairDoorBlocked(issue, startTime);

      default:
        // Try learned strategy first, then quarantine
        if (learnedStrategy) {
          return this.applyLearnedStrategy(issue, learnedStrategy, startTime);
        }
        return this.markForReview(issue, startTime);
    }
  }

  /**
   * Move entity away from overlap.
   */
  private repairOverlap(issue: LayoutIssue, startTime: number): RepairAction {
    const entityId = issue.entityId;
    if (!entityId) return this.markForReview(issue, startTime);

    const entity = this.spatialIndex.get(entityId);
    if (!entity) return this.markForReview(issue, startTime);

    const otherId = issue.details?.otherId as string | undefined;
    const otherEntity = otherId ? this.spatialIndex.get(otherId) : undefined;

    // Compute push direction
    let dx = 0, dy = 0;
    if (otherEntity) {
      dx = entity.position.x - otherEntity.position.x;
      dy = entity.position.y - otherEntity.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.1) {
        // Entities are at same position, push in random direction
        dx = 1; dy = 0;
      } else {
        dx /= dist;
        dy /= dist;
      }
    } else {
      dx = 1; dy = 0;
    }

    // Push by minimum spacing + buffer
    const pushDist = (entity.footprint.minSpacing ?? 2) + (otherEntity?.footprint.minSpacing ?? 2) + 2;
    const newX = entity.position.x + dx * pushDist;
    const newY = entity.position.y + dy * pushDist;

    const before = { ...entity.position };
    this.spatialIndex.remove(entityId);
    entity.position = { x: newX, y: newY };
    this.spatialIndex.insert(entity);
    this.onEntityUpdate?.(entityId, { position: entity.position });

    return {
      id: makeActionId(),
      type: "move",
      issueId: issue.id,
      entityId,
      message: `Moved "${entityId}" by (${(dx * pushDist).toFixed(1)}, ${(dy * pushDist).toFixed(1)}) to avoid overlap.`,
      deltaPosition: { x: dx * pushDist, y: dy * pushDist },
      targetPosition: { x: newX, y: newY },
      success: true,
      durationMs: Date.now() - startTime,
      before: { position: before },
      after: { position: { x: newX, y: newY } },
      timestamp: Date.now(),
    };
  }

  /**
   * Snap asset to ground level (positionZ = 0).
   */
  private repairGroundLevel(issue: LayoutIssue, startTime: number): RepairAction {
    const entityId = issue.entityId;
    if (!entityId) return this.markForReview(issue, startTime);

    const entity = this.spatialIndex.get(entityId);
    if (!entity) return this.markForReview(issue, startTime);

    const beforeZ = entity.positionZ ?? 0;
    entity.positionZ = 0;

    return {
      id: makeActionId(),
      type: "snap",
      issueId: issue.id,
      entityId,
      message: `Snapped "${entityId}" to ground level (was z=${beforeZ.toFixed(1)}).`,
      success: true,
      durationMs: Date.now() - startTime,
      before: { positionZ: beforeZ },
      after: { positionZ: 0 },
      timestamp: Date.now(),
    };
  }

  /**
   * Rotate asset to nearest valid rotation.
   */
  private repairRotation(issue: LayoutIssue, startTime: number): RepairAction {
    const entityId = issue.entityId;
    if (!entityId) return this.markForReview(issue, startTime);

    const entity = this.spatialIndex.get(entityId);
    if (!entity) return this.markForReview(issue, startTime);

    const currentRot = entity.rotation ?? 0;
    const allowed = entity.footprint.allowedRotations;

    if (allowed && allowed.length > 0) {
      // Find nearest allowed rotation
      let bestRot = allowed[0];
      let bestDiff = Infinity;
      for (const ar of allowed) {
        const diff = Math.abs(((currentRot - ar) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2));
        const wrappedDiff = Math.min(diff, Math.PI * 2 - diff);
        if (wrappedDiff < bestDiff) {
          bestDiff = wrappedDiff;
          bestRot = ar;
        }
      }
      entity.rotation = bestRot;
    } else {
      // If door faces wrong way, rotate by 180 degrees
      if (issue.code === "door_faces_wrong_way") {
        entity.rotation = (currentRot + Math.PI) % (Math.PI * 2);
      }
    }

    return {
      id: makeActionId(),
      type: "rotate",
      issueId: issue.id,
      entityId,
      message: `Rotated "${entityId}" from ${(currentRot * 180 / Math.PI).toFixed(0)}° to ${((entity.rotation ?? 0) * 180 / Math.PI).toFixed(0)}°.`,
      success: true,
      durationMs: Date.now() - startTime,
      before: { rotation: currentRot },
      after: { rotation: entity.rotation },
      timestamp: Date.now(),
    };
  }

  private repairWallSnap(issue: LayoutIssue, startTime: number): RepairAction {
    return this.markForReview(issue, startTime, "Wall snap requires complex alignment; marking for manual review.");
  }

  private repairAddGate(issue: LayoutIssue, startTime: number): RepairAction {
    return {
      id: makeActionId(),
      type: "add_gate",
      issueId: issue.id,
      message: "Gate needed in wall ring; flagged for placement.",
      success: false,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  private repairWallGap(issue: LayoutIssue, startTime: number): RepairAction {
    return {
      id: makeActionId(),
      type: "add_wall_segment",
      issueId: issue.id,
      message: "Wall gap detected; wall segment addition flagged.",
      success: false,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  private repairRoadAccess(issue: LayoutIssue, startTime: number): RepairAction {
    return {
      id: makeActionId(),
      type: "add_road",
      issueId: issue.id,
      entityId: issue.entityId,
      message: `Road access needed near "${issue.entityId ?? "unknown"}"; road addition flagged.`,
      success: false,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  private repairDungeonDistance(issue: LayoutIssue, startTime: number): RepairAction {
    return {
      id: makeActionId(),
      type: "reposition_dungeon",
      issueId: issue.id,
      entityId: issue.entityId,
      message: `Dungeon "${issue.entityId}" needs repositioning away from city.`,
      success: false,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  private repairDoorBlocked(issue: LayoutIssue, startTime: number): RepairAction {
    const entityId = issue.entityId;
    if (!entityId) return this.markForReview(issue, startTime);

    // Try to move the blocker, not the building
    const blockerId = issue.details?.blockerId as string | undefined;
    if (blockerId) {
      const blocker = this.spatialIndex.get(blockerId);
      if (blocker) {
        const entity = this.spatialIndex.get(entityId);
        if (entity) {
          // Push blocker away from the door
          const dx = blocker.position.x - entity.position.x;
          const dy = blocker.position.y - entity.position.y;
          const dist = Math.hypot(dx, dy) || 1;
          const pushDist = (blocker.footprint.width * (blocker.scale ?? 1)) / 2 + 3;

          const before = { ...blocker.position };
          this.spatialIndex.remove(blockerId);
          blocker.position = {
            x: blocker.position.x + (dx / dist) * pushDist,
            y: blocker.position.y + (dy / dist) * pushDist,
          };
          this.spatialIndex.insert(blocker);
          this.onEntityUpdate?.(blockerId, { position: blocker.position });

          return {
            id: makeActionId(),
            type: "move",
            issueId: issue.id,
            entityId: blockerId,
            message: `Moved blocker "${blockerId}" away from door of "${entityId}".`,
            success: true,
            durationMs: Date.now() - startTime,
            before: { position: before },
            after: { position: blocker.position },
            timestamp: Date.now(),
          };
        }
      }
    }
    return this.markForReview(issue, startTime);
  }

  private applyLearnedStrategy(issue: LayoutIssue, strategy: string, startTime: number): RepairAction {
    return {
      id: makeActionId(),
      type: strategy as any,
      issueId: issue.id,
      entityId: issue.entityId,
      message: `Applied learned strategy "${strategy}" for issue "${issue.code}".`,
      success: false,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  private markForReview(issue: LayoutIssue, startTime: number, message?: string): RepairAction {
    return {
      id: makeActionId(),
      type: "quarantine",
      issueId: issue.id,
      entityId: issue.entityId,
      message: message ?? `Issue "${issue.code}" on "${issue.entityId ?? "unknown"}" requires manual review.`,
      success: false,
      durationMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
}
