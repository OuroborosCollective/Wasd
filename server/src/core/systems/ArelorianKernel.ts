import { AxiomValidationLayer } from './AxiomValidationLayer.js';
import { ObserverEngine } from './ObserverEngine.js';
import { NPCSimulation } from './NPCSimulation.js';
import { OracleSystem } from './OracleSystem.js';
import { EconomySimulation } from './EconomySimulation.js';
import { QuestDerivationEngine } from './QuestDerivationEngine.js';
import { EvolutionSystem } from './EvolutionSystem.js';
import { worldStateRegistry } from '../state/WorldStateRegistry.js';

export enum AtoPhase {
  INTENT_COLLECTION = '2.1',
  AXIOM_VALIDATION = '2.2',
  STATE_REGISTRY_UPDATE = '2.3',
  OBSERVER_ENGINE = '2.4',
  NPC_SIMULATION = '2.5',
  ORACLE_SYSTEM = '2.6',
  ECONOMY_TERRITORY = '2.7',
  QUEST_DERIVATION = '2.9',
  LINGUISTIC_PROCESSING = '2.10',
  CLIENT_SYNC = '2.11',
  REGIONAL_EVOLUTION = '2.13',
}

export interface PhaseTiming {
  phase: AtoPhase;
  startTime: number;
  endTime: number;
  duration: number;
}

export class ArelorianKernel {
  private tickCount: bigint = BigInt(0);
  private phaseTimings: PhaseTiming[] = [];
  private axiomLayer = new AxiomValidationLayer();
  private observerEngine = new ObserverEngine();
  private npcSim = new NPCSimulation();
  private oracle = new OracleSystem();
  private economy = new EconomySimulation();
  private questEngine = new QuestDerivationEngine();
  private evolution = new EvolutionSystem();

  public async tick(): Promise<void> {
    const tickStart = performance.now();
    this.tickCount++;
    try {
      await this.measurePhase(AtoPhase.INTENT_COLLECTION, async () => {});
      await this.measurePhase(AtoPhase.AXIOM_VALIDATION, async () => { await this.axiomLayer.processIntents(); });
      await this.measurePhase(AtoPhase.STATE_REGISTRY_UPDATE, async () => { worldStateRegistry.commitMutations(); });
      await this.measurePhase(AtoPhase.OBSERVER_ENGINE, async () => { this.observerEngine.computeDensityTiers(); });
      await this.measurePhase(AtoPhase.NPC_SIMULATION, async () => { await this.npcSim.update(this.observerEngine.getDensityMap()); });
      await this.measurePhase(AtoPhase.ORACLE_SYSTEM, async () => { if (this.tickCount % BigInt(50) === BigInt(0)) await this.oracle.detectPatterns(); });
      await this.measurePhase(AtoPhase.ECONOMY_TERRITORY, async () => { this.economy.update(); });
      await this.measurePhase(AtoPhase.QUEST_DERIVATION, async () => { this.questEngine.deriveQuests(); });
      await this.measurePhase(AtoPhase.LINGUISTIC_PROCESSING, async () => {});
      await this.measurePhase(AtoPhase.CLIENT_SYNC, async () => {});
      if (this.tickCount % BigInt(600) === BigInt(0)) await this.measurePhase(AtoPhase.REGIONAL_EVOLUTION, async () => { this.evolution.evolveRegions(); });
    } catch (error) {
      console.error('[ATO] Tick error:', error);
    }
    const tickDuration = performance.now() - tickStart;
    if (tickDuration > 100) console.warn(`[ATO] Tick ${this.tickCount} exceeded budget: ${tickDuration.toFixed(2)}ms`);
  }

  private async measurePhase(phase: AtoPhase, fn: () => Promise<void>): Promise<void> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    this.phaseTimings.push({ phase, startTime: start, endTime: end, duration: end - start });
    if (this.phaseTimings.length > 100) this.phaseTimings.shift();
  }

  public getTickCount(): bigint { return this.tickCount; }
  public getPhaseTimings(): PhaseTiming[] { return [...this.phaseTimings]; }
  public getAveragePhaseTime(phase: AtoPhase): number {
    const timings = this.phaseTimings.filter((t) => t.phase === phase);
    return timings.length === 0 ? 0 : timings.reduce((sum, t) => sum + t.duration, 0) / timings.length;
  }
  public getTickRate(): number { return 10; }
}

export const arelorianKernel = new ArelorianKernel();
