/**
 * ECONOMY RUNTIME
 *
 * Singleton economy service instances for the server.
 * Provides lazy initialization and access to EconomyService, WalletService, and VendorStockService.
 */

import { EconomyService } from "./EconomyService.js";
import { WalletService } from "./WalletService.js";
import { WalletStore } from "./WalletStore.js";
import { JsonWalletPersistenceAdapter } from "./JsonWalletPersistenceAdapter.js";
import { VendorStockService } from "./VendorStockService.js";
import { VendorStockStore } from "./VendorStockStore.js";
import { JsonVendorStockPersistenceAdapter } from "./JsonVendorStockPersistenceAdapter.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";

const walletStore = new WalletStore();
const walletAdapter = new JsonWalletPersistenceAdapter();
const walletService = new WalletService(walletStore, walletAdapter);

const vendorStockStore = new VendorStockStore();
const vendorStockAdapter = new JsonVendorStockPersistenceAdapter();
const vendorStockService = new VendorStockService(vendorStockStore, vendorStockAdapter);

let servicePromise: Promise<EconomyService> | null = null;

async function getOrCreateService(): Promise<EconomyService> {
  if (servicePromise) return servicePromise;

  const inventoryService = await getInventoryService();
  servicePromise = Promise.resolve(new EconomyService(inventoryService, walletService, vendorStockService));
  return servicePromise;
}

export async function getEconomyService(): Promise<EconomyService> {
  return getOrCreateService();
}

export async function getWalletService(): Promise<WalletService> {
  return walletService;
}

export async function getVendorStockService(): Promise<VendorStockService> {
  return vendorStockService;
}

export { walletService };
export { walletStore as walletStore };
export { vendorStockService };
export { vendorStockStore as vendorStockStore };

// Singleton economyService interface for route handlers
// Uses lazy initialization to avoid circular dependency issues
export const economyService = {
  sellResource: async (input: {
    playerId: string;
    itemId: string;
    quantity: number;
    playerPosition?: { x: number; y: number };
    vendorId?: string;
  }) => {
    const service = await getEconomyService();
    return service.sellResource(input);
  },
  sellAllResources: async (input: {
    playerId: string;
    playerPosition?: { x: number; y: number };
    vendorId?: string;
  }) => {
    const service = await getEconomyService();
    return service.sellAllResources(input);
  },
};