import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";

describe("ItemRegistry", () => {
  beforeEach(() => {
    // Reset the static initialized flag using an internal workaround or re-import if necessary.
    // For testing, we can reset it directly if it's accessible or use a workaround.
    // Since initialized is private, we will cast to any to reset it.
    (ItemRegistry as any).initialized = false;
    (ItemRegistry as any).ITEM_REGISTRY = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize and load items successfully if file exists", () => {
    const mockItems = [
      { id: "sword", name: "Iron Sword", type: "weapon", rarity: "common", description: "A basic sword" }
    ];

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(mockItems));

    ItemRegistry.init();

    expect((ItemRegistry as any).initialized).toBe(true);
    const item = ItemRegistry.getItem("sword");
    expect(item).toBeDefined();
    expect(item?.name).toBe("Iron Sword");
  });

  it("should handle error when reading file throws", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("File read error");
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // This shouldn't throw but catch the error inside
    ItemRegistry.init();

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading Item data:", expect.any(Error));
    expect((ItemRegistry as any).initialized).toBe(true); // Should set initialized to true even if it fails
    expect(ItemRegistry.getItem("sword")).toBeUndefined();
  });

  it("should do nothing if initialized is already true", () => {
    const existsSyncSpy = vi.spyOn(fs, "existsSync");

    (ItemRegistry as any).initialized = true;
    ItemRegistry.init();

    expect(existsSyncSpy).not.toHaveBeenCalled();
  });

  it("should return undefined if file doesn't exist", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    ItemRegistry.init();

    expect((ItemRegistry as any).initialized).toBe(true);
    expect(Object.keys((ItemRegistry as any).ITEM_REGISTRY).length).toBe(0);
  });
});
