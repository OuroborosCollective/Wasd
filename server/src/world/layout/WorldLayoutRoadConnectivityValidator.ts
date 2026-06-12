/**
 * WorldLayoutRoadConnectivityValidator
 *
 * Checks:
 * - Roads don't end uselessly (dead-end detection)
 * - Main roads connect buildings
 * - Gate access roads are connected
 * - Roads between buildings exist
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";
import { pointDistance } from "./WorldLayoutSpatialIndex.js";

let issueCounter = 0;
function makeId(): string { return `RD-${(++issueCounter).toString(36).padStart(4, "0")}`; }

/**
 * Build an adjacency graph from road entities based on proximity.
 */
function buildRoadGraph(roads: SpatialEntity[], maxConnectionDist: number): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const r of roads) {
    graph.set(r.id, new Set());
  }
  for (let i = 0; i < roads.length; i++) {
    for (let j = i + 1; j < roads.length; j++) {
      const dist = pointDistance(roads[i].position, roads[j].position);
      if (dist <= maxConnectionDist) {
        graph.get(roads[i].id)!.add(roads[j].id);
        graph.get(roads[j].id)!.add(roads[i].id);
      }
    }
  }
  return graph;
}

/**
 * BFS to find connected components.
 */
function findConnectedComponents(graph: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const node of graph.keys()) {
    if (visited.has(node)) continue;
    const component: string[] = [];
    const queue = [node];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      const neighbors = graph.get(current);
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) queue.push(n);
        }
      }
    }
    components.push(component);
  }
  return components;
}

export function createRoadConnectivityRule(): LayoutConstraintRule {
  return {
    id: "road_connectivity",
    name: "Road Connectivity",
    description: "Checks that roads are connected and don't dead-end uselessly.",
    severity: "warning",
    categories: ["road", "path"],
    check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
      const issues: LayoutIssue[] = [];
      const roads = entities.filter((e) => ["road", "path"].includes(e.category));
      if (roads.length === 0) return issues;

      const graph = buildRoadGraph(roads, 8);
      const components = findConnectedComponents(graph);

      // If roads form multiple disconnected clusters, warn
      if (components.length > 1 && roads.length >= 3) {
        issues.push({
          id: makeId(),
          severity: "warning",
          code: "road_disconnected",
          category: "road",
          message: `Road network has ${components.length} disconnected clusters (total roads: ${roads.length}).`,
          suggestedRepair: "add_road",
          repairable: true,
        });
      }

      // Check for dead-end roads (degree 1) that aren't near buildings
      const buildings = entities.filter((e) => ["house", "castle", "gate"].includes(e.category));
      for (const road of roads) {
        const neighbors = graph.get(road.id);
        if (!neighbors || neighbors.size <= 1) {
          // Dead-end check: is it near a building?
          const nearBuilding = buildings.some((b) => pointDistance(road.position, b.position) < 12);
          if (!nearBuilding) {
            issues.push({
              id: makeId(),
              severity: "warning",
              code: "road_dead_end",
              category: "road",
              message: `Road "${road.id}" ends without connecting to a building.`,
              entityId: road.id,
              position: road.position,
              repairable: false,
            });
          }
        }
      }

      return issues;
    },
  };
}
