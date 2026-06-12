/**
 * WorldLayoutWallConnectivityValidator
 *
 * Checks:
 * - Wall segments form a connected structure
 * - Wall ring has at least one gate
 * - No unintended gaps in walls
 * - Towers connect to walls
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";
import { pointDistance } from "./WorldLayoutSpatialIndex.js";

let issueCounter = 0;
function makeId(): string { return `WL-${(++issueCounter).toString(36).padStart(4, "0")}`; }

function buildWallGraph(walls: SpatialEntity[], maxDist: number): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const w of walls) graph.set(w.id, new Set());
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const dist = pointDistance(walls[i].position, walls[j].position);
      if (dist <= maxDist) {
        graph.get(walls[i].id)!.add(walls[j].id);
        graph.get(walls[j].id)!.add(walls[i].id);
      }
    }
  }
  return graph;
}

export function createWallConnectivityRule(): LayoutConstraintRule {
  return {
    id: "wall_connectivity",
    name: "Wall Connectivity",
    description: "Checks wall segments are connected and have gates.",
    severity: "invalid",
    categories: ["wall", "gate", "tower"],
    check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
      const issues: LayoutIssue[] = [];
      const walls = entities.filter((e) => e.category === "wall");
      const gates = entities.filter((e) => e.category === "gate");
      const towers = entities.filter((e) => e.category === "tower");

      if (walls.length === 0) return issues;

      const graph = buildWallGraph(walls, 12);
      const wallIds = new Set(walls.map((w) => w.id));

      // Find connected components
      const visited = new Set<string>();
      const components: string[][] = [];
      for (const id of wallIds) {
        if (visited.has(id)) continue;
        const comp: string[] = [];
        const queue = [id];
        while (queue.length > 0) {
          const cur = queue.shift()!;
          if (visited.has(cur)) continue;
          visited.add(cur);
          comp.push(cur);
          const neighbors = graph.get(cur);
          if (neighbors) {
            for (const n of neighbors) {
              if (!visited.has(n)) queue.push(n);
            }
          }
        }
        components.push(comp);
      }

      // If multiple wall clusters, flag gaps
      if (components.length > 1) {
        issues.push({
          id: makeId(),
          severity: "invalid",
          code: "wall_gap",
          category: "wall",
          message: `Wall network has ${components.length} disconnected segments (possible gaps).`,
          suggestedRepair: "add_wall_segment",
          repairable: true,
        });
      }

      // Check if walls have at least one gate (only if walls form a ring-like structure)
      if (walls.length >= 4 && gates.length === 0) {
        // Check if walls roughly enclose an area (simple heuristic: wall count > 4)
        issues.push({
          id: makeId(),
          severity: "critical",
          code: "wall_no_gate",
          category: "gate",
          message: `Wall ring with ${walls.length} segments has no gate/entrance.`,
          suggestedRepair: "add_gate",
          repairable: true,
        });
      }

      // Check towers aren't too far from walls
      for (const tower of towers) {
        let nearestWallDist = Infinity;
        for (const wall of walls) {
          const dist = pointDistance(tower.position, wall.position);
          if (dist < nearestWallDist) nearestWallDist = dist;
        }
        if (nearestWallDist > 20) {
          issues.push({
            id: makeId(),
            severity: "warning",
            code: "tower_far_from_wall",
            category: "tower",
            message: `Tower "${tower.id}" is ${nearestWallDist.toFixed(1)} units from nearest wall.`,
            entityId: tower.id,
            position: tower.position,
            repairable: false,
          });
        }
      }

      return issues;
    },
  };
}
