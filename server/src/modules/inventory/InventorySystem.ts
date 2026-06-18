import { ItemRegistry } from "./ItemRegistry.js";
import { normalizeInventoryStacks } from "./inventoryStacks.js";
import {
  isItemBoundOrNonTransferable,
  normalizeBoundItemMeta,
} from "../items/itemBindingPolicy.js";
import { runtimeValidation, validate } from "../../core/are/RuntimeValidation.js";

/** Default max carry weight for a player */
const DEFAULT_MAX_WEIGHT = 200;

export class InventorySystem {
  /** Calculate total weight of a player's inventory. */
  calculateWeight(player: any): number {
    // ─── Runtime Validation: Inventory Weight Calculation ───────────────────
    if (!player || typeof player !== "object") {
      console.warn("[RuntimeValidation] InventorySystem.calculateWeight: invalid player");
      return 0;
    }
    
    // Validate player ID if present
    if (player.id && !validate.isValidEntityId(player.id)) {
      console.warn(`[RuntimeValidation] InventorySystem: invalid player ID ${player.id}`);
    }
    // ─── End Runtime Validation ─────────────────────────────────────────
    
    let total = 0;
    if (Array.isArray(player.inventory)) {
      for (const row of player.inventory) {
        if (!row || typeof row.id !== "string") continue;
        const def = ItemRegistry.getItem(row.id);
        const unitWeight = ItemRegistry.weightOf(def);
        const qty = Math.max(1, Math.floor(Number(row.quantity) || 1));
        
        // Validate item quantity
        if (!Number.isInteger(qty) || qty < 0) {
          console.warn(`[RuntimeValidation] InventorySystem: invalid quantity ${qty} for item ${row.id}`);
        }
        
        total += unitWeight * qty;
      }
    }
    if (Array.isArray(player.gearInventory)) {
      for (const g of player.gearInventory) {
        if (!g || typeof g.baseId !== "string") continue;
        const def = ItemRegistry.getItem(g.baseId);
        const w = ItemRegistry.weightOf(def);
        total += Math.max(1, w);
      }
    }
    return total;
  }

  /** Get the max weight for a player (can be overridden per-player in future). */
  getMaxWeight(player: any): number {
    return typeof player.maxWeight === "number" && player.maxWeight > 0
      ? player.maxWeight
      : DEFAULT_MAX_WEIGHT;
  }

  /** Returns an inventory summary for the client `inv` protocol message. */
  getInventorySummary(player: any): {
    items: any[];
    gear?: unknown[];
    gold: number;
    maxWeight: number;
    weight: number;
  } {
    return {
      items: Array.isArray(player.inventory) ? player.inventory.filter(Boolean) : [],
      gear: Array.isArray(player.gearInventory) ? player.gearInventory.filter(Boolean) : [],
      gold: player.gold ?? 0,
      maxWeight: this.getMaxWeight(player),
      weight: this.calculateWeight(player),
    };
  }

  addItem(player: any, item: any) {
    // ─── Runtime Validation: Add Item ────────────────────────────────────────
    if (!player || typeof player !== "object") {
      console.warn("[RuntimeValidation] InventorySystem.addItem: invalid player");
      return [];
    }
    if (!item || typeof item.id !== "string") {
      console.warn("[RuntimeValidation] InventorySystem.addItem: missing or invalid item.id");
      return player.inventory || [];
    }
    // ─── End Runtime Validation ───────────────────────────────────────────────

    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!item || typeof item.id !== "string") return player.inventory;

    const def = ItemRegistry.getItem(item.id);
    const addQty = Math.max(1, Math.floor(Number(item.quantity) || 1));

    // Validate quantity bounds
    if (addQty > 1000000) {
      console.warn(`[RuntimeValidation] InventorySystem.addItem: excessive quantity ${addQty}`);
    }

    if (!ItemRegistry.stacksWithDefinition(def)) {
      for (let i = 0; i < addQty; i++) {
        const one = ItemRegistry.createInstance(item.id, 1);
        if (one) {
          player.inventory.push(
            normalizeBoundItemMeta({ ...item, ...one, quantity: 1 }),
          );
        } else {
          player.inventory.push(
            normalizeBoundItemMeta({ ...item, id: item.id, quantity: 1 }),
          );
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
      if (inst) {
        player.inventory.push(
          normalizeBoundItemMeta({ ...item, ...inst, quantity: n }),
        );
      }
      remaining -= n;
    }
    normalizeInventoryStacks(player);
    return player.inventory;
  }

  /**
   * Remove up to `count` units of itemId (across stack rows). Returns number removed.
   */
  takeManyFromBag(player: any, itemId: string, count: number): number {
    // ─── Runtime Validation: Take From Bag ──────────────────────────────────
    if (!player || typeof player !== "object") {
      console.warn("[RuntimeValidation] InventorySystem.takeManyFromBag: invalid player");
      return 0;
    }
    if (!itemId || typeof itemId !== "string") {
      console.warn("[RuntimeValidation] InventorySystem.takeManyFromBag: invalid itemId");
      return 0;
    }
    if (!Number.isInteger(count) || count < 0) {
      console.warn(`[RuntimeValidation] InventorySystem.takeManyFromBag: invalid count ${count}`);
      return 0;
    }
    // ─── End Runtime Validation ─────────────────────────────────────────────
    if (!Array.isArray(player.inventory)) player.inventory = [];
    let need = Math.max(0, Math.floor(count));
    if (need <= 0) return 0;
    let removed = 0;
    const inv = player.inventory;
    for (let i = 0; i < inv.length && need > 0; i++) {
      const row = inv[i];
      if (!row || row.id !== itemId) continue;
      const q = Math.max(1, Math.floor(Number(row.quantity) || 1));
      const take = Math.min(q, need);
      if (take >= q) {
        inv.splice(i, 1);
        i--;
      } else {
        row.quantity = q - take;
      }
      removed += take;
      need -= take;
    }
    if (removed > 0) normalizeInventoryStacks(player);
    return removed;
  }

  /**
   * Split `amount` units from the stack at `rowIndex` into a new inventory row (same id).
   * Returns false if invalid.
   */
  splitStackAt(player: any, rowIndex: number, amount: number): boolean {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    const idx = Math.floor(rowIndex);
    if (idx < 0 || idx >= player.inventory.length) return false;
    const row = player.inventory[idx];
    if (!row || typeof row.id !== "string") return false;
    const def = ItemRegistry.getItem(row.id);
    if (!ItemRegistry.stacksWithDefinition(def)) return false;
    const q = Math.max(1, Math.floor(Number(row.quantity) || 1));
    const n = Math.max(1, Math.floor(amount));
    if (n >= q) return false;
    row.quantity = q - n;
    const inst = ItemRegistry.createInstance(row.id, n);
    if (!inst) return false;
    player.inventory.push({ ...row, ...inst, quantity: n });
    normalizeInventoryStacks(player);
    return true;
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
    return normalizeBoundItemMeta(
      inst ? { ...row, ...inst, quantity: 1 } : { ...row, quantity: 1 },
    );
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
    if (player.equipment?.offHand && player.equipment.offHand.id === itemId) {
      player.equipment.offHand = null;
    }

    return player.inventory;
  }

  equipItem(player: any, itemId: string) {
    if (!player.equipment) {
      player.equipment = { weapon: null, armor: null, offHand: null };
    }
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
      const toEquip = normalizeBoundItemMeta(takeEquippedRow());
      const currentWeapon = player.equipment.weapon;
      player.equipment.weapon = toEquip;
      if (currentWeapon) {
        this.addItem(player, currentWeapon);
      }
      normalizeInventoryStacks(player);
      return player.equipment;
    }

    if (itemDef.type === "armor" && itemDef.slot === "armor") {
      const toEquip = normalizeBoundItemMeta(takeEquippedRow());
      const currentArmor = player.equipment.armor;
      player.equipment.armor = toEquip;
      if (currentArmor) {
        this.addItem(player, currentArmor);
      }
      normalizeInventoryStacks(player);
      return player.equipment;
    }

    if (itemDef.type === "armor" && itemDef.slot === "offHand") {
      const toEquip = normalizeBoundItemMeta(takeEquippedRow());
      const currentOffHand = player.equipment.offHand;
      player.equipment.offHand = toEquip;
      if (currentOffHand) {
        this.addItem(player, currentOffHand);
      }
      normalizeInventoryStacks(player);
      return player.equipment;
    }

    return null;
  }

  unequipItem(player: any, slot: string) {
    if (!player.equipment) {
      player.equipment = { weapon: null, armor: null, offHand: null };
    }
    const item = player.equipment[slot];
    if (!item) return null;
    if (isItemBoundOrNonTransferable(item)) {
      return null;
    }

    player.equipment[slot] = null;
    this.addItem(player, item);
    return player.equipment;
  }
}
