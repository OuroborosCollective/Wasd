import { describe, it, expect } from "vitest";
import { buildStarterVillageObjects } from "../modules/world/VillageLayoutSeeder.js";

describe("VillageLayoutSeeder", () => {
  it("buildStarterVillageObjects() returns roads, buildings, well, and walls", () => {
    const objs = buildStarterVillageObjects({ x: 0, y: 0 });
    expect(objs.length).toBeGreaterThan(20);
    expect(objs.every((o) => o.id.startsWith("vlg_seed_"))).toBe(true);
    expect(objs.some((o) => o.type === "road")).toBe(true);
    expect(objs.some((o) => o.type === "building")).toBe(true);
    expect(objs.some((o) => o.type === "prop" && o.glbPath?.includes("well"))).toBe(true);
    expect(objs.some((o) => o.type === "wall")).toBe(true);
    const ids = new Set(objs.map((o) => o.id));
    expect(ids.size).toBe(objs.length);
  });
});
