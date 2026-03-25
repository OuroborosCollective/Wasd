import { describe, it, expect, beforeEach } from "vitest";
import { EquipmentSystem } from "../modules/items/EquipmentSystem.js";

describe("items/EquipmentSystem", () => {
  let equipmentSystem: EquipmentSystem;

  beforeEach(() => {
    equipmentSystem = new EquipmentSystem();
  });

  it("should be instantiable", () => {
    expect(equipmentSystem).toBeInstanceOf(EquipmentSystem);
  });

  it("should have an equip method", () => {
    expect(typeof equipmentSystem.equip).toBe("function");
  });
});
