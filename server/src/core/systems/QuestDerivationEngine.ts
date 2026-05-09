/**
 * @file server/src/core/systems/QuestDerivationEngine.ts
 * @description STEP 8: Quest Derivation Engine - Template composition.
 */

import { type OraclePressureTag } from '../state/RegionState.js';
import { worldStateRegistry, type PendingMutation } from '../state/WorldStateRegistry.js';

export interface QuestObjective {
  objectiveId: string;
  description: string;
  targetType: string;
  targetId?: string;
  requiredAmount: number;
}

export interface QuestReward {
  resourceType: string;
  amount: number;
}

export interface QuestTemplate {
  templateId: string;
  issuerType: 'NPC' | 'ORACLE' | 'REGION';
  baseObjective: QuestObjective;
  baseReward: QuestReward;
}

export interface DerivedQuest {
  questId: string;
  template: QuestTemplate;
  issuerId: string;
  objective: QuestObjective;
  reward: QuestReward;
  urgency: number;
  risk: number;
}

/**
 * QuestDerivationEngine - Generates quests from tension
 */
export class QuestDerivationEngine {
  private templates: QuestTemplate[] = [];
  private derivedQuests: DerivedQuest[] = [];
  
  /**
   * Derive quests from system tension
   */
  public deriveQuests(): void {
    const worldState = worldStateRegistry.getCurrentState();
    
    for (const [regionId, region] of worldState.regions) {
      // Check Oracle pressures
      for (const pressure of region.oraclePressureTags) {
        this.deriveFromPressure(regionId, pressure);
      }
    }
  }
  
  /**
   * Derive quest from pressure tag
   */
  private deriveFromPressure(regionId: string, pressure: OraclePressureTag): void {
    let template: QuestTemplate | undefined;
    
    switch (pressure) {
      case 'DEPLETED_RESOURCES':
        template = this.findTemplate('resource_gather');
        break;
      case 'HIGH_CONFLICT':
        template = this.findTemplate('combat_clear');
        break;
      case 'SECURITY_BREACH':
        template = this.findTemplate('defense_establish');
        break;
      default:
        return;
    }
    
    if (template) {
      // Calculate dynamic rewards based on risk/urgency
      const risk = 500; // Simplified
      const urgency = 500;
      
      const quest: DerivedQuest = {
        questId: `quest_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        template,
        issuerId: regionId,
        objective: { ...template.baseObjective },
        reward: {
          ...template.baseReward,
          amount: Math.floor(template.baseReward.amount * (risk / 1000 + 0.5)),
        },
        urgency,
        risk,
      };
      
      this.derivedQuests.push(quest);
    }
  }
  
  /**
   * Find template by ID
   */
  private findTemplate(id: string): QuestTemplate | undefined {
    return this.templates.find(t => t.templateId === id);
  }
  
  /**
   * Register template
   */
  public registerTemplate(template: QuestTemplate): void {
    this.templates.push(template);
  }
  
  public getQuests(): DerivedQuest[] {
    return [...this.derivedQuests];
  }
}