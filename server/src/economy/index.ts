/**
 * ECONOMY MODULE
 *
 * Server-authoritative economy for resource selling and currency management.
 */

export { EconomyService } from "./EconomyService.js";
export { WalletService } from "./WalletService.js";
export { WalletStore } from "./WalletStore.js";
export { type WalletState, type WalletSnapshot } from "./WalletTypes.js";
export { RESOURCE_SELL_PRICES, getSellPrice, isSellable, getSellableItemIds } from "./ResourceSellPrices.js";
export { VILLAGE_TRADER, getVillageResourceVendor, getAllVendors, getVendorById, checkVendorProximity, calculateDistance, type VendorDefinition, type VendorDistanceResult } from "./VillageVendors.js";