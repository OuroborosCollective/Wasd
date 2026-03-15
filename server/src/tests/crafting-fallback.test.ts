import { describe, it, expect, vi } from "vitest";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";
import fs from "fs";

describe("CraftingSystem Fallback", () => {
  it("should catch errors when reading recipes and fallback", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const readSpy = vi.spyOn(fs.promises, "readFile").mockRejectedValue(new Error("Mock read error"));

    const sys = new CraftingSystem();
    await sys.loadRecipes();

    expect(consoleSpy).toHaveBeenCalledWith("Failed to load crafting recipes:", expect.any(Error));
    const recipes = sys.getRecipes();
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes.find(r => r.id === "iron_sword_craft")).toBeDefined();

    consoleSpy.mockRestore();

    readSpy.mockRestore();
  });
});
