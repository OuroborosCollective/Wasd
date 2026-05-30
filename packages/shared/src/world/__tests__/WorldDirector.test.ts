import { describe, expect, it } from "vitest";
import { ticksToSeconds, toARETick } from "../AREClock";
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

  it("preserves fractional seconds for 10hz ARE ticks", () => {
    expect(ticksToSeconds(toARETick(1))).toBe(0.1);
    expect(ticksToSeconds(toARETick(15))).toBe(1.5);
  });

  it("does not place building lot footprints on roads or other lot footprints", () => {
    const plan = generateChunkScenePlan(baseInput);
    const occupied = new Set<string>(Object.keys(plan.roads.roadCells));
    for (const lot of plan.settlement.lots) {
      for (let dz = 0; dz < lot.depthTiles; dz += 1) {
        for (let dx = 0; dx < lot.widthTiles; dx += 1) {
          const key = `${lot.tileX + dx}:${lot.tileZ + dz}`;
          expect(occupied.has(key)).toBe(false);
          occupied.add(key);
        }
      }
    }
  });

  it("includes every building lot footprint in collision cells", () => {
    const plan = generateChunkScenePlan(baseInput);
    for (const lot of plan.settlement.lots) {
      for (let dz = 0; dz < lot.depthTiles; dz += 1) {
        for (let dx = 0; dx < lot.widthTiles; dx += 1) {
          expect(plan.collisionCells[`${lot.tileX + dx}:${lot.tileZ + dz}`]).toBe(true);
        }
      }
    }
  });
});
