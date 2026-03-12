import { ItemRegistry } from "./ItemRegistry.js";

/**
 * InventorySystem — manages player item storage and equipment slots.
 *
 * Handles the three core inventory operations — adding, removing, and
 * equipping/unequipping items — for a given player object.  All mutations
 * are applied directly to the player record in memory; callers are
 * responsible for persisting changes via {@link WorldTick.saveAll}.
 *
 * Equipment is currently limited to two named slots:
 * - `weapon` — the active weapon used during combat.
 * - `armor`  — reserved for future use.
 *
 * Item definitions are looked up in {@link ItemRegistry} to determine the
 * correct slot for equipping.
 */
export class InventorySystem {
  /**
   * Appends an item object to the player's inventory array.
   *
   * @param player - The player whose inventory to modify.  Must have an
   *                 `inventory` array property.
   * @param item   - The item object to add (typically a full definition
   *                 created by {@link ItemRegistry.createInstance}).
   * @returns The updated inventory array.
   */
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
  }

  /**
   * Removes all copies of an item from the player's inventory and clears
   * the weapon equipment slot if the removed item was equipped there.
   *
   * Note: this removes **all** inventory entries with the matching ID, not
   * just the first one.  For quantity-aware removal use a dedicated
   * consume helper instead.
   *
   * @param player - The player whose inventory and equipment to modify.
   * @param itemId - The `id` of the item to remove.
   * @returns The updated inventory array.
   */
  removeItem(player: any, itemId: string) {
    // Remove from inventory
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);

    // Remove from equipment if equipped
    if (player.equipment.weapon && player.equipment.weapon.id === itemId) {
      player.equipment.weapon = null;
    }

    return player.inventory;
  }

  /**
   * Moves an item from the player's inventory into the appropriate
   * equipment slot.
   *
   * Only `"weapon"` type items are handled; other item types are silently
   * ignored and `null` is returned.  If a weapon is already equipped it is
   * swapped back into the inventory before the new weapon is slotted.
   *
   * @param player - The player performing the equip action.
   * @param itemId - The `id` of the inventory item to equip.
   * @returns The updated equipment object, or `null` if the item was not
   *          found in the inventory or is not an equippable weapon.
   */
  equipItem(player: any, itemId: string) {
    const itemIndex = player.inventory.findIndex((i: any) => i.id === itemId);
    if (itemIndex === -1) return null;

    const item = player.inventory[itemIndex];
    const itemDef = ItemRegistry.getItem(item.id);

    if (itemDef?.type === "weapon") {
      // Swap with current weapon if exists
      const currentWeapon = player.equipment.weapon;
      player.equipment.weapon = item;

      // Remove from inventory
      player.inventory.splice(itemIndex, 1);

      // Put old weapon back in inventory
      if (currentWeapon) {
        player.inventory.push(currentWeapon);
      }
    }

    return player.equipment;
  }

  /**
   * Moves an item from an equipment slot back into the player's inventory.
   *
   * @param player - The player performing the unequip action.
   * @param slot   - The equipment slot name to clear (e.g. `"weapon"`,
   *                 `"armor"`).
   * @returns The updated equipment object, or `null` if the slot was
   *          already empty.
   */
  unequipItem(player: any, slot: string) {
    const item = player.equipment[slot];
    if (!item) return null;

    player.equipment[slot] = null;
    player.inventory.push(item);
    return player.equipment;
  }
}
