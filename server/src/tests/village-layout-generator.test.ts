import { describe, it, expect } from "vitest";
import {
  buildLogicalStarterVillage,
  hasStarterVillageLayout,
} from "../modules/world/VillageLayoutGenerator.js";

describe("VillageLayoutGenerator", () => {
  it("emits roads, buildings, and a well", () => {
    const objs = buildLogicalStarterVillage({ origin: { x: 10, y: 20 } });
    const types = new Set(objs.map((o) => o.type));
    expect(types.has("road")).toBe(true);
    expect(types.has("building")).toBe(true);
    expect(types.has("prop")).toBe(true);
    expect(objs.some((o) => o.id === "logical_village_well")).toBe(true);
    expect(objs.every((o) => typeof o.glbPath === "string" && o.glbPath.length > 0)).toBe(true);
  });

  it("detects starter layout via street ids", () => {
    const objs = buildLogicalStarterVillage();
    expect(hasStarterVillageLayout(objs)).toBe(true);
    expect(hasStarterVillageLayout([{ id: "other", type: "tree", name: "t", position: { x: 0, y: 0 } }])).toBe(false);
  });
});
