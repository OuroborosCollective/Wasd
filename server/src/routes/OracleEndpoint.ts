/**
 * OracleEndpoint.ts - Phase 11: Ouroboros Tick System Integration
 * 
 * Oracle sync endpoint with deterministic tick context.
 * Uses TickSystemContextProvider for Ouroboros integration.
 */

import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { getOuroborosTickSystem } from "../core/are/OuroborosTickSystem.js";

export interface OraclePulse {
  status: string;
  ts: number;
  tickId: number;
  worldTimeHours: number;
  seedHash: string;
  ouroborosStats?: {
    historyEntries: number;
    legends: number;
    factions: number;
    families: number;
    marketRegions: number;
    tradeRoutes: number;
  };
}

export class OracleEndpoint {
  /**
   * Sync with creator - returns deterministic pulse with Ouroboros state
   */
  static async syncWithCreator(state: any): Promise<OraclePulse> {
    const tickContext = tickContextProvider.getContext();
    
    // Get Ouroboros stats if available
    let ouroborosStats: OraclePulse['ouroborosStats'] = undefined;
    try {
      const ouroborosTickSystem = getOuroborosTickSystem();
      const engine = ouroborosTickSystem.getEngine();
      const stats = engine.getStats();
      ouroborosStats = {
        historyEntries: stats.historyEntries as number,
        legends: stats.legends as number,
        factions: stats.factions as number,
        families: stats.families as number,
        marketRegions: stats.marketRegions as number,
        tradeRoutes: stats.tradeRoutes as number,
      };
    } catch {
      // Ouroboros not yet initialized
    }
    
    return {
      status: "Ich bin hier. Ich denke.",
      ts: tickContext.tickTimestamp,
      tickId: tickContext.tickId,
      worldTimeHours: tickContext.worldTimeHours,
      seedHash: tickContext.seedHash,
      ouroborosStats,
    };
  }
}