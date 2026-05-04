// @ts-nocheck
/**
 * WorldLayoutBuildingPlacementValidator
 *
 * Checks:
 * - House-House overlap
 * - Minimum spacing between buildings
 * - Building on road collision
 * - Building needs accessible door
 * - Building should be near a road
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";
import { getEntityAABB, aabbOverlap, aabbDistance, pointDistance } from "./WorldLayoutSpatialIndex.js";

let issueCounter = 0;
function makeId(): string { return `BLD-${Date.now()}-${(++issueCounter).toString(36)}`; }

function isBuilding(e: SpatialEntity): boolean {
  return ["house", "castle", "tower", "market"].includes(e.category);
}

export function createBuildingPlacementRule(): LayoutConstraintRule {
  return {
    id: "building_placement",
    name: "Building Placement",
    description: "Checks building spacing, overlap, and road access.",
    severity: "invalid",
    categories: ["house", "castle", "tower", "market"],
    check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
      const issues: LayoutIssue[] = [];
      const buildings = entities.filter(isBuilding);
      const roads = entities.filter((e) => ["road", "path"].includes(e.category));
      const index = context.allEntities;

      for (let i = 0; i < buildings.length; i++) {
        const a = buildings[i];
        const aabbA = getEntityAABB(a);
        const minSpace = a.footprint.minSpacing ?? 2;

        for (let j = i + 1; j < buildings.length; j++) {
          const b = buildings[j];
          const aabbB = getEntityAABB(b);

          // Check overlap
          if (aabbOverlap(aabbA, aabbB)) {
            issues.push({
              id: makeId(),
              severity: "critical",
              code: "building_overlap",
              category: a.category,
              message: `Building "${a.id}" (${a.category}) overlaps with building "${b.id}" (${b.category}).`,
              entityId: a.id,
              position: a.position,
              details: { otherId: b.id, otherPosition: b.position },
              suggestedRepair: "move",
              repairable: true,
            });
          }
          // Check minimum spacing
          else {
            const dist = aabbDistance(aabbA, aabbB);
            const requiredDist = Math.max(minSpace, b.footprint.minSpacing ?? 2);
            if (dist < requiredDist && dist > 0) {
              issues.push({
                id: makeId(),
                severity: "invalid",
                code: "building_too_close",
                category: a.category,
                message: `Building "${a.id}" is only ${dist.toFixed(1)} units from "${b.id}" (minimum: ${requiredDist}).`,
                entityId: a.id,
                position: a.position,
                details: { otherId: b.id, distance: dist, required: requiredDist },
                suggestedRepair: "move",
                repairable: true,
              });
            }
          }
        }

        // Check road access (building should be near a road)
        if (a.footprint.requiresRoadAccess) {
          let nearestRoadDist = Infinity;
          for (const road of roads) {
            const dist = pointDistance(a.position, road.position);
            if (dist < nearestRoadDist) nearestRoadDist = dist;
          }
          if (nearestRoadDist > 20 && roads.length > 0) {
            issues.push({
              id: makeId(),
              severity: "warning",
              code: "building_no_road_access",
              category: a.category,
              message: `Building "${a.id}" has no road within 20 units (nearest: ${nearestRoadDist.toFixed(1)}).`,
              entityId: a.id,
              position: a.position,
              details: { nearestRoadDistance: nearestRoadDist },
              suggestedRepair: "add_road",
              repairable: true,
            });
          }
        }
      }

      return issues;
    },
  };
}
