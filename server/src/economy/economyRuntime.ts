/**
 * ECONOMY RUNTIME
 *
 * Singleton economy service instances for the server.
 * Provides lazy initialization and access to EconomyService and WalletService.
 */

import { EconomyService } from "./EconomyService.js";
import { WalletService } from "./WalletService.js";
import { WalletStore } from "./WalletStore.js";
import { JsonWalletPersistenceAdapter } from "./JsonWalletPersistenceAdapter.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";

const store = new WalletStore();
const adapter = new JsonWalletPersistenceAdapter();
const walletService = new WalletService(store, adapter);

let servicePromise: Promise<EconomyService> | null = null;

async function getOrCreateService(): Promise<EconomyService> {
  if (servicePromise) return servicePromise;

  const inventoryService = await getInventoryService();
  servicePromise = Promise.resolve(new EconomyService(inventoryService, walletService));
  return servicePromise;
}

export async function getEconomyService(): Promise<EconomyService> {
  return getOrCreateService();
}

export async function getWalletService(): Promise<WalletService> {
  return walletService;
}

export { walletService };
export { store as walletStore };

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