import { describe, it, expect, beforeEach } from "vitest";
import { RuinEvolutionEngine } from "../../../modules/history/RuinEvolutionEngine";

describe("RuinEvolutionEngine", () => {
  let engine: RuinEvolutionEngine;

  beforeEach(() => {
    engine = new RuinEvolutionEngine();

  });


  it("should evolve a structure into a ruin", () => {
    const inputStructure = {
      id: "struct-1",
      name: "Great Hall",
      type: "building",
      state: "active"
    };

    const result = engine.evolve(inputStructure);

    expect(result).toEqual({
      id: "struct-1",
      name: "Great Hall",
      type: "building",
      state: "ruin",
      evolvedAt: 0
    });
  });

  it("should overwrite existing state and evolvedAt fields", () => {
    const inputStructure = {
      id: "struct-2",
      state: "pristine",
      evolvedAt: 1000
    };

    const result = engine.evolve(inputStructure);

    expect(result.state).toBe("ruin");
    expect(result.evolvedAt).toBe(0);
  });
});
