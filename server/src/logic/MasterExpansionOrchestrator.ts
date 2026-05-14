/**
 * MasterExpansionOrchestrator - Unified Convergence Loop
 * 
 * Synchronizes combat events, economy, and physical construction in real-time.
 * 
 * Features:
 * - High-Intensity Event extraction (> 0.95 from boss-kills)
 * - Plexity Calculation: 45% Type + 35% HP-Ratio + 20% Inverse Resonance
 * - O(1) lookups for state
 * - Non-blocking async execution
 */

import { PlexityLogic } from './PlexityLogic';
import { ConstructionScheduler, type ConvergenceJob } from './ConstructionScheduler';
import { WorldHistory, Legend } from '../modules/ouroboros/WorldHistory.js';
import { InventorySystem } from '../systems/InventorySystem.js';

export interface Signature {
  id: string;
  intensity: number;
  vector: number[];
  origin: string;
  type: string;
  hp?: number;
  maxHp?: number;
}

export interface HighIntensityEvent {
  id: string;
  type: string;
  intensity: number;
  origin: string;
  timestamp: number;
}

export interface PlexityResult {
  score: number;
  typeWeight: number;
  hpRatioWeight: number;
  resonanceWeight: number;
  triggerConstruction: boolean;
}

export interface ConstructionPayload {
  targetId: string;
  intensity: number;
  resonance: number;
  plexity: number;
  type: string;
  timestamp: number;
}

const INT_SCALE = 10000;
const INTENSITY_THRESHOLD = 9500;
const PLEXITY_THRESHOLD = 8500;
const WEIGHT_TYPE = 45;
const WEIGHT_HP_RATIO = 35;
const WEIGHT_RESONANCE = 20;

const EVENT_TYPE_WEIGHTS: Record<string, number> = {
  BOSS_KILL: 100,
  ELITE_VICTORY: 80,
  LEGENDARY_ITEM: 70,
  FORTIFICATION_BREACH: 60,
  TRADE_DEAL: 50,
  CONSTRUCTION_COMPLETE: 40,
};

const CONSTRUCTION_ITEM = 'warfront_core';

export function extractHighIntensityEvents(legends: Legend[], threshold = INTENSITY_THRESHOLD): HighIntensityEvent[] {
  if (!legends || legends.length === 0) return [];
  const result: HighIntensityEvent[] = [];
  for (const legend of legends) {
    const scaledIntensity = Math.floor(legend.impactScore * INT_SCALE);
    if (scaledIntensity >= threshold) {
      result.push({
        id: legend.id,
        type: legend.type,
        intensity: scaledIntensity,
        origin: legend.originEventId,
        timestamp: legend.createdAt
      });
    }
  }
  return result;
}

export function calculatePlexity(event: HighIntensityEvent, signature: Signature, resonanceScore: number): PlexityResult {
  const typeWeight = EVENT_TYPE_WEIGHTS[event.type] || 50;
  const normalizedTypeWeight = (typeWeight * WEIGHT_TYPE) / 100;
  
  let hpRatioWeight = 50;
  if (signature.maxHp && signature.maxHp > 0) {
    const hpRatio = signature.hp ? signature.hp / signature.maxHp : 1;
    hpRatioWeight = Math.floor((1 - hpRatio) * WEIGHT_HP_RATIO) / 100 * INT_SCALE;
  }
  const normalizedHpWeight = (hpRatioWeight * WEIGHT_HP_RATIO) / 100;
  
  const inverseResonance = 1 - resonanceScore;
  const normalizedResonanceWeight = (inverseResonance * WEIGHT_RESONANCE) / 100;
  
  const totalScore = Math.floor(
    normalizedTypeWeight * INT_SCALE + 
    normalizedHpWeight * INT_SCALE + 
    normalizedResonanceWeight * INT_SCALE
  ) / INT_SCALE;
  
  return {
    score: totalScore,
    typeWeight: normalizedTypeWeight,
    hpRatioWeight: normalizedHpWeight,
    resonanceWeight: normalizedResonanceWeight,
    triggerConstruction: totalScore > PLEXITY_THRESHOLD
  };
}

export async function checkConstructionRequirement(inventorySystem: InventorySystem, playerId: string, itemId = CONSTRUCTION_ITEM): Promise<boolean> {
  try {
    return await inventorySystem.hasItem(playerId, itemId, 1);
  } catch {
    return false;
  }
}

export async function triggerConstructionPipeline(scheduler: ConstructionScheduler, payload: ConstructionPayload): Promise<void> {
  const job: ConvergenceJob = {
    targetId: payload.targetId,
    intensity: payload.intensity,
    resonance: payload.resonance,
    plexity: payload.plexity,
    type: payload.type,
    timestamp: payload.timestamp,
  };
  await scheduler.executeConvergence(job);
}

export class MasterExpansionOrchestrator {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly TICK_RATE = 100;
  private readonly LEGEND_THRESHOLD = 0.95;
  private readonly RESONANCE_MIN_THRESHOLD = 0.85;
  
  private cachedLegends: Legend[] = [];
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 1000;

  constructor(
    private plexityLogic: PlexityLogic,
    private constructionScheduler: ConstructionScheduler,
    private signatureSource: { getActiveSignatures: () => Signature[] },
    private worldHistory?: WorldHistory,
    private inventorySystem?: InventorySystem
  ) {}

  public start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.unifiedConvergenceLoop(), this.TICK_RATE);
  }

  public processTick(): void {
    void this.unifiedConvergenceLoop();
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private getLegends(): Legend[] {
    const now = Date.now();
    if (this.worldHistory && (now - this.lastCacheUpdate) > this.CACHE_TTL) {
      this.cachedLegends = this.worldHistory.getLegends() || [];
      this.lastCacheUpdate = now;
    }
    return this.cachedLegends;
  }

  private async unifiedConvergenceLoop(): Promise<void> {
    try {
      const signatures = this.signatureSource.getActiveSignatures();
      const legends = this.getLegends();
      const highIntensityEvents = extractHighIntensityEvents(legends, INTENSITY_THRESHOLD);
      
      const sigMap = new Map<string, Signature>();
      for (const sig of signatures) {
        sigMap.set(sig.id, sig);
      }
      
      for (const event of highIntensityEvents) {
        const signature = sigMap.get(event.origin);
        if (!signature) continue;
        
        const resonanceScore = this.calculateResonance(signature);
        const plexityResult = calculatePlexity(event, signature, resonanceScore);
        
        if (plexityResult.triggerConstruction) {
          const hasRequirement = await this.checkInventoryRequirement();
          
          if (hasRequirement) {
            await this.triggerConstructionPipeline({
              targetId: event.id,
              intensity: event.intensity,
              resonance: resonanceScore,
              plexity: plexityResult.score,
              type: event.type,
              timestamp: event.timestamp
            });
          }
        }
      }
    } catch (error) {
      console.error('[MasterExpansionOrchestrator] Error in convergence loop:', error);
    }
  }

  private calculateResonance(signature: Signature): number {
    try {
      const result = this.plexityLogic.checkResonance(signature);
      if (typeof result === 'number') return result;
      return result ? 0.9 : 0.5;
    } catch {
      return 0.5;
    }
  }

  private async checkInventoryRequirement(): Promise<boolean> {
    if (!this.inventorySystem) return false;
    return checkConstructionRequirement(this.inventorySystem, 'system', CONSTRUCTION_ITEM);
  }

  private async triggerConstructionPipeline(payload: ConstructionPayload): Promise<void> {
    if (this.constructionScheduler) {
      await triggerConstructionPipeline(this.constructionScheduler, payload);
    }
  }
}

export default MasterExpansionOrchestrator;
