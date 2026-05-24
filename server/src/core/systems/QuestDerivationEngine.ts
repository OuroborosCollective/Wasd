/**
 * @file server/src/core/systems/QuestDerivationEngine.ts
 * @description STEP 8: Quest Derivation Engine.
 * Transforms economic problems into playable content.
 */

import { type OraclePressureTag, KAPPA, type RegionState } from '../state/RegionState.js';
import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';
import type { NPCState, NPCAction } from './NPCSimulation.js';

/**
 * Fixed-Point constant
 */
const FP_SCALE = 1000;

/**
 * Convert to Fixed-Point
 */
function toFP(value: number): number {
  return Math.floor(value * FP_SCALE);
}

/**
 * Quest objective types
 */
export enum QuestType {
  PROTECT_CONVOY = 'PROTECT_CONVOY',
  STABILIZE_ENERGY = 'STABILIZE_ENERGY',
  ELIMINATE_THREAT = 'ELIMINATE_THREAT',
  ESCORT_MERCHANT = 'ESCORT_MERCHANT',
  DEFEND_SETTLEMENT = 'DEFEND_SETTLEMENT',
  GATHER_RESOURCES = 'GATHER_RESOURCES',
  CLEAR_BANDITS = 'CLEAR_BANDITS',
}

/**
 * Quest objective
 */
export interface QuestObjective {
  objectiveId: string;
  description: string;
  targetType: QuestType;
  targetRegion: string;
  requiredAmount: number;
  completionCriteria: string;
}

/**
 * Quest reward
 */
export interface QuestReward {
  resourceType: string;
  amount: number; // Fixed-Point (kappa=1000)
  matrixEnergyBonus: number; // Extra energy for high-risk zones
}

/**
 * Quest template
 */
export interface QuestTemplate {
  templateId: string;
  questType: QuestType;
  baseObjective: QuestObjective;
  baseReward: QuestReward;
  riskMultiplier: number; // 1000 = 1x, 2000 = 2x
}

/**
 * Full derived quest
 */
export interface DerivedQuest {
  questId: string;
  questType: QuestType;
  template: QuestTemplate;
  issuerId: string;
  issuerType: 'NPC' | 'ORACLE' | 'REGION';
  objective: QuestObjective;
  reward: QuestReward;
  urgency: number; // Fixed-Point (0-1000)
  risk: number; // Fixed-Point (0-1000)
  createdTick: bigint;
}

/**
 * Tension analysis result
 */
interface TensionPoint {
  regionId: string;
  energyDeficit: number;
  tradeFlowIntensity: number;
  threatLevel: number;
  oraclePressures: OraclePressureTag[];
  npcStress: number;
}

/**
 * QuestDerivationEngine - Generates quests from system tension
 */
export class QuestDerivationEngine {
  private templates: QuestTemplate[] = [];
  private derivedQuests: DerivedQuest[] = [];
  private pendingMutations: PendingMutation[] = [];
  private currentTick: bigint = BigInt(0);

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Register default quest templates
   */
  private registerDefaultTemplates(): void {
    // PROTECT_CONVOY - Trade flow low, conflict high
    this.templates.push({
      templateId: 'protect_convoy',
      questType: QuestType.PROTECT_CONVOY,
      baseObjective: {
        objectiveId: 'convoy_escort',
        description: 'Protect merchant convoy through dangerous territory',
        targetType: QuestType.PROTECT_CONVOY,
        targetRegion: '',
        requiredAmount: 1,
        completionCriteria: 'arrive_at_destination',
      },
      baseReward: {
        resourceType: 'matrix_energy',
        amount: toFP(50),
        matrixEnergyBonus: toFP(0),
      },
      riskMultiplier: toFP(1.5),
    });

    // STABILIZE_ENERGY - Matrix energy < 20%
    this.templates.push({
      templateId: 'stabilize_energy',
      questType: QuestType.STABILIZE_ENERGY,
      baseObjective: {
        objectiveId: 'energy_stabilize',
        description: 'Restore Matrix Energy to settlement',
        targetType: QuestType.STABILIZE_ENERGY,
        targetRegion: '',
        requiredAmount: toFP(0.3), // 30% of max
        completionCriteria: 'energy_restored',
      },
      baseReward: {
        resourceType: 'matrix_energy',
        amount: toFP(100),
        matrixEnergyBonus: toFP(50),
      },
      riskMultiplier: toFP(1.0),
    });

    // ELIMINATE_THREAT - Bandit raid
    this.templates.push({
      templateId: 'eliminate_threat',
      questType: QuestType.ELIMINATE_THREAT,
      baseObjective: {
        objectiveId: 'bandit_clear',
        description: 'Eliminate bandit threat',
        targetType: QuestType.ELIMINATE_THREAT,
        targetRegion: '',
        requiredAmount: 5,
        completionCriteria: 'all_targets_eliminated',
      },
      baseReward: {
        resourceType: 'matrix_energy',
        amount: toFP(75),
        matrixEnergyBonus: toFP(25),
      },
      riskMultiplier: toFP(2.0),
    });

    // DEFEND_SETTLEMENT
    this.templates.push({
      templateId: 'defend_settlement',
      questType: QuestType.DEFEND_SETTLEMENT,
      baseObjective: {
        objectiveId: 'settlement_defend',
        description: 'Defend settlement from attackers',
        targetType: QuestType.DEFEND_SETTLEMENT,
        targetRegion: '',
        requiredAmount: 1,
        completionCriteria: 'settlement_secure',
      },
      baseReward: {
        resourceType: 'matrix_energy',
        amount: toFP(80),
        matrixEnergyBonus: toFP(30),
      },
      riskMultiplier: toFP(1.8),
    });

    // GATHER_RESOURCES
    this.templates.push({
      templateId: 'gather_resources',
      questType: QuestType.GATHER_RESOURCES,
      baseObjective: {
        objectiveId: 'resource_gather',
        description: 'Gather essential resources',
        targetType: QuestType.GATHER_RESOURCES,
        targetRegion: '',
        requiredAmount: toFP(0.5),
        completionCriteria: 'resources_collected',
      },
      baseReward: {
        resourceType: 'matrix_energy',
        amount: toFP(40),
        matrixEnergyBonus: toFP(10),
      },
      riskMultiplier: toFP(0.8),
    });
  }

  /**
   * Main derivation entry point (called in Phase 2.9)
   */
  public deriveQuests(): void {
    this.currentTick = worldStateRegistry.getTick();
    const worldState = worldStateRegistry.getCurrentState();

    // 1. Analyze tension points
    const tensions = this.analyzeTensions(worldState);

    // 2. Derive quests from tensions
    for (const tension of tensions) {
      this.deriveFromTension(tension);
    }

    // 3. Check NPC stress for economic quests
    this.deriveFromNPCTension(tensions);

    // 4. Register quests for client sync
    this.registerForClientSync();
  }

  /**
   * 1. Tension Mapping - Scan WorldState for thresholds
   */
  private analyzeTensions(worldState: any): TensionPoint[] {
    const tensions: TensionPoint[] = [];

    // SORTED ITERATION REQUIRED FOR CAUSALITY
    const sortedRegionIds = Array.from(worldState.regions.keys()).sort();
    for (const regionId of sortedRegionIds) {
      const region = worldState.regions.get(regionId)!;
      const tension: TensionPoint = {
        regionId,
        energyDeficit: 0,
        tradeFlowIntensity: region.tradeFlowIntensity,
        threatLevel: region.threatLevel,
        oraclePressures: region.oraclePressureTags as OraclePressureTag[],
        npcStress: 0,
      };

      // Calculate energy deficit (if energy < 20% = 200)
      const maxEnergy = toFP(100); // Assume 100 max
      if (region.matrixEnergyBalance < maxEnergy * 0.2) {
        tension.energyDeficit = maxEnergy - region.matrixEnergyBalance;
      }

      // Check trade flow (if < 30% = 300)
      if (region.tradeFlowIntensity < toFP(0.3)) {
        tension.tradeFlowIntensity = region.tradeFlowIntensity;
      }

      tensions.push(tension);
    }

    return tensions;
  }

  /**
   * 2. Derive quests from tension point
   */
  private deriveFromTension(tension: TensionPoint): void {
    // STABILIZE_ENERGY: Matrix energy < 20%
    if (tension.energyDeficit > 0) {
      this.createQuest('stabilize_energy', tension, {
        requiredAmount: Math.min(tension.energyDeficit, toFP(30)),
      });
    }

    // PROTECT_CONVOY: Trade flow low + conflict high
    if (tension.tradeFlowIntensity < toFP(0.3) && tension.threatLevel > toFP(0.5)) {
      this.createQuest('protect_convoy', tension, {});
    }

    // ELIMINATE_THREAT: BANDIT_RAID pressure
    if (tension.oraclePressures.includes('BANDIT_RAID' as OraclePressureTag)) {
      this.createQuest('eliminate_threat', tension, {
        requiredAmount: toFP(5),
      });
    }

    // DEFEND_SETTLEMENT: HIGH_CONFLICT pressure
    if (tension.oraclePressures.includes('HIGH_CONFLICT' as OraclePressureTag)) {
      this.createQuest('defend_settlement', tension, {
        requiredAmount: 1,
      });
    }

    // GATHER_RESOURCES: DEPLETED_RESOURCES pressure
    if (tension.oraclePressures.includes('DEPLETED_RESOURCES' as OraclePressureTag)) {
      this.createQuest('gather_resources', tension, {
        requiredAmount: toFP(0.5),
      });
    }
  }

  /**
   * 3. Derive quests from NPC stress
   */
  private deriveFromNPCTension(tensions: TensionPoint[]): void {
    // This would integrate with NPCSimulation in full implementation
    // For now, generate based on region state
    for (const tension of tensions) {
      // NPCs with high stress due to economic scarcity could trigger quests
      if (tension.tradeFlowIntensity < toFP(0.2)) {
        // Economic desperation quest
        const template = this.findTemplate('gather_resources');
        if (template) {
          this.derivedQuests.push({
            questId: `quest_${this.currentTick}_npcecon_${tension.regionId}`,
            questType: QuestType.GATHER_RESOURCES,
            template,
            issuerId: tension.regionId,
            issuerType: 'NPC',
            objective: {
              ...template.baseObjective,
              targetRegion: tension.regionId,
            },
            reward: {
              ...template.baseReward,
              amount: toFP(30),
            },
            urgency: toFP(0.8),
            risk: toFP(0.5),
            createdTick: this.currentTick,
          });
        }
      }
    }
  }

  /**
   * Create quest from template with dynamic adjustments
   */
  private createQuest(
    templateId: string,
    tension: TensionPoint,
    overrides: Partial<{ requiredAmount: number }>
  ): void {
    const template = this.findTemplate(templateId);
    if (!template) return;

    // Skip if quest already exists for region
    const existingQuest = this.derivedQuests.find(
      q => q.issuerId === tension.regionId && q.questType === template.questType
    );
    if (existingQuest) return;

    // Calculate risk (0-1000)
    const risk = this.calculateRisk(tension);

    // Calculate urgency (0-1000)
    const urgency = this.calculateUrgency(tension);

    // Calculate reward based on PriceBalancer formula
    const reward = this.calculateReward(template, risk);

    // Create derived quest
    const quest: DerivedQuest = {
      questId: `quest_${this.currentTick}_${template.questType}_${tension.regionId}`,
      questType: template.questType,
      template,
      issuerId: tension.regionId,
      issuerType: 'REGION',
      objective: {
        ...template.baseObjective,
        targetRegion: tension.regionId,
        requiredAmount: overrides.requiredAmount ?? template.baseObjective.requiredAmount,
      },
      reward,
      urgency,
      risk,
      createdTick: this.currentTick,
    };

    this.derivedQuests.push(quest);
  }

  /**
   * Calculate risk level (Fixed-Point)
   */
  private calculateRisk(tension: TensionPoint): number {
    let risk = 0;

    // Threat contributes most to risk
    risk += tension.threatLevel;

    // Oracle pressures add risk
    if (tension.oraclePressures.includes('BANDIT_RAID' as OraclePressureTag)) {
      risk += toFP(0.5);
    }
    if (tension.oraclePressures.includes('HIGH_CONFLICT' as OraclePressureTag)) {
      risk += toFP(0.4);
    }

    // Energy deficit adds risk
    if (tension.energyDeficit > 0) {
      risk += Math.floor(tension.energyDeficit / 2);
    }

    return Math.min(FP_SCALE, risk);
  }

  /**
   * Calculate urgency level (Fixed-Point)
   */
  private calculateUrgency(tension: TensionPoint): number {
    let urgency = 0;

    // Energy deficit is very urgent
    if (tension.energyDeficit > toFP(50)) {
      urgency = toFP(0.9);
    } else if (tension.energyDeficit > 0) {
      urgency = toFP(0.6);
    }

    // High conflict increases urgency
    if (tension.threatLevel > toFP(0.7)) {
      urgency = Math.max(urgency, toFP(0.8));
    }

    // Low trade flow increases urgency
    if (tension.tradeFlowIntensity < toFP(0.2)) {
      urgency = Math.max(urgency, toFP(0.5));
    }

    return urgency;
  }

  /**
   * 3. Deterministic Reward Calculation
   * Formula: baseReward * (1 + risk/1000) * (1 + urgency/1000)
   */
  private calculateReward(template: QuestTemplate, risk: number): QuestReward {
    const base = template.baseReward;
    const riskMult = FP_SCALE + risk;
    const urgencyMult = FP_SCALE + Math.floor(risk / 2); // Urgency affects bonus

    // Total = base * (riskMult/FP) * (urgencyMult/FP)
    const total = Math.floor(
      (base.amount * riskMult * urgencyMult) / (FP_SCALE * FP_SCALE)
    );

    return {
      resourceType: base.resourceType,
      amount: total,
      matrixEnergyBonus: Math.floor(
        (base.matrixEnergyBonus * riskMult) / FP_SCALE
      ),
    };
  }

  /**
   * 4. Client Injection - Register quests for sync
   */
  private registerForClientSync(): void {
    for (const quest of this.derivedQuests) {
      // Queue mutation to add quest to region state
      this.pendingMutations.push({
        type: 'SET_REGION_FIELD',
        regionId: quest.objective.targetRegion,
        field: 'pendingQuests',
        value: quest.questId,
      });
    }

    // Apply all mutations
    for (const mutation of this.pendingMutations) {
      worldStateRegistry.queueMutation(mutation);
    }

    this.pendingMutations = [];
  }

  /**
   * Find template by ID
   */
  private findTemplate(templateId: string): QuestTemplate | undefined {
    return this.templates.find(t => t.templateId === templateId);
  }

  /**
   * Register custom template
   */
  public registerTemplate(template: QuestTemplate): void {
    this.templates.push(template);
  }

  /**
   * Get all derived quests
   */
  public getQuests(): DerivedQuest[] {
    return [...this.derivedQuests];
  }

  /**
   * Get quests for specific region
   */
  public getQuestsForRegion(regionId: string): DerivedQuest[] {
    return this.derivedQuests.filter(q => q.objective.targetRegion === regionId);
  }

  /**
   * Clear old quests (cleanup)
   */
  public clearOldQuests(maxAge: bigint): void {
    const cutoff = this.currentTick - maxAge;
    this.derivedQuests = this.derivedQuests.filter(q => q.createdTick > cutoff);
  }
}