import { describe, it, expect } from "vitest";
import { getSkillDefinition } from "../modules/skill/skillDefinitions.js";

describe("skillDefinitions", () => {
  it("ember_bolt exists", () => {
    const s = getSkillDefinition("ember_bolt");
    expect(s?.manaCost).toBeGreaterThan(0);
    expect(s?.cooldownMs).toBeGreaterThan(0);
  });

  it("frost_shard exists", () => {
    const s = getSkillDefinition("frost_shard");
    expect(s?.manaCost).toBeGreaterThan(0);
    expect(s?.spellPower).toBeGreaterThan(0);
  });

  it("shadow_tag and aether_pulse exist", () => {
    const a = getSkillDefinition("shadow_tag");
    const b = getSkillDefinition("aether_pulse");
    expect(a?.kind).toBe("offensive");
    expect(b?.kind).toBe("offensive");
    expect(a?.cooldownMs).toBeGreaterThan(0);
    expect(b?.cooldownMs).toBeGreaterThan(0);
  });
});
