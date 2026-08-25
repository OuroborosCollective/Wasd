import { describe, expect, it } from "vitest";
import { HeuristicGoalPruner } from "../modules/npc/HeuristicGoalPruner";

describe("HeuristicGoalPruner", () => {
  it("keeps all goals below the echo threshold and returns an isolated result array", () => {
    const pruner = new HeuristicGoalPruner();
    const goals = [
      { id: "walk", isCritical: false, priority: 20 },
      { id: "defend", isCritical: true, priority: 80 },
    ];

    const result = pruner.prune(goals, { tick: 10, echoIntensity: 0.5, maxGoals: 2 });

    expect(result.kept).toHaveLength(2);
    expect(result.kept).toEqual([
      { id: "defend", isCritical: true, priority: 80 },
      { id: "walk", isCritical: false, priority: 20 },
    ]);
    expect(result.kept).not.toBe(goals);
    expect(result.removed).toEqual([]);
  });

  it("reduces goals to critical goals at or above the echo threshold", () => {
    const pruner = new HeuristicGoalPruner();
    const goals = [
      { id: "walk", isCritical: false, priority: 20 },
      { id: "defend", isCritical: true, priority: 80 },
      { id: "celebrate", isCritical: false, priority: 10 },
    ];

    const result = pruner.prune(goals, { tick: 10, echoIntensity: 0.8, maxGoals: 3 });

    expect(result.kept).toEqual([{ id: "defend", isCritical: true, priority: 80 }]);
    expect(result.removed.map((entry) => entry.reason)).toEqual(["echo_non_critical", "echo_non_critical"]);
  });

  it("treats invalid goal input deterministically", () => {
    const pruner = new HeuristicGoalPruner();

    expect(pruner.prune(null, { tick: 0, maxGoals: 3 })).toEqual({ kept: [], removed: [] });
    expect(pruner.prune(undefined, { tick: 0, maxGoals: 3 })).toEqual({ kept: [], removed: [] });
  });

  it("uses squared distance checks without mutating positions", () => {
    const origin = { x: 0, y: 0 };
    const near = { x: 24, y: 31 };
    const far = { x: 40, y: 0 };

    expect(HeuristicGoalPruner.isWithinRadius(origin.x, origin.y, near.x, near.y, 40)).toBe(true);
    expect(HeuristicGoalPruner.isWithinRadius(origin.x, origin.y, far.x, far.y, 40)).toBe(false);
    expect(origin).toEqual({ x: 0, y: 0 });
  });

  it("applies the echo threshold from the explicit deterministic context", () => {
    const pruner = new HeuristicGoalPruner();
    const goals = [
      { id: "idle", isCritical: false, priority: 20 },
      { id: "guard", isCritical: true, priority: 80 },
    ];

    expect(pruner.prune(goals, { tick: 1, echoIntensity: 0.69, maxGoals: 2 }).kept).toHaveLength(2);
    expect(pruner.prune(goals, { tick: 1, echoIntensity: 0.7, maxGoals: 2 }).kept).toEqual([
      { id: "guard", isCritical: true, priority: 80 },
    ]);
  });
});
