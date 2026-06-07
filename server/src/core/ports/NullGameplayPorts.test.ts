import { describe, expect, it } from "vitest";
import { NullCraftingPort, NullPlacementPort, NullSkillPort } from "./NullGameplayPorts.js";

describe("NullGameplayPorts", () => {
  it("return explicit deterministic failures", () => {
    expect(new NullCraftingPort().craft("p1", "r1", 1)).toEqual({
      ok: false,
      reason: "crafting_not_connected",
    });

    expect(new NullSkillPort().useSkill("p1", "s1", 1)).toEqual({
      ok: false,
      reason: "skill_not_connected",
    });

    expect(new NullPlacementPort().place("p1", "b1", 1, 2, 3)).toEqual({
      ok: false,
      reason: "placement_not_connected",
    });
  });
});