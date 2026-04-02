import { describe, it, expect } from "vitest";
import { getSkillDefinition } from "../modules/skill/skillDefinitions.js";

describe("skillDefinitions", () => {
  it("ember_bolt exists", () => {
    const s = getSkillDefinition("ember_bolt");
    expect(s?.manaCost).toBeGreaterThan(0);
    expect(s?.cooldownMs).toBeGreaterThan(0);
  });
});
