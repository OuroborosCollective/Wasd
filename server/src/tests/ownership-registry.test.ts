import { describe, it, expect, beforeEach } from "vitest";
import { OwnershipRegistry } from "../modules/housing/OwnershipRegistry.js";

describe("OwnershipRegistry", () => {
  let registry: OwnershipRegistry;

  beforeEach(() => { registry = new OwnershipRegistry(); });

  it("get() returns null for unregistered object", () => {
    expect(registry.get("castle_1")).toBeNull();
  });

  it("register() then get() returns the ownership record", () => {
    registry.register("castle_1", "kingdom", "k_areloria");
    const record = registry.get("castle_1");
    expect(record).toEqual({ ownerType: "kingdom", ownerId: "k_areloria" });
  });

  it("register() overwrites an existing record", () => {
    registry.register("plot_A", "player", "p1");
    registry.register("plot_A", "guild", "guild_iron");
    expect(registry.get("plot_A")?.ownerId).toBe("guild_iron");
    expect(registry.get("plot_A")?.ownerType).toBe("guild");
  });

  it("different objects track independently", () => {
    registry.register("obj_1", "player", "p1");
    registry.register("obj_2", "player", "p2");
    expect(registry.get("obj_1")?.ownerId).toBe("p1");
    expect(registry.get("obj_2")?.ownerId).toBe("p2");
  });
});
