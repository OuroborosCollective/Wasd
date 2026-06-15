import { describe, expect, it } from "vitest";
import { buildRuntimeMarketSnapshot } from "../economy/RuntimeMarketPricing.js";

const emptyVendorEconomy = { vendors: [] } as const;

describe("RuntimeMarketPricing", () => {
  it("derives stable prices from tick, resource counters and stock counters", () => {
    const first = buildRuntimeMarketSnapshot(
      120,
      [
        { resourceId: "wood", available: true },
        { resourceId: "wood_log", available: true },
        { resourceId: "fish", available: false },
      ],
      { vendors: [{ stock: [{ itemId: "wood_log", quantity: 12 }] }] },
      [{ items: [{ itemId: "raw_fish", quantity: 2 }] }],
    );

    const replay = buildRuntimeMarketSnapshot(
      120,
      [
        { resourceId: "fish", available: false },
        { resourceId: "wood_log", available: true },
        { resourceId: "wood", available: true },
      ],
      { vendors: [{ stock: [{ itemId: "wood_log", quantity: 12 }] }] },
      [{ items: [{ itemId: "raw_fish", quantity: 2 }] }],
    );

    expect(replay).toEqual(first);
    expect(first.marketHash.startsWith("market:")).toBe(true);
    expect(first.prices.map((price) => price.itemId)).toEqual([
      "cooked_fish",
      "copper_ingot",
      "copper_ore",
      "raw_fish",
      "wood_log",
      "wood_plank",
    ]);
    expect(first.prices.find((price) => price.itemId === "wood_log")).toMatchObject({
      stockQuantity: 12,
      availableResourceNodes: 2,
      demandBand: "stocked",
    });
  });

  it("raises scarce raw prices and lowers abundant or oversupplied prices deterministically", () => {
    const scarce = buildRuntimeMarketSnapshot(9, [], emptyVendorEconomy, []);
    const abundant = buildRuntimeMarketSnapshot(
      9,
      [
        { resourceId: "wood", available: true },
        { resourceId: "tree", available: true },
        { resourceId: "forest", available: true },
        { resourceId: "wood_log", available: true },
      ],
      emptyVendorEconomy,
      [],
    );
    const oversupplied = buildRuntimeMarketSnapshot(
      9,
      [],
      { vendors: [{ stock: [{ itemId: "wood_log", quantity: 30 }] }] },
      [],
    );

    expect(scarce.prices.find((price) => price.itemId === "wood_log")?.unitPrice).toBe(2);
    expect(abundant.prices.find((price) => price.itemId === "wood_log")?.unitPrice).toBe(1);
    expect(oversupplied.prices.find((price) => price.itemId === "wood_log")).toMatchObject({
      unitPrice: 1,
      stockQuantity: 30,
      demandBand: "oversupplied",
    });
  });

  it("changes the market hash when the tick changes", () => {
    const a = buildRuntimeMarketSnapshot(1, [], emptyVendorEconomy, []);
    const b = buildRuntimeMarketSnapshot(2, [], emptyVendorEconomy, []);

    expect(a.marketHash).not.toEqual(b.marketHash);
    expect(a.prices).toEqual(b.prices);
  });
});
