import { describe, it, expect, beforeEach } from "vitest";
import { MarketExpansion } from "../../../modules/market/MarketExpansion.js";

describe("MarketExpansion", () => {
  let expansion: MarketExpansion;

  beforeEach(() => {
    expansion = new MarketExpansion();
  });

  it("should initialize market level to 2 if marketLevel is undefined", () => {
    const city: any = {};
    const newLevel = expansion.expand(city);
    expect(newLevel).toBe(2);
    expect(city.marketLevel).toBe(2);
  });

  it("should increment market level by 1 if marketLevel already exists", () => {
    const city: any = { marketLevel: 5 };
    const newLevel = expansion.expand(city);
    expect(newLevel).toBe(6);
    expect(city.marketLevel).toBe(6);
  });

  it("should initialize market level to 2 if marketLevel is null", () => {
    const city: any = { marketLevel: null };
    const newLevel = expansion.expand(city);
    expect(newLevel).toBe(2);
    expect(city.marketLevel).toBe(2);
  });

  it("should correctly handle marketLevel 0", () => {
    const city: any = { marketLevel: 0 };
    const newLevel = expansion.expand(city);
    expect(newLevel).toBe(1);
    expect(city.marketLevel).toBe(1);
  });

  it("should incorrectly initialize to 2 if market level is completely absent (testing ?? behavior)", () => {
    // Note: ?? 1 treats undefined/null as 1, so (undefined ?? 1) + 1 = 2
    const city: any = {};
    const newLevel = expansion.expand(city);
    expect(newLevel).toBe(2);
  });
});
