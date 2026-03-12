import fs from "fs";
import path from "path";

/**
 * Static descriptor for a single item type as stored in
 * `game-data/items/items.json`.
 *
 * @property id          - Unique machine identifier (e.g. `"iron_sword"`).
 * @property name        - Human-readable display name.
 * @property type        - Broad category used to determine equipment slot
 *                         eligibility and game-system interactions.
 * @property slot        - Equipment slot this item occupies when equipped.
 *                         Only present on equippable items.
 * @property damage      - Base damage contribution when used as a weapon.
 *                         Only present on weapon-type items.
 * @property rarity      - Scarcity tier affecting drop rates and presentation.
 * @property description - Flavour text shown in the client UI.
 */
export interface ItemDefinition {
  id: string;
  name: string;
  type: "weapon" | "armor" | "consumable" | "misc";
  slot?: "weapon" | "armor";
  damage?: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  description: string;
}

/**
 * ItemRegistry — singleton catalogue of all item definitions.
 *
 * Loads item data lazily from `game-data/items/items.json` on the first
 * access and caches it in a static in-memory map for the lifetime of the
 * process.  All methods are `static`; do not instantiate this class.
 *
 * ### Lifecycle
 * - {@link init} — reads and parses the JSON file.  Called automatically by
 *   the other static methods on first use, so explicit initialisation is
 *   optional unless you need to guarantee data is available at a specific
 *   program point.
 * - {@link getItem} — lookup by ID; returns `undefined` for unknown IDs.
 * - {@link createInstance} — returns a shallow copy of a definition so that
 *   callers can mutate the returned object without corrupting the registry.
 * - {@link hydrate} — merges a bare `{ id }` stub (as stored in
 *   `data/players.json`) with the full definition, restoring all fields.
 *
 * @example
 * const sword = ItemRegistry.getItem("iron_sword");
 * // { id: "iron_sword", name: "Iron Sword", type: "weapon", damage: 8, ... }
 *
 * const instance = ItemRegistry.createInstance("iron_sword");
 * instance.damage = 999; // safe — does not affect the registry
 */
export class ItemRegistry {
  private static ITEM_REGISTRY: Record<string, ItemDefinition> = {};
  private static initialized = false;

  /**
   * Loads item definitions from `game-data/items/items.json` into the
   * static registry.  Safe to call multiple times; subsequent calls are
   * no-ops.  Parse/IO errors are caught and logged to `console.error`.
   */
  static init() {
    if (this.initialized) return;
    try {
      const itemsPath = path.resolve(process.cwd(), "game-data/items/items.json");
      if (fs.existsSync(itemsPath)) {
        const itemData = JSON.parse(fs.readFileSync(itemsPath, "utf-8"));
        itemData.forEach((item: ItemDefinition) => {
          this.ITEM_REGISTRY[item.id] = item;
        });
      }
    } catch (error) {
      console.error("Error loading Item data:", error);
    }
    this.initialized = true;
  }

  /**
   * Returns the full item definition for the given ID, initialising the
   * registry if necessary.
   *
   * @param id - Item identifier matching the `id` field in `items.json`.
   * @returns The {@link ItemDefinition}, or `undefined` if not found.
   */
  static getItem(id: string): ItemDefinition | undefined {
    if (!this.initialized) this.init();
    return this.ITEM_REGISTRY[id];
  }

  /**
   * Creates a shallow copy of the item definition identified by `id`.
   *
   * Use this when you need a mutable item instance (e.g. a loot drop) that
   * won't affect the shared registry entry if mutated.
   *
   * @param id - Item identifier.
   * @returns A shallow copy of the {@link ItemDefinition}, or `null` if the
   *          ID is not found in the registry.
   */
  static createInstance(id: string) {
    if (!this.initialized) this.init();
    const def = this.getItem(id);
    if (!def) return null;
    // Return a copy to avoid mutation of the registry
    return { ...def };
  }

  /**
   * Expands a compact `{ id }` item stub into a fully-populated item object
   * by merging the stored definition on top of the stub.
   *
   * Used during player data loading to restore items from their persisted
   * form (see {@link WorldTick.hydratePlayer}).  Any extra fields present on
   * the stub (e.g. custom instance data) are preserved and overridden only
   * where the registry has matching keys.
   *
   * @param item - An object that must have at least an `id` property.
   *               Returned unchanged if `item` is falsy or has no `id`.
   * @returns The hydrated item object, or the original `item` unchanged if
   *          no matching definition exists.
   */
  static hydrate(item: any) {
    if (!this.initialized) this.init();
    if (!item || !item.id) return item;
    const def = this.getItem(item.id);
    if (!def) return item;
    // Merge registry definition into the item object
    return { ...item, ...def };
  }
}
