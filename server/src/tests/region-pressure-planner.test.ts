import { describe, expect, it } from "vitest";
import { planRegionPressure } from "../world/RegionPressurePlanner.js";

describe("RegionPressurePlanner", () => {
  it("produces deterministic pressure for identical input", () => {
    const input = {
      tick: 10,
      regionId: "starter_village",
      chunkKeys: ["0:0", "0:1"],
      governanceSignals: {
        warPressurePerMille: { valuePerMille: 250, support: "supported" },
      },
    };
    expect(planRegionPressure(input)).toEqual(planRegionPressure(input));
  });
});
