import { ItemRegistry } from "./ItemRegistry.js";

export class InventorySystem {
  addItem(player: any, item: any) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    player.inventory.push(item);
    return player.inventory;
  }

  /** Remove first stack matching itemId; returns removed item or null */
  takeOneFromBag(player: any, itemId: string): any | null {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    const idx = player.inventory.findIndex((i: any) => i?.id === itemId);
    if (idx === -1) return null;
    const [removed] = player.inventory.splice(idx, 1);
    return removed ?? null;
  }

  removeItem(player: any, itemId: string) {
    // Remove from inventory
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);
    
    // Remove from equipment if equipped
    if (player.equipment.weapon && player.equipment.weapon.id === itemId) {
      player.equipment.weapon = null;
    }
    
    return player.inventory;
  }

  equipItem(player: any, itemId: string) {
    const itemIndex = player.inventory.findIndex((i: any) => i.id === itemId);
    if (itemIndex === -1) return null;

    const item = player.inventory[itemIndex];
    const itemDef = ItemRegistry.getItem(item.id);
    
    if (itemDef?.type === "weapon") {
      const currentWeapon = player.equipment.weapon;
      player.equipment.weapon = item;
      player.inventory.splice(itemIndex, 1);
      if (currentWeapon) {
        player.inventory.push(currentWeapon);
      }
      return player.equipment;
    }

    if (itemDef?.type === "armor" && itemDef.slot === "armor") {
      const currentArmor = player.equipment.armor;
      player.equipment.armor = item;
      player.inventory.splice(itemIndex, 1);
      if (currentArmor) {
        player.inventory.push(currentArmor);
      }
      return player.equipment;
    }

    return null;
  }

  unequipItem(player: any, slot: string) {
    if (!player.equipment) player.equipment = { weapon: null, armor: null };
    const item = player.equipment[slot];
    if (!item) return null;

    player.equipment[slot] = null;
    player.inventory.push(item);
    return player.equipment;
  }
}