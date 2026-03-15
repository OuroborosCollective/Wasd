import { describe, it, expect, beforeEach } from "vitest";
import { FarmingSystem } from "../modules/farming/FarmingSystem.js";
import { TreeGrowthSystem } from "../modules/farming/TreeGrowthSystem.js";
import { SeasonalGrowthBridge } from "../modules/weather/SeasonalGrowthBridge.js";

// ---------------------------------------------------------------------------
// FarmingSystem
// ---------------------------------------------------------------------------
describe("FarmingSystem", () => {
  let farming: FarmingSystem;

  beforeEach(() => { farming = new FarmingSystem(); });

  it("plant() returns an object with the correct seedId", () => {
    const result = farming.plant("wheat_seed", "plot_1");
    expect(result.seedId).toBe("wheat_seed");
  });

  it("plant() returns an object with the correct plotId", () => {
    const result = farming.plant("wheat_seed", "plot_1");
    expect(result.plotId).toBe("plot_1");
  });

  it("plant() includes a plantedAt timestamp", () => {
    const before = Date.now();
    const result = farming.plant("carrot_seed", "plot_2");
    const after = Date.now();
    expect(result.plantedAt).toBeGreaterThanOrEqual(before);
    expect(result.plantedAt).toBeLessThanOrEqual(after);
  });

  it("plant() creates a distinct object per call", () => {
    const r1 = farming.plant("wheat_seed", "plot_1");
    const r2 = farming.plant("carrot_seed", "plot_2");
    expect(r1).not.toBe(r2);
  });
});

// ---------------------------------------------------------------------------
// TreeGrowthSystem
// ---------------------------------------------------------------------------
describe("TreeGrowthSystem", () => {
  let trees: TreeGrowthSystem;

  beforeEach(() => { trees = new TreeGrowthSystem(); });

  it("grow() increments tree stage by 1", () => {
    const tree: any = { stage: 2 };
    trees.grow(tree);
    expect(tree.stage).toBe(3);
  });

  it("grow() returns the mutated tree", () => {
    const tree: any = { stage: 1 };
    const result = trees.grow(tree);
    expect(result).toBe(tree);
  });

  it("grow() does not exceed stage 4", () => {
    const tree: any = { stage: 4 };
    trees.grow(tree);
    expect(tree.stage).toBe(4);
  });

  it("grow() caps at 4 from stage 3", () => {
    const tree: any = { stage: 3 };
    trees.grow(tree);
    expect(tree.stage).toBe(4);
  });

  it("grow() treats undefined stage as 0 and increments to 1", () => {
    const tree: any = {};
    trees.grow(tree);
    expect(tree.stage).toBe(1);
  });

  it("grow() attaches a lastGrowthAt timestamp", () => {
    const before = Date.now();
    const tree: any = { stage: 0 };
    trees.grow(tree);
    const after = Date.now();
    expect(tree.lastGrowthAt).toBeGreaterThanOrEqual(before);
    expect(tree.lastGrowthAt).toBeLessThanOrEqual(after);
  });

  it("multiple grow() calls advance stage sequentially up to max", () => {
    const tree: any = { stage: 0 };
    for (let i = 0; i < 10; i++) trees.grow(tree);
    expect(tree.stage).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// SeasonalGrowthBridge
// ---------------------------------------------------------------------------
describe("SeasonalGrowthBridge", () => {
  let bridge: SeasonalGrowthBridge;

  beforeEach(() => { bridge = new SeasonalGrowthBridge(); });

  it("spring applies a +2 modifier to stage", () => {
    expect(bridge.affectGrowth("spring", 1)).toBe(3);
  });

  it("summer applies a +1 modifier to stage", () => {
    expect(bridge.affectGrowth("summer", 2)).toBe(3);
  });

  it("autumn applies a +1 modifier to stage", () => {
    expect(bridge.affectGrowth("autumn", 2)).toBe(3);
  });

  it("winter applies a -1 modifier to stage", () => {
    expect(bridge.affectGrowth("winter", 3)).toBe(2);
  });

  it("stage never goes below 0 in winter", () => {
    expect(bridge.affectGrowth("winter", 0)).toBe(0);
  });

  it("stage 1 in winter becomes 0 (clamped)", () => {
    expect(bridge.affectGrowth("winter", 1)).toBe(0);
  });

  it("unknown season applies a +1 modifier", () => {
    expect(bridge.affectGrowth("monsoon", 2)).toBe(3);
  });

  it("spring modifier is double the default", () => {
    const spring = bridge.affectGrowth("spring", 0);
    const summer = bridge.affectGrowth("summer", 0);
    expect(spring).toBe(summer * 2);
  });
});
