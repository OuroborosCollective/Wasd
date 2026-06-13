/**
 * @file server/src/core/systems/ArelorianKernel.ts
 * @description The Arelorian Tick Orchestrator (ATO) - Main game loop.
 * Implements the strict phase execution order within 100ms tick budget.
 * 
 * @ARE-GUARD-EXEMPT: Performance monitoring only; timing measurements are
 * observability metrics, not world-state inputs.
 */

// Import all systems
import { AxiomValidationLayer } from './AxiomValidationLayer.js';
import { ObserverEngine } from './ObserverEngine.js';
import { NPCSimulation } from './NPCSimulation.js';
import { OracleSystem } from './OracleSystem.js';
import { EconomySimulation } from './EconomySimulation.js';
import { QuestDerivationEngine } from './QuestDerivationEngine.js';
import { CMLS as CombatSystem } from './CombatSystem.js';
import { EvolutionSystem } from './EvolutionSystem.js';
import { worldStateRegistry } from '../state/WorldStateRegistry.js';
import { processLinguisticUpdate, buildNpcLanguageState } from '../language/ArelorianLinguisticKernel.js';
import type { NpcLanguageState } from '../language/LanguageTypes.js';
import { createKappaInt } from '../language/LanguageTypes.js';
import { emitNpcDialogueEvents } from '../language/LivingLanguageChatBridge.js';

/**
 * Phase execution order for Arelorian tick loop
 */
export enum AtoPhase {
  INTENT_COLLECTION = '2.1',
  AXIOM_VALIDATION = '2.2',
  STATE_REGISTRY_UPDATE = '2.3',
  OBSERVER_ENGINE = '2.4',
  NPC_SIMULATION = '2.5',
  ORACLE_SYSTEM = '2.6',
  ECONOMY_TERRITORY = '2.7',
  SPAWN_SIMULATION = '2.8',
  QUEST_DERIVATION = '2.9',
  LINGUISTIC_PROCESSING = '2.10', // Living Language System - every 10 ticks
  CLIENT_SYNC = '2.11',
  REGIONAL_EVOLUTION = '2.13',
}

/**
 * Service method timing data
 */
export interface PhaseTiming {
  phase: AtoPhase;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * ArelorianKernel - Main orchestrator
 */
export class ArelorianKernel {
  private tickCount: bigint = BigInt(0);
  private phaseTimings: PhaseTiming[] = [];
  
  // Phase stubs
  private axiomLayer = new AxiomValidationLayer();
  private observerEngine = new ObserverEngine();
  private npcSim = new NPCSimulation();
  private oracle = new OracleSystem();
  private economy = new EconomySimulation();
  private questEngine = new QuestDerivationEngine();
  private combat = new CombatSystem();
  private evolution = new EvolutionSystem();
  
  /**
   * Execute single tick - called every 100ms
   */
  public async tick(): Promise<void> {
    const tickStart = performance.now();
    this.tickCount++;
    
    try {
      // Phase 2.1: Intent Collection
      await this.measurePhase(AtoPhase.INTENT_COLLECTION, async () => {});
      
      // Phase 2.2: Axiom Validation
      await this.measurePhase(AtoPhase.AXIOM_VALIDATION, async () => {
        await this.axiomLayer.processIntents();
      });
      
      // Phase 2.3: State Registry Update
      await this.measurePhase(AtoPhase.STATE_REGISTRY_UPDATE, async () => {
        worldStateRegistry.commitMutations();
      });
      
      // Phase 2.4: Observer Engine
      await this.measurePhase(AtoPhase.OBSERVER_ENGINE, async () => {
        this.observerEngine.computeDensityTiers();
      });
      
      // Phase 2.5: NPC Simulation
      await this.measurePhase(AtoPhase.NPC_SIMULATION, async () => {
        const densityMap = this.observerEngine.getDensityMap();
        await this.npcSim.update(densityMap);
      });
      
      // Phase 2.6: Oracle System (every 50 ticks)
      await this.measurePhase(AtoPhase.ORACLE_SYSTEM, async () => {
        if (this.tickCount % BigInt(50) === BigInt(0)) {
          await this.oracle.detectPatterns();
        }
      });
      
      // Phase 2.7: Economy & Territory
      await this.measurePhase(AtoPhase.ECONOMY_TERRITORY, async () => {
        this.economy.update();
      });
      
      // Phase 2.8: Spawn Simulation
      await this.measurePhase(AtoPhase.SPAWN_SIMULATION, async () => {});
      
      // Phase 2.9: Quest Derivation
      await this.measurePhase(AtoPhase.QUEST_DERIVATION, async () => {
        this.questEngine.deriveQuests();
      });
      
      // Phase 2.10: Living Language System - Linguistic Processing (every 10 ticks)
      // Process NPC speech generation, dialogue decisions, and language evolution
      await this.measurePhase(AtoPhase.LINGUISTIC_PROCESSING, async () => {
        if (this.tickCount % BigInt(10) === BigInt(0)) {
          await this.processLinguisticTick();
        }
      });
      
      // Phase 2.11: Client Sync
      await this.measurePhase(AtoPhase.CLIENT_SYNC, async () => {});
      
      // Phase 2.13: Regional Evolution (every 600 ticks)
      if (this.tickCount % BigInt(600) === BigInt(0)) {
        await this.measurePhase(AtoPhase.REGIONAL_EVOLUTION, async () => {
          this.evolution.evolveRegions();
        });
      }
      
    } catch (error) {
      console.error('[ATO] Tick error:', error);
    }
    
    // Check timing budget
    const tickDuration = performance.now() - tickStart;
    if (tickDuration > 100) {
      console.warn(`[ATO] Tick ${this.tickCount} exceeded budget: ${tickDuration.toFixed(2)}ms`);
    }
  }
  
  /**
   * Measure phase execution time
   */
  private async measurePhase(phase: AtoPhase, fn: () => Promise<void>): Promise<void> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    
    this.phaseTimings.push({
      phase,
      startTime: start,
      endTime: end,
      duration: end - start,
    });
    
    if (this.phaseTimings.length > 100) {
      this.phaseTimings.shift();
    }
  }
  
  public getTickCount(): bigint {
    return this.tickCount;
  }
  
  public getPhaseTimings(): PhaseTiming[] {
    return [...this.phaseTimings];
  }
  
  public getAveragePhaseTime(phase: AtoPhase): number {
    const timings = this.phaseTimings.filter(t => t.phase === phase);
    if (timings.length === 0) return 0;
    return timings.reduce((sum, t) => sum + t.duration, 0) / timings.length;
  }

  public getTickRate(): number {
    return 10; // 10Hz
  }

  /**
   * Process Living Language System linguistic update every 10 ticks.
   * This handles NPC speech generation, dialogue decisions, and language evolution.
   */
  private async processLinguisticTick(): Promise<void> {
    try {
      // Build world state for linguistic processing
      const tickNum = Number(this.tickCount);
      
      // Get NPC states from NPCSimulation
      const npcStates = this.buildNpcLanguageStates();
      
      // World state context for linguistic decisions
      const worldState = {
        threatLevel: createKappaInt(0.3), // TODO: Get from actual world state
        villageSafety: createKappaInt(0.7), // TODO: Get from actual world state
        factionPressure: createKappaInt(0.5), // TODO: Get from actual world state
        politicalTension: createKappaInt(0.4), // TODO: Get from actual world state
      };

      // Process linguistic updates for selected NPCs
      const utterances = processLinguisticUpdate(
        BigInt(tickNum),
        npcStates,
        worldState
      );

      // Build NPC ID to name map for chat bridge
      const npcIdToName = this.buildNpcIdToNameMap();

      // Emit npc_dialogue events via WebSocket for 2D client chat
      if (utterances.length > 0) {
        emitNpcDialogueEvents(utterances, npcIdToName, tickNum);
      }

      // Log utterance count for debugging (every 100 ticks)
      if (tickNum % 100 === 0 && utterances.length > 0) {
        console.log(`[ATO] Linguistic tick ${tickNum}: ${utterances.length} utterances generated`);
      }
    } catch (error) {
      // Log but don't fail the tick - linguistic system is non-critical
      console.error('[ATO] Linguistic processing error:', error);
    }
  }

  /**
   * Build NPC ID to name map for chat bridge.
   */
  private buildNpcIdToNameMap(): Map<string, string> {
    const npcIdToName = new Map<string, string>();
    const npcs = this.npcSim.getAllNpcs?.() ?? [];
    
    for (const npc of npcs) {
      npcIdToName.set(npc.id, npc.name ?? npc.id);
    }
    
    return npcIdToName;
  }

  /**
   * Build NPC language states from NPCSimulation for linguistic processing.
   * This provides the Living Language System with NPC emotional/relationship data.
   */
  private buildNpcLanguageStates(): readonly NpcLanguageState[] {
    const npcs = this.npcSim.getAllNpcs?.() ?? [];
    const states: NpcLanguageState[] = [];

    for (const npc of npcs) {
      try {
        const state = buildNpcLanguageState(npc.id, {
          factionId: npc.faction ?? 'neutral',
          role: npc.role ?? 'citizen',
          hunger: 0.3, // TODO: Get from actual NPC state
          trust: 0.5, // TODO: Get from actual NPC state
          fear: 0.2, // TODO: Get from actual NPC state
          duty: 0.6, // TODO: Get from actual NPC state
          pride: 0.4, // TODO: Get from actual NPC state
          revenge: 0.1, // TODO: Get from actual NPC state
        });
        states.push(state);
      } catch {
        // Skip NPCs that fail to build language state
      }
    }

    return Object.freeze(states);
  }
}

export const arelorianKernel = new ArelorianKernel();