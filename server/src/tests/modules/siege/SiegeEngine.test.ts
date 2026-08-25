import { describe, it, expect } from "vitest";
import { SiegeEngine } from "../../../modules/siege/SiegeEngine";

describe("SiegeEngine", () => {
  it("should return correct siege object on start", () => {
    const engine = new SiegeEngine();
    const attacker = { id: "attacker_123" };
    const target = { id: "target_456" };

    const result = engine.start(attacker, target);

    expect(result.type).toBe("siege_started");
    expect(result.attacker).toBe(attacker.id);
    expect(result.target).toBe(target.id);
    expect(result.startedAt).toBe(0);
  });
});
