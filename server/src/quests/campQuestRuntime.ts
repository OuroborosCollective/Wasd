/**
 * Camp quest runtime singleton.
 */

import { getWalletService } from "../economy/economyRuntime.js";
import { runtimeHistoryLog } from "../history/RuntimeHistoryLog.js";
import { getInventoryService } from "../inventory/inventoryRuntime.js";
import { getSkillProgressionService } from "../skills/skillRuntime.js";
import { worldDiscoveryService } from "../world/WorldDiscoveryService.js";
import { CampQuestService } from "./CampQuestService.js";

let servicePromise: Promise<CampQuestService> | null = null;

async function getOrCreateCampQuestService(): Promise<CampQuestService> {
  if (servicePromise) return servicePromise;
  const inventoryService = await getInventoryService();
  const walletService = await getWalletService();
  const skillProgressionService = await getSkillProgressionService();
  servicePromise = Promise.resolve(new CampQuestService(
    inventoryService,
    walletService,
    worldDiscoveryService,
    runtimeHistoryLog,
    skillProgressionService,
  ));
  return servicePromise;
}

export async function getCampQuestService(): Promise<CampQuestService> {
  return getOrCreateCampQuestService();
}

export const campQuestRuntime = {
  completeCampQuest: async (input: {
    readonly playerId: string;
    readonly questId: string;
    readonly playerPosition?: { readonly x: number; readonly y: number };
    readonly currentTick: number;
  }) => {
    const service = await getCampQuestService();
    return service.completeCampQuest(input);
  },
  getCompletedQuestIds: async (playerId: string) => {
    const service = await getCampQuestService();
    return service.getCompletedQuestIds(playerId);
  },
};
