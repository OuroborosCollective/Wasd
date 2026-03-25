import { describe, it, expect, beforeEach } from "vitest";
import { AffixSystem } from "../modules/items/AffixSystem.js";

describe("items/AffixSystem", () => {
  let affixSystem: AffixSystem;
  let samplePool: string[];

  beforeEach(() => {
    affixSystem = new AffixSystem();
    samplePool = ["strength", "agility", "intellect", "stamina", "spirit"];
  });

  it("should have an apply method", () => {
    expect(typeof affixSystem.apply).toBe("function");
    // Just verifying it doesn't throw
    expect(() => affixSystem.apply()).not.toThrow();
  });

  it("should return a single affix when count is not provided (default 1)", () => {
    const result = affixSystem.rollAffixes(samplePool);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("strength");
  });

  it("should return the specified number of affixes when count is provided", () => {
    const result = affixSystem.rollAffixes(samplePool, 3);
    expect(result).toHaveLength(3);
    expect(result).toEqual(["strength", "agility", "intellect"]);
  });

  it("should return the entire pool if count exceeds pool size", () => {
    const result = affixSystem.rollAffixes(samplePool, 10);
    expect(result).toHaveLength(5);
    expect(result).toEqual(samplePool);
  });

  it("should return an empty array if count is 0", () => {
    const result = affixSystem.rollAffixes(samplePool, 0);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should return an empty array if count is negative", () => {
    const result = affixSystem.rollAffixes(samplePool, -5);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should return an empty array if pool is empty", () => {
    const result = affixSystem.rollAffixes([], 3);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });
});
