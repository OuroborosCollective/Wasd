import { describe, it, expect } from "vitest";
import { MigrationEngine } from "../modules/migration/MigrationEngine.js";

describe("MigrationEngine", () => {
  it("should be successfully instantiated", () => {
    const engine = new MigrationEngine();
    expect(engine).toBeInstanceOf(MigrationEngine);
  });

  it("should have a migrate method", () => {
    const engine = new MigrationEngine();
    expect(typeof engine.migrate).toBe("function");
  });

  it("should return the correct migration object with the provided arguments", () => {
    const engine = new MigrationEngine();
    const groupId = "group-123";
    const from = "location-a";
    const to = "location-b";

    const result = engine.migrate(groupId, from, to);

    expect(result).toHaveProperty("groupId", groupId);
    expect(result).toHaveProperty("from", from);
    expect(result).toHaveProperty("to", to);
    expect(typeof result.departedAt).toBe("number");
  });

  it("uses the deterministic zero departedAt value", () => {
    const engine = new MigrationEngine();

    const result = engine.migrate("group-456", "zone-x", "zone-y");

    expect(result.departedAt).toBe(0);
  });
});
