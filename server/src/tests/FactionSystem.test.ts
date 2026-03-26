import { describe, it, expect, beforeEach } from "vitest";
import { FactionSystem } from "../modules/faction/FactionSystem.js";

describe("FactionSystem", () => {
  let factionSystem: FactionSystem;

  beforeEach(() => {
    factionSystem = new FactionSystem();
  });

  it("should create a faction and store it correctly", () => {
    const data = { name: "The Brotherhood", color: "red" };
    const faction = factionSystem.create("f1", data);

    expect(faction).toBeDefined();
    expect(faction.id).toBe("f1");
    expect(faction.name).toBe("The Brotherhood");
    expect(faction.color).toBe("red");
  });

  it("should get an existing faction by id", () => {
    factionSystem.create("f2", { name: "Order of Light" });
    const faction = factionSystem.get("f2");

    expect(faction).toBeDefined();
    expect(faction.id).toBe("f2");
    expect(faction.name).toBe("Order of Light");
  });

  it("should return undefined when getting a non-existent faction", () => {
    const faction = factionSystem.get("f3");

    expect(faction).toBeUndefined();
  });

  it("should handle creating factions with empty data", () => {
    const faction = factionSystem.create("f4", {});

    expect(faction).toBeDefined();
    expect(faction.id).toBe("f4");
    expect(Object.keys(faction).length).toBe(1); // Only the id should be present
  });
});
