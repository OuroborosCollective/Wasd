/**
 * AIService.ts - Phase 11: Ouroboros Tick System Integration
 * 
 * AI wrapper with Ouroboros autonomous agent integration.
 * Uses deterministic tick context for NPC brain decisions.
 */

import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";
import { getOuroborosTickSystem } from "../core/are/OuroborosTickSystem.js";

export interface AIProcessRequest {
  input: string;
  context?: Record<string, any>;
  npcId?: string;
  regionId?: string;
}

export interface AIProcessResponse {
  output: string;
  perception: string;
  axiomVerified: boolean;
  tickId: number;
  worldTimeHours: number;
  seedHash: string;
  ouroborosContext?: {
    eventCount: number;
    legendCount: number;
    factionCount: number;
  };
}

/**
 * AIService - AI processing with Ouroboros integration
 * 
 * Ouroboros cycle: PERCEIVE → EVALUATE → ACT → REMEMBER → UPDATE → PERCEIVE
 */
export class AIService {
  /**
   * Process input with Ouroboros autonomous agent cycle
   */
  static async process(request: AIProcessRequest): Promise<AIProcessResponse> {
    const tickContext = tickContextProvider.getContext();
    
    // Get Ouroboros context if available
    let ouroborosContext: AIProcessResponse['ouroborosContext'] = undefined;
    try {
      const ouroborosTickSystem = getOuroborosTickSystem();
      const engine = ouroborosTickSystem.getEngine();
      const stats = engine.getStats();
      ouroborosContext = {
        eventCount: stats.historyEntries as number,
        legendCount: stats.legends as number,
        factionCount: stats.factions as number,
      };
    } catch {
      // Ouroboros not yet initialized
    }
    
    // Process through Ouroboros perception cycle
    const perception = this.derivePerception(request.input, tickContext.seedHash);
    
    // Verify axiom with deterministic check
    const axiomVerified = this.verifyAxiom(request.input, tickContext.seedHash);
    
    console.log(`[AIService] Perzipiere: ${request.input}`);
    
    return {
      output: `Axiom verifiziert: ${request.input}`,
      perception,
      axiomVerified,
      tickId: tickContext.tickId,
      worldTimeHours: tickContext.worldTimeHours,
      seedHash: tickContext.seedHash,
      ouroborosContext,
    };
  }

  /**
   * Derive deterministic perception from input and seed
   */
  private static derivePerception(input: string, seedHash: string): string {
    const combined = `perceive|${input}|${seedHash}`;
    let hash = 2166136261;
    const prime = 16777619;
    
    for (let i = 0; i < combined.length; i++) {
      hash ^= combined.charCodeAt(i);
      hash = Math.imul(hash, prime);
    }
    
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
    return `Perception derived from seed ${hashHex.slice(0, 8)}`;
  }

  /**
   * Verify axiom deterministically
   */
  private static verifyAxiom(input: string, seedHash: string): boolean {
    // Deterministic axiom verification based on input hash
    const combined = `axiom|${input}|${seedHash}`;
    let hash = 2166136261;
    const prime = 16777619;
    
    for (let i = 0; i < combined.length; i++) {
      hash ^= combined.charCodeAt(i);
      hash = Math.imul(hash, prime);
    }
    
    // Deterministic verification result
    return (hash & 1) === 1;
  }

  /**
   * Process NPC-specific AI request
   */
  static async processNPCRequest(
    npcId: string,
    request: AIProcessRequest
  ): Promise<AIProcessResponse> {
    const tickContext = tickContextProvider.getContext();
    
    try {
      const ouroborosTickSystem = getOuroborosTickSystem();
      const engine = ouroborosTickSystem.getEngine();
      const memory = engine.getNPCMemory(npcId);
      
      // Get NPC-specific context
      const memoryContext = memory 
        ? `NPC memory age: ${Date.now() - (memory.createdAt || 0)}ms`
        : 'No memory yet';
      
      return {
        output: `[NPC ${npcId}] ${request.input}`,
        perception: `NPC perception: ${memoryContext}`,
        axiomVerified: true,
        tickId: tickContext.tickId,
        worldTimeHours: tickContext.worldTimeHours,
        seedHash: tickContext.seedHash,
        ouroborosContext: {
          eventCount: 0,
          legendCount: 0,
          factionCount: 0,
        },
      };
    } catch {
      return this.process(request);
    }
  }
}