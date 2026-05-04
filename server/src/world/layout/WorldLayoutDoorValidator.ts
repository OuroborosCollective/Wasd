// @ts-nocheck
/**
 * WorldLayoutDoorValidator
 *
 * Checks:
 * - Every building has at least one door/entrance
 * - Doors are accessible (not blocked by other objects)
 * - Doors don't face into other buildings
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";
import { pointDistance, getEntityAABB, aabbOverlap } from "./WorldLayoutSpatialIndex.js";

let issueCounter = 0;
function makeId(): string { return `DR-${Date.now()}-${(++issueCounter).toString(36)}`; }

function getDoorPosition(building: SpatialEntity): { x: number; y: number } {
  const side = building.footprint.doorwaySide ?? "south";
  const hw = (building.footprint.width * (building.scale ?? 1)) / 2;
  const hd = (building.footprint.depth * (building.scale ?? 1)) / 2;
  const px = building.position.x;
  const py = building.position.y;

  switch (side) {
    case "north": return { x: px, y: py - hd - 1 };
    case "south": return { x: px, y: py + hd + 1 };
    case "east": return { x: px + hw + 1, y: py };
    case "west": return { x: px - hw - 1, y: py };
    default: return { x: px, y: py + hd + 1 };
  }
}

export function createDoorValidatorRule(): LayoutConstraintRule {
  return {
    id: "door_validator",
    name: "Door Accessibility",
    description: "Checks that buildings have accessible door positions.",
    severity: "invalid",
    categories: ["house", "castle", "gate", "market"],
    check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
      const issues: LayoutIssue[] = [];
      const buildings = entities.filter((e) => ["house", "castle", "gate", "market"].includes(e.category));
      const doors = entities.filter((e) => e.category === "door");
      const blockingEntities = entities.filter((e) =>
        !["road", "path", "door", "decoration"].includes(e.category)
      );

      for (const building of buildings) {
        // Check if building has a door entity nearby
        const doorPos = getDoorPosition(building);
        const hasExplicitDoor = doors.some((d) => pointDistance(d.position, doorPos) < 5);

        // Check if door position is blocked by another object
        let doorBlocked = false;
        for (const blocker of blockingEntities) {
          if (blocker.id === building.id) continue;
          const blockerAABB = getEntityAABB(blocker);
          // Expand blocker AABB by 1 unit for comfort
          const expandedAABB = {
            minX: blockerAABB.minX - 1,
            minY: blockerAABB.minY - 1,
            maxX: blockerAABB.maxX + 1,
            maxY: blockerAABB.maxY + 1,
          };
          if (
            doorPos.x >= expandedAABB.minX && doorPos.x <= expandedAABB.maxX &&
            doorPos.y >= expandedAABB.minY && doorPos.y <= expandedAABB.maxY
          ) {
            doorBlocked = true;
            issues.push({
              id: makeId(),
              severity: "critical",
              code: "door_blocked",
              category: "door",
              message: `Door of "${building.id}" (${building.category}) is blocked by "${blocker.id}" (${blocker.category}).`,
              entityId: building.id,
              position: doorPos,
              details: { blockerId: blocker.id, blockerCategory: blocker.category },
              suggestedRepair: "move",
              repairable: true,
            });
            break;
          }
        }

        // If no explicit door entity and door not blocked, warn about missing door
        if (!hasExplicitDoor && !doorBlocked) {
          issues.push({
            id: makeId(),
            severity: "warning",
            code: "door_missing",
            category: "door",
            message: `Building "${building.id}" (${building.category}) has no explicit door entity at doorway side "${building.footprint.doorwaySide ?? "south"}".`,
            entityId: building.id,
            position: doorPos,
            repairable: false,
          });
        }
      }

      return issues;
    },
  };
}
