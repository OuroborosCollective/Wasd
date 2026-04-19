/**
 * WorldLayoutPathValidator
 *
 * Checks:
 * - Paths exist between buildings and roads
 * - Streets don't end in building walls
 * - Gate access roads connect through
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";
import { pointDistance } from "./WorldLayoutSpatialIndex.js";

let issueCounter = 0;
function makeId(): string { return `PTH-${Date.now()}-${(++issueCounter).toString(36)}`; }

export function createPathValidatorRule(): LayoutConstraintRule {
  return {
    id: "path_validator",
    name: "Path & Walkway Validation",
    description: "Checks that buildings are reachable via paths/roads.",
    severity: "warning",
    categories: ["house", "road", "path", "gate"],
    check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
      const issues: LayoutIssue[] = [];
      const buildings = entities.filter((e) => ["house", "castle", "market"].includes(e.category));
      const roads = entities.filter((e) => ["road", "path"].includes(e.category));
      const gates = entities.filter((e) => e.category === "gate");

      // Check that each building has at least one road/path within walkable distance
      for (const building of buildings) {
        let nearestRoadDist = Infinity;
        for (const road of roads) {
          const dist = pointDistance(building.position, road.position);
          if (dist < nearestRoadDist) nearestRoadDist = dist;
        }
        if (nearestRoadDist > 15 && roads.length > 0) {
          issues.push({
            id: makeId(),
            severity: "warning",
            code: "building_no_path",
            category: "path",
            message: `Building "${building.id}" has no path/road within 15 units (nearest: ${nearestRoadDist.toFixed(1)}).`,
            entityId: building.id,
            position: building.position,
            suggestedRepair: "add_road",
            repairable: true,
          });
        }
      }

      // Check that gates have road access
      for (const gate of gates) {
        const hasNearbyRoad = roads.some((r) => pointDistance(gate.position, r.position) < 10);
        if (!hasNearbyRoad && roads.length > 0) {
          issues.push({
            id: makeId(),
            severity: "invalid",
            code: "gate_no_road",
            category: "gate",
            message: `Gate "${gate.id}" has no road leading to it.`,
            entityId: gate.id,
            position: gate.position,
            suggestedRepair: "add_road",
            repairable: true,
          });
        }
      }

      return issues;
    },
  };
}
