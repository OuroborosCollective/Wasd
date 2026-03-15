import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  }
}));

vi.mock("path", () => ({
  default: {
    resolve: vi.fn(),
  }
}));

describe("ItemRegistry", () => {
  beforeEach(() => {
    // Reset the static state of ItemRegistry
    // @ts-ignore - accessing private property for testing
    ItemRegistry.ITEM_REGISTRY = {};
    // @ts-ignore - accessing private property for testing
    ItemRegistry.initialized = false;

    vi.clearAllMocks();

    // Default path resolve mock
    (path.resolve as any).mockReturnValue("/mocked/path/items.json");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("init", () => {
    it("should load item data when file exists", () => {
      const mockItems = [
        { id: "sword_01", name: "Iron Sword", type: "weapon", rarity: "common", description: "A basic sword." }
      ];

      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(mockItems));

      ItemRegistry.init();

      expect(fs.existsSync).toHaveBeenCalledWith("/mocked/path/items.json");
      expect(fs.readFileSync).toHaveBeenCalledWith("/mocked/path/items.json", "utf-8");

      const item = ItemRegistry.getItem("sword_01");
      expect(item).toBeDefined();
      expect(item?.name).toBe("Iron Sword");
    });

    it("should not crash when file does not exist", () => {
      (fs.existsSync as any).mockReturnValue(false);

      expect(() => ItemRegistry.init()).not.toThrow();

      // Should mark as initialized even if file missing
      // @ts-ignore
      expect(ItemRegistry.initialized).toBe(true);
    });

    it("should handle JSON parse errors gracefully", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue("invalid json");

      expect(() => ItemRegistry.init()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith("Error loading Item data:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should not re-initialize if already initialized", () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify([]));

      ItemRegistry.init();
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      ItemRegistry.init();
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe("getItem", () => {
    it("should auto-initialize and return item", () => {
      const mockItems = [{ id: "shield_01", name: "Wooden Shield", type: "armor", rarity: "common", description: "A basic shield." }];
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(mockItems));

      const item = ItemRegistry.getItem("shield_01");
      expect(item).toBeDefined();
      expect(item?.name).toBe("Wooden Shield");
    });

    it("should return undefined for unknown item", () => {
      (fs.existsSync as any).mockReturnValue(false);

      const item = ItemRegistry.getItem("unknown_item");
      expect(item).toBeUndefined();
    });
  });

  describe("createInstance", () => {
    it("should return a copy of the item definition", () => {
      const mockItems = [{ id: "potion_01", name: "Health Potion", type: "consumable", rarity: "common", description: "Heals 50 HP." }];
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(mockItems));

      const instance1 = ItemRegistry.createInstance("potion_01");
      const instance2 = ItemRegistry.createInstance("potion_01");

      expect(instance1).toEqual(mockItems[0]);
      expect(instance1).not.toBe(mockItems[0]); // Not the exact same reference
      expect(instance1).not.toBe(instance2); // Two instances are different objects
    });

    it("should return null for unknown item", () => {
      (fs.existsSync as any).mockReturnValue(false);

      const instance = ItemRegistry.createInstance("unknown_item");
      expect(instance).toBeNull();
    });
  });

  describe("hydrate", () => {
    it("should merge registry definition into existing item object", () => {
      const mockItems = [{ id: "axe_01", name: "Battle Axe", type: "weapon", damage: 15, rarity: "uncommon", description: "A sharp axe." }];
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(mockItems));

      const savedItem = { id: "axe_01", customData: "some value", durability: 100 };
      const hydrated = ItemRegistry.hydrate(savedItem);

      expect(hydrated).toEqual({
        id: "axe_01",
        customData: "some value",
        durability: 100,
        name: "Battle Axe",
        type: "weapon",
        damage: 15,
        rarity: "uncommon",
        description: "A sharp axe."
      });
    });

    it("should return original item if id is missing or unknown", () => {
      (fs.existsSync as any).mockReturnValue(false);

      const noIdItem = { someData: "test" };
      expect(ItemRegistry.hydrate(noIdItem)).toEqual(noIdItem);

      const unknownItem = { id: "unknown" };
      expect(ItemRegistry.hydrate(unknownItem)).toEqual(unknownItem);
    });

    it("should return null if item is null", () => {
      expect(ItemRegistry.hydrate(null)).toBeNull();
    });
  });
});
