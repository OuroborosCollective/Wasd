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
export { VendorStockService } from "./VendorStockService.js";
export { VendorStockStore } from "./VendorStockStore.js";
export { type VendorStockState, type VendorStockSnapshot, type VendorPriceInfo, type DemandBand } from "./VendorStockTypes.js";
export { calculateDynamicPrice, getDemandBand, getDemandHint, isPriceAffected, DEMAND_THRESHOLDS, DEMAND_PRICE_ADJUSTMENT } from "./DemandPricing.js";