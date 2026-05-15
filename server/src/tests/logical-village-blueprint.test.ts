import { describe, expect, it } from "vitest";
import { buildLogicalVillageBlueprint } from "../world/generation/LogicalVillageBlueprint.js";

describe("buildLogicalVillageBlueprint", () => {
  it("places a connected street spine, plaza, well, and paired houses", () => {
    const { objects, referencedGlbPaths, recommendedModularGlbs } =
      buildLogicalVillageBlueprint({
        seedId: "test_hub",
        origin: { x: 100, y: -40 },
        halfRows: 3,
        streetStep: 10,
        lotDepth: 12,
      });

    expect(objects.length).toBeGreaterThan(10);
    const roads = objects.filter((o) => o.type === "road");
    const paths = objects.filter((o) => o.type === "path");
    const buildings = objects.filter((o) => o.type === "building");
    const wells = objects.filter((o) => o.type === "well");
    expect(roads.length).toBeGreaterThan(4);
    expect(paths.length).toBe(2);
    expect(buildings.length).toBe(6);
    expect(wells.length).toBe(1);
    expect(new Set(objects.map((o) => o.id)).size).toBe(objects.length);
    expect(referencedGlbPaths.length).toBeGreaterThan(0);
    expect(recommendedModularGlbs.some((p) => p.includes("road_left"))).toBe(
      true,
    );
  });
});
