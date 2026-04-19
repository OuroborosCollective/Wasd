/**
 * TreePlacementValidator - Validates tree placement in the world layout.
 *
 * Rules:
 * - Trees should not be on roads/paths (they block movement)
 * - Trees should not overlap with buildings
 * - Trees need minimum spacing between each other
 * - Trees should be at ground level (positionZ near 0)
 * - Trees should not block building doorways
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";
import { getEntityAABB, aabbOverlap, aabbDistance, pointDistance } from "./WorldLayoutSpatialIndex.js";

let issueCounter = 0;
function makeId(): string { return `TR-${Date.now()}-${(++issueCounter).toString(36)}`; }

function isTree(e: SpatialEntity): boolean {
  return e.category === "tree";
}

export function createTreePlacementRule(): LayoutConstraintRule {
  return {
    id: "tree_placement",
    name: "Tree Placement",
    description: "Validates tree positioning relative to roads, buildings, and other trees.",
    severity: "warning",
    categories: ["tree"],
    check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
      const issues: LayoutIssue[] = [];
      const trees = entities.filter(isTree);
      const buildings = entities.filter((e) =>
        ["house", "castle", "tower", "market", "well"].includes(e.category)
      );
      const roads = entities.filter((e) => ["road", "path"].includes(e.category));

      for (let i = 0; i < trees.length; i++) {
        const tree = trees[i];
        const aabbTree = getEntityAABB(tree);
        const treeSpacing = tree.footprint.minSpacing ?? 1.5;

        // 1. Trees on roads
        for (const road of roads) {
          const aabbRoad = getEntityAABB(road);
          if (aabbOverlap(aabbTree, aabbRoad)) {
            issues.push({
              id: makeId(),
              severity: "invalid",
              code: "tree_on_road",
              category: "tree",
              message: `Tree "${tree.id}" is placed on a ${road.category} ("${road.id}").`,
              entityId: tree.id,
              position: tree.position,
              details: { roadId: road.id, roadCategory: road.category },
              suggestedRepair: "move",
              repairable: true,
            });
          }
        }

        // 2. Trees overlapping buildings
        for (const building of buildings) {
          const aabbBuilding = getEntityAABB(building);
          if (aabbOverlap(aabbTree, aabbBuilding)) {
            issues.push({
              id: makeId(),
              severity: "critical",
              code: "tree_in_building",
              category: "tree",
              message: `Tree "${tree.id}" overlaps with building "${building.id}" (${building.category}).`,
              entityId: tree.id,
              position: tree.position,
              details: { buildingId: building.id, buildingCategory: building.category },
              suggestedRepair: "move",
              repairable: true,
            });
          }

          // Trees blocking building doors
          if (building.footprint.doorwaySide) {
            const hw = (building.footprint.width * (building.scale ?? 1)) / 2;
            const hd = (building.footprint.depth * (building.scale ?? 1)) / 2;
            let doorPos: { x: number; y: number };
            switch (building.footprint.doorwaySide) {
              case "north": doorPos = { x: building.position.x, y: building.position.y - hd - 1 }; break;
              case "south": doorPos = { x: building.position.x, y: building.position.y + hd + 1 }; break;
              case "east": doorPos = { x: building.position.x + hw + 1, y: building.position.y }; break;
              case "west": doorPos = { x: building.position.x - hw - 1, y: building.position.y }; break;
              default: continue;
            }
            const doorDist = pointDistance(tree.position, doorPos);
            if (doorDist < 3) {
              issues.push({
                id: makeId(),
                severity: "invalid",
                code: "tree_blocks_door",
                category: "tree",
                message: `Tree "${tree.id}" blocks doorway of building "${building.id}" (distance: ${doorDist.toFixed(1)}).`,
                entityId: tree.id,
                position: tree.position,
                details: { buildingId: building.id, doorPosition: doorPos, distance: doorDist },
                suggestedRepair: "move",
                repairable: true,
              });
            }
          }
        }

        // 3. Tree-tree spacing
        for (let j = i + 1; j < trees.length; j++) {
          const other = trees[j];
          const aabbOther = getEntityAABB(other);
          const dist = aabbDistance(aabbTree, aabbOther);
          const requiredDist = Math.max(treeSpacing, other.footprint.minSpacing ?? 1.5);

          if (dist < requiredDist && dist > 0) {
            issues.push({
              id: makeId(),
              severity: "warning",
              code: "tree_too_close",
              category: "tree",
              message: `Tree "${tree.id}" is only ${dist.toFixed(1)} units from tree "${other.id}" (minimum: ${requiredDist}).`,
              entityId: tree.id,
              position: tree.position,
              details: { otherId: other.id, distance: dist, required: requiredDist },
              suggestedRepair: "move",
              repairable: true,
            });
          }
        }

        // 4. Ground level check
        const posZ = tree.positionZ ?? 0;
        if (Math.abs(posZ) > 2) {
          issues.push({
            id: makeId(),
            severity: "warning",
            code: "tree_not_grounded",
            category: "tree",
            message: `Tree "${tree.id}" is ${posZ > 0 ? "floating" : "buried"} (z=${posZ.toFixed(1)}).`,
            entityId: tree.id,
            position: tree.position,
            details: { positionZ: posZ },
            suggestedRepair: "snap",
            repairable: true,
          });
        }
      }

      return issues;
    },
  };
}
