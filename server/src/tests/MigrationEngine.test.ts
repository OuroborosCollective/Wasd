import { describe, it, expect, vi } from "vitest";
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

  it("should record the current timestamp for departedAt", () => {
    const engine = new MigrationEngine();

    const now = 1600000000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const result = engine.migrate("group-456", "zone-x", "zone-y");

    expect(result.departedAt).toBe(now);

    vi.restoreAllMocks();
  });
});
