import { ItemRegistry } from "./ItemRegistry.js";

export class InventorySystem {
  addItem(player: any, item: any) {
    player.inventory.push(item);
    return player.inventory;
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

  unequipItem(player: any, slot: string) {
    const item = player.equipment[slot];
    if (!item) return null;

    player.equipment[slot] = null;
    player.inventory.push(item);
    return player.equipment;
  }
}