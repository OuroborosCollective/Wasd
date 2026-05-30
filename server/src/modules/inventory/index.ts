/**
 * Server Inventory Module — Re-exports from shared + server-specific types.
 * 
 * Import from here in server code to get both shared types and server helpers.
 */

export {
  type EquipSlot,
  type ItemSignature,
  type ModularItem,
  type InventoryState,
  type EquipmentState,
  type PlayerInventorySnapshot,
  type InventoryIntent,
  type InventoryEvent,
  EQUIP_SLOTS,
} from "@wasd/shared/items";

export { InventoryDirector, inventoryDirector } from "./InventoryDirector.js";