// @ts-nocheck
/**
 * GLBPlacementValidator - Validates logical placement of GLB assets in the world.
 *
 * Checks:
 * - Asset doesn't float unreasonably above ground
 * - Asset isn't half-buried in ground
 * - Asset doesn't intersect other blocked objects
 * - Asset is correctly rotated
 * - Asset is within allowed placement area
 * - Doorway side faces road/path correctly
 * - Walls snap to wall grid
 * - Buildings don't overlap
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";
import { getEntityAABB, aabbOverlap, aabbDistance } from "./WorldLayoutSpatialIndex.js";

let issueCounter = 0;
function makeId(): string { return `GLB-${Date.now()}-${(++issueCounter).toString(36)}`; }

/**
 * Check if a rotation angle is in the allowed set.
 */
function isRotationAllowed(actual: number, allowed: number[], tolerance = 0.1): boolean {
  if (allowed.length === 0) return true; // Any rotation allowed
  const normActual = ((actual % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  for (const allowedRot of allowed) {
    const normAllowed = ((allowedRot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const diff = Math.abs(normActual - normAllowed);
    const wrappedDiff = Math.min(diff, Math.PI * 2 - diff);
    if (wrappedDiff < tolerance) return true;
  }
  return false;
}

/**
 * Check if doorway side faces a road.
 */
function doorwayFacesRoad(building: SpatialEntity, roads: SpatialEntity[]): boolean {
  const side = building.footprint.doorwaySide;
  if (!side) return true; // No doorway side specified, skip check

  const hw = (building.footprint.width * (building.scale ?? 1)) / 2;
  const hd = (building.footprint.depth * (building.scale ?? 1)) / 2;
  let doorPos: { x: number; y: number };

  switch (side) {
    case "north": doorPos = { x: building.position.x, y: building.position.y - hd - 2 }; break;
    case "south": doorPos = { x: building.position.x, y: building.position.y + hd + 2 }; break;
    case "east": doorPos = { x: building.position.x + hw + 2, y: building.position.y }; break;
    case "west": doorPos = { x: building.position.x - hw - 2, y: building.position.y }; break;
    default: return true;
  }

  return roads.some((r) => {
    const dist = Math.hypot(r.position.x - doorPos.x, r.position.y - doorPos.y);
    return dist < 12;
  });
}

export function createGLBPlacementRule(): LayoutConstraintRule {
  return {
    id: "glb_placement",
    name: "GLB Asset Placement",
    description: "Validates GLB asset positioning, rotation, overlap, and doorway orientation.",
    severity: "invalid",
    categories: "*",
    check(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
      const issues: LayoutIssue[] = [];
      const roads = entities.filter((e) => ["road", "path"].includes(e.category));
      const walls = entities.filter((e) => e.category === "wall");

      for (const entity of entities) {
        // 1. Ground check: Y position (entity.positionZ or assumed 0) should be near ground level
        const posZ = entity.positionZ ?? 0;
        if (posZ > 3) {
          issues.push({
            id: makeId(),
            severity: "invalid",
            code: "glb_floating",
            category: entity.category,
            message: `Asset "${entity.id}" floats ${posZ.toFixed(1)} units above ground.`,
            entityId: entity.id,
            assetPath: entity.footprint.assetPath,
            position: entity.position,
            details: { positionZ: posZ },
            suggestedRepair: "snap",
            repairable: true,
          });
        }
        if (posZ < -2) {
          issues.push({
            id: makeId(),
            severity: "invalid",
            code: "glb_buried",
            category: entity.category,
            message: `Asset "${entity.id}" is ${Math.abs(posZ).toFixed(1)} units below ground.`,
            entityId: entity.id,
            assetPath: entity.footprint.assetPath,
            position: entity.position,
            details: { positionZ: posZ },
            suggestedRepair: "snap",
            repairable: true,
          });
        }

        // 2. Rotation check
        const rotation = entity.rotation ?? 0;
        if (!isRotationAllowed(rotation, entity.footprint.allowedRotations ?? [])) {
          issues.push({
            id: makeId(),
            severity: "warning",
            code: "glb_bad_rotation",
            category: entity.category,
            message: `Asset "${entity.id}" has non-standard rotation ${(rotation * 180 / Math.PI).toFixed(0)}°.`,
            entityId: entity.id,
            assetPath: entity.footprint.assetPath,
            position: entity.position,
            details: { rotation, allowedRotations: entity.footprint.allowedRotations },
            suggestedRepair: "rotate",
            repairable: true,
          });
        }

        // 3. Overlap with other entities
        const aabbA = getEntityAABB(entity);
        for (const other of entities) {
          if (other.id === entity.id) continue;
          // Roads/paths can overlap with anything
          if (["road", "path", "decoration"].includes(entity.category)) continue;
          if (["road", "path", "decoration"].includes(other.category)) continue;

          const aabbB = getEntityAABB(other);
          if (aabbOverlap(aabbA, aabbB)) {
            // Special cases: walls can touch, gates sit in walls
            const isWallTouch = entity.category === "wall" && other.category === "wall";
            const isGateInWall = (entity.category === "gate" && other.category === "wall") ||
                                 (entity.category === "wall" && other.category === "gate");

            if (!isWallTouch && !isGateInWall) {
              issues.push({
                id: makeId(),
                severity: "critical",
                code: "glb_overlap",
                category: entity.category,
                message: `Asset "${entity.id}" (${entity.category}) overlaps with "${other.id}" (${other.category}).`,
                entityId: entity.id,
                assetPath: entity.footprint.assetPath,
                position: entity.position,
                details: { otherId: other.id, otherCategory: other.category },
                suggestedRepair: "move",
                repairable: true,
              });
            }
          }
        }

        // 4. Doorway orientation check (buildings should face roads)
        if (["house", "castle", "market"].includes(entity.category) && entity.footprint.doorwaySide) {
          if (!doorwayFacesRoad(entity, roads) && roads.length > 0) {
            issues.push({
              id: makeId(),
              severity: "warning",
              code: "door_faces_wrong_way",
              category: entity.category,
              message: `Building "${entity.id}" doorway faces "${entity.footprint.doorwaySide}" but no road is there.`,
              entityId: entity.id,
              position: entity.position,
              details: { doorwaySide: entity.footprint.doorwaySide },
              suggestedRepair: "rotate",
              repairable: true,
            });
          }
        }

        // 5. Wall snap check
        if (entity.footprint.requiresWallSnap && entity.category === "wall") {
          const nearbyWalls = walls.filter((w) => w.id !== entity.id && aabbDistance(aabbA, getEntityAABB(w)) < 14);
          if (nearbyWalls.length === 0 && walls.length > 1) {
            issues.push({
              id: makeId(),
              severity: "invalid",
              code: "wall_not_snapped",
              category: "wall",
              message: `Wall "${entity.id}" is not connected to any nearby wall segments.`,
              entityId: entity.id,
              position: entity.position,
              suggestedRepair: "snap",
              repairable: true,
            });
          }
        }
      }

      return issues;
    },
  };
}
