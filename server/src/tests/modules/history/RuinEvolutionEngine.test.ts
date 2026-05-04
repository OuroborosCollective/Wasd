// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RuinEvolutionEngine } from "../../../modules/history/RuinEvolutionEngine";

describe("RuinEvolutionEngine", () => {
  let engine: RuinEvolutionEngine;

  beforeEach(() => {
    engine = new RuinEvolutionEngine();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should evolve a structure into a ruin", () => {
    const now = new Date("2024-01-01T00:00:00Z").getTime();
    vi.setSystemTime(now);

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
      evolvedAt: now
    });
  });

  it("should overwrite existing state and evolvedAt fields", () => {
    const now = new Date("2024-01-01T00:00:00Z").getTime();
    vi.setSystemTime(now);

    const inputStructure = {
      id: "struct-2",
      state: "pristine",
      evolvedAt: 1000
    };

    const result = engine.evolve(inputStructure);

    expect(result.state).toBe("ruin");
    expect(result.evolvedAt).toBe(now);
  });
});
