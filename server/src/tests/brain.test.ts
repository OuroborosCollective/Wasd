import { describe, it, expect } from "vitest";
import { HeuristicWorldBrain } from "../modules/brain/HeuristicWorldBrain.js";

describe("HeuristicWorldBrain", () => {
  it("should analyze context correctly", () => {
    const brain = new HeuristicWorldBrain();
    const context = {
      economy: { activeMarkets: 1 },
      politics: {},
      world: { resourceCount: 500, npcCount: 100 },
      npcMemory: []
    } as any;

    const result = brain.analyze(context);
    expect(result.nodes).toBe(13);
    expect(result.centerValue).toBeGreaterThanOrEqual(0);
    expect(result.centerValue).toBeLessThanOrEqual(1);
  });
});
