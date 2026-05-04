// @ts-nocheck
import { describe, it, expect } from "vitest";
import { createTreePlacementRule } from "../world/layout/TreePlacementValidator.js";
import type { SpatialEntity, GLBFootprintDescriptor } from "../world/layout/WorldLayoutTypes.js";

function makeEntity(overrides: Partial<SpatialEntity> & { id: string; category: string }): SpatialEntity {
  return {
    position: { x: 0, y: 0 },
    positionZ: 0,
    rotation: 0,
    scale: 1,
    footprint: {
      assetPath: "",
      category: overrides.category as any,
      width: 2,
      depth: 2,
      minSpacing: 1.5,
      allowedRotations: [],
      requiresRoadAccess: false,
      requiresWallSnap: false,
    },
    ...overrides,
  } as SpatialEntity;
}

describe("TreePlacementValidator", () => {
  const rule = createTreePlacementRule();
  const context = { allEntities: [] as SpatialEntity[], chunkSize: 64 };

  it("no issues for well-placed trees", () => {
    const entities = [
      makeEntity({ id: "tree1", category: "tree", position: { x: 10, y: 10 } }),
      makeEntity({ id: "tree2", category: "tree", position: { x: 20, y: 10 } }),
      makeEntity({ id: "house1", category: "house", position: { x: 50, y: 50 }, footprint: { assetPath: "", category: "house", width: 6, depth: 6, minSpacing: 2, allowedRotations: [], requiresRoadAccess: true, requiresWallSnap: false, doorwaySide: "south" } }),
    ];
    const issues = rule.check(entities, { ...context, allEntities: entities });
    expect(issues).toHaveLength(0);
  });

  it("detects tree on road", () => {
    const entities = [
      makeEntity({ id: "tree1", category: "tree", position: { x: 5, y: 5 } }),
      makeEntity({ id: "road1", category: "road", position: { x: 5, y: 5 }, footprint: { assetPath: "", category: "road", width: 4, depth: 20, minSpacing: 0, allowedRotations: [], requiresRoadAccess: false, requiresWallSnap: false } }),
    ];
    const issues = rule.check(entities, { ...context, allEntities: entities });
    expect(issues.some((i) => i.code === "tree_on_road")).toBe(true);
  });

  it("detects tree in building", () => {
    const entities = [
      makeEntity({ id: "tree1", category: "tree", position: { x: 10, y: 10 } }),
      makeEntity({ id: "house1", category: "house", position: { x: 10, y: 10 }, footprint: { assetPath: "", category: "house", width: 6, depth: 6, minSpacing: 2, allowedRotations: [], requiresRoadAccess: false, requiresWallSnap: false } }),
    ];
    const issues = rule.check(entities, { ...context, allEntities: entities });
    expect(issues.some((i) => i.code === "tree_in_building")).toBe(true);
  });

  it("detects trees too close", () => {
    // Trees at distance 3 apart, width=1 so aabbDistance = 3 - 1 = 2
    // minSpacing=3 each, so required = 3, and 2 < 3 → issue
    const entities = [
      makeEntity({ id: "tree1", category: "tree", position: { x: 10, y: 10 }, footprint: { assetPath: "", category: "tree", width: 1, depth: 1, minSpacing: 3, allowedRotations: [], requiresRoadAccess: false, requiresWallSnap: false } }),
      makeEntity({ id: "tree2", category: "tree", position: { x: 13, y: 10 }, footprint: { assetPath: "", category: "tree", width: 1, depth: 1, minSpacing: 3, allowedRotations: [], requiresRoadAccess: false, requiresWallSnap: false } }),
    ];
    const issues = rule.check(entities, { ...context, allEntities: entities });
    expect(issues.some((i) => i.code === "tree_too_close")).toBe(true);
  });

  it("detects tree blocking doorway", () => {
    const entities = [
      makeEntity({ id: "tree1", category: "tree", position: { x: 20, y: 12 }, footprint: { assetPath: "", category: "tree", width: 1, depth: 1, minSpacing: 1.5, allowedRotations: [], requiresRoadAccess: false, requiresWallSnap: false } }),
      makeEntity({ id: "house1", category: "house", position: { x: 20, y: 10 }, footprint: { assetPath: "", category: "house", width: 6, depth: 6, minSpacing: 2, allowedRotations: [], requiresRoadAccess: false, requiresWallSnap: false, doorwaySide: "south" } }),
    ];
    const issues = rule.check(entities, { ...context, allEntities: entities });
    expect(issues.some((i) => i.code === "tree_blocks_door")).toBe(true);
  });

  it("detects floating tree", () => {
    const entities = [
      makeEntity({ id: "tree1", category: "tree", position: { x: 10, y: 10 }, positionZ: 5 }),
    ];
    const issues = rule.check(entities, { ...context, allEntities: entities });
    expect(issues.some((i) => i.code === "tree_not_grounded")).toBe(true);
  });
});
