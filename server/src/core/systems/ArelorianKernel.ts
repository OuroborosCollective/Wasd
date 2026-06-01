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
  CLIENT_SYNC = '2.10',
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
      
      // Phase 2.10: Client Sync
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
}

export const arelorianKernel = new ArelorianKernel();