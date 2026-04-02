import { ItemRegistry } from "./ItemRegistry.js";
import { normalizeInventoryStacks } from "./inventoryStacks.js";

export class InventorySystem {
  addItem(player: any, item: any) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!item || typeof item.id !== "string") return player.inventory;

    const def = ItemRegistry.getItem(item.id);
    const addQty = Math.max(1, Math.floor(Number(item.quantity) || 1));

    if (!ItemRegistry.stacksWithDefinition(def)) {
      for (let i = 0; i < addQty; i++) {
        const one = ItemRegistry.createInstance(item.id, 1);
        if (one) {
          player.inventory.push({ ...item, ...one, quantity: 1 });
        } else {
          player.inventory.push({ ...item, id: item.id, quantity: 1 });
        }
      }
      return player.inventory;
    }

    const max = ItemRegistry.maxStackFor(def);
    let remaining = addQty;
    for (const row of player.inventory) {
      if (remaining <= 0) break;
      if (!row || row.id !== item.id) continue;
      const cur = Math.max(1, Math.floor(Number(row.quantity) || 1));
      const space = max - cur;
      if (space <= 0) continue;
      const take = Math.min(space, remaining);
      row.quantity = cur + take;
      remaining -= take;
    }
    while (remaining > 0) {
      const n = Math.min(max, remaining);
      const inst = ItemRegistry.createInstance(item.id, n);
      if (inst) player.inventory.push({ ...item, ...inst, quantity: n });
      remaining -= n;
    }
    normalizeInventoryStacks(player);
    return player.inventory;
  }

  /** Remove one unit of itemId from first matching stack row */
  takeOneFromBag(player: any, itemId: string): any | null {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    const idx = player.inventory.findIndex((i: any) => i?.id === itemId);
    if (idx === -1) return null;
    const row = player.inventory[idx];
    const q = Math.max(1, Math.floor(Number(row.quantity) || 1));
    if (q <= 1) {
      const [removed] = player.inventory.splice(idx, 1);
      return removed ?? null;
    }
    row.quantity = q - 1;
    const inst = ItemRegistry.createInstance(itemId, 1);
    return inst ? { ...row, ...inst, quantity: 1 } : { ...row, quantity: 1 };
  }

  removeItem(player: any, itemId: string) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    player.inventory = player.inventory.filter((item: any) => item.id !== itemId);

    if (player.equipment?.weapon && player.equipment.weapon.id === itemId) {
      player.equipment.weapon = null;
    }
    if (player.equipment?.armor && player.equipment.armor.id === itemId) {
      player.equipment.armor = null;
    }

    return player.inventory;
  }

  equipItem(player: any, itemId: string) {
    if (!player.equipment) player.equipment = { weapon: null, armor: null };
    if (!Array.isArray(player.inventory)) player.inventory = [];

    const itemIndex = player.inventory.findIndex((i: any) => i.id === itemId);
    if (itemIndex === -1) return null;

    const row = player.inventory[itemIndex];
    const itemDef = ItemRegistry.getItem(row.id);
    if (!itemDef) return null;

    const takeEquippedRow = (): any => {
      const q = Math.max(1, Math.floor(Number(row.quantity) || 1));
      if (q <= 1) {
        return player.inventory.splice(itemIndex, 1)[0];
      }
      row.quantity = q - 1;
      const inst = ItemRegistry.createInstance(row.id, 1);
      return inst ? { ...row, ...inst, quantity: 1 } : { ...row, quantity: 1 };
    };

    if (itemDef.type === "weapon") {
      const toEquip = takeEquippedRow();
      const currentWeapon = player.equipment.weapon;
      player.equipment.weapon = toEquip;
      if (currentWeapon) {
        this.addItem(player, currentWeapon);
      }
      normalizeInventoryStacks(player);
      return player.equipment;
    }

    if (itemDef.type === "armor" && itemDef.slot === "armor") {
      const toEquip = takeEquippedRow();
      const currentArmor = player.equipment.armor;
      player.equipment.armor = toEquip;
      if (currentArmor) {
        this.addItem(player, currentArmor);
      }
      normalizeInventoryStacks(player);
      return player.equipment;
    }

    return null;
  }

  unequipItem(player: any, slot: string) {
    if (!player.equipment) player.equipment = { weapon: null, armor: null };
    const item = player.equipment[slot];
    if (!item) return null;

    player.equipment[slot] = null;
    this.addItem(player, item);
    return player.equipment;
  }
}
