import { describe, it, expect, beforeEach } from "vitest";
import { PriceBalancer } from "../modules/market/PriceBalancer.js";

describe("PriceBalancer", () => {
  let balancer: PriceBalancer;

  beforeEach(() => {
    balancer = new PriceBalancer();
  });

  it("should return basePrice when supply and demand are equal", () => {
    // 100 * (50 / max(1, 50)) = 100
    expect(balancer.balance(100, 50, 50)).toBe(100);
  });

  it("should increase price when demand is greater than supply", () => {
    // 100 * (100 / max(1, 50)) = 200
    expect(balancer.balance(100, 50, 100)).toBe(200);
  });

  it("should decrease price when supply is greater than demand", () => {
    // 100 * (25 / max(1, 50)) = 50
    expect(balancer.balance(100, 50, 25)).toBe(50);
  });

  it("should never drop price below 1", () => {
    // 10 * (1 / max(1, 100)) = 0.1 -> max(1, 0.1) = 1
    expect(balancer.balance(10, 100, 1)).toBe(1);
  });

  it("should handle 0 supply by treating it as 1 to avoid division by zero", () => {
    // 100 * (50 / max(1, 0)) = 100 * (50 / 1) = 5000
    expect(balancer.balance(100, 0, 50)).toBe(5000);
  });

  it("should handle 0 demand by returning 1", () => {
    // 100 * (0 / max(1, 50)) = 0 -> max(1, 0) = 1
    expect(balancer.balance(100, 50, 0)).toBe(1);
  });
});
