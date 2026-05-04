// @ts-nocheck
/**
 * WorldLayoutDungeonDistanceValidator
 *
 * Checks:
 * - World boss dungeons are at least N chunks from cities
 * - Dungeons are not inside city safety zones
 * - Configurable distance thresholds
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";
import { pointDistance } from "./WorldLayoutSpatialIndex.js";

let issueCounter = 0;
function makeId(): string { return `DG-${Date.now()}-${(++issueCounter).toString(36)}`; }

export function createDungeonDistanceRule(minDistanceChunks = 65, chunkSize = 64): LayoutConstraintRule {
  const minDistance = minDistanceChunks * chunkSize;

  return {
    id: "dungeon_distance",
    name: "Dungeon Distance",
    description: `World boss dungeons must be at least ${minDistanceChunks} chunks from cities.`,
    severity: "critical",
    categories: ["dungeon"],
    check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
      const issues: LayoutIssue[] = [];
      const dungeons = entities.filter((e) => e.category === "dungeon");
      const buildings = entities.filter((e) => ["house", "castle", "gate", "market", "tower"].includes(e.category));

      // Estimate city centers from building clusters
      const cityCenters = context.cityCenters ?? estimateCityCenters(buildings, chunkSize * 4);

      for (const dungeon of dungeons) {
        // Determine if this is a world boss dungeon (heuristic: name/path contains "boss")
        const isWorldBoss = /boss|world.?boss|legendary/i.test(dungeon.id) ||
                           /boss|world.?boss|legendary/i.test(dungeon.footprint.assetPath);
        const requiredDist = isWorldBoss ? minDistance : minDistance * 0.5;

        for (const city of cityCenters) {
          const dist = pointDistance(dungeon.position, city);
          if (dist < requiredDist) {
            issues.push({
              id: makeId(),
              severity: isWorldBoss ? "critical" : "invalid",
              code: isWorldBoss ? "boss_dungeon_too_close" : "dungeon_too_close",
              category: "dungeon",
              message: `${isWorldBoss ? "World boss " : ""}Dungeon "${dungeon.id}" is ${dist.toFixed(0)} units from city center (minimum: ${requiredDist.toFixed(0)}).`,
              entityId: dungeon.id,
              position: dungeon.position,
              details: {
                cityCenter: city,
                distance: dist,
                requiredDistance: requiredDist,
                isWorldBoss,
              },
              suggestedRepair: "reposition_dungeon",
              repairable: true,
            });
          }
        }
      }

      return issues;
    },
  };
}

/**
 * Simple city center estimation from building clusters.
 */
function estimateCityCenters(
  buildings: SpatialEntity[],
  clusterRadius: number
): Array<{ x: number; y: number }> {
  if (buildings.length === 0) return [];

  const visited = new Set<string>();
  const centers: Array<{ x: number; y: number }> = [];

  for (const b of buildings) {
    if (visited.has(b.id)) continue;
    const cluster: SpatialEntity[] = [b];
    visited.add(b.id);

    // BFS to find nearby buildings
    const queue = [b];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const other of buildings) {
        if (visited.has(other.id)) continue;
        if (pointDistance(current.position, other.position) < clusterRadius) {
          visited.add(other.id);
          cluster.push(other);
          queue.push(other);
        }
      }
    }

    // Compute cluster centroid
    if (cluster.length >= 2) {
      const cx = cluster.reduce((s, e) => s + e.position.x, 0) / cluster.length;
      const cy = cluster.reduce((s, e) => s + e.position.y, 0) / cluster.length;
      centers.push({ x: cx, y: cy });
    }
  }

  return centers;
}
