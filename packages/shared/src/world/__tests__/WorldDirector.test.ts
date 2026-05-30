import { describe, expect, it } from "vitest";
import { generateChunkScenePlan } from "../WorldDirector";

const baseInput = {
  worldSeed: "areloria:earth_1_1",
  chunkX: 0,
  chunkZ: 0,
  biomeId: "forest_village" as const,
  kappa: 1000 as const,
  chunkTiles: 16,
};

describe("OuroborosWorldDirectorV1", () => {
  it("returns identical plans for identical payloads", () => {
    const a = generateChunkScenePlan(baseInput);
    const b = generateChunkScenePlan(baseInput);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("changes the plan when chunk coordinates change", () => {
    const a = generateChunkScenePlan(baseInput);
    const b = generateChunkScenePlan({ ...baseInput, chunkX: 1 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("generates a village-ready scene plan", () => {
    const plan = generateChunkScenePlan(baseInput);
    expect(plan.generatedBy).toBe("OuroborosWorldDirectorV1");
    expect(plan.settlement.settlementType).toBe("village");
    expect(plan.roads.edges.length).toBeGreaterThan(0);
    expect(plan.settlement.lots.length).toBeGreaterThanOrEqual(5);
    expect(plan.npcs).toHaveLength(13);
  });
});
