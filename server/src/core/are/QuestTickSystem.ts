/**
 * QuestTickSystem - Quest processing TickSystem
 * 
 * Phase 6 of the Core Reality Alignment initiative.
 * 
 * QuestEngine handles:
 * - Quest state tracking
 * - Objective completion checking
 * - Reward distribution
 */

import { TickSystem, TickSystemPriority, type TickSystemContext } from './TickSystem.js';
import { tickSystemRegistry } from './TickSystemRegistry.js';
import type { QuestEngine } from '../modules/quest/QuestEngine.js';

/**
 * QuestTickSystem implements TickSystem for quest processing.
 */
export class QuestTickSystem implements TickSystem {
  readonly name = 'quest';
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;
  
  private questEngine: QuestEngine;
  
  constructor(questEngine: QuestEngine) {
    this.questEngine = questEngine;
  }
  
  tick(context: TickSystemContext): void {
    // Quest processing is mostly event-driven
    // Periodic tasks include:
    // - Quest expiration checking
    // - Daily quest reset
    // - Event-driven quest completion
  }
  
  /**
   * Get the underlying QuestEngine.
   */
  getQuestEngine(): QuestEngine {
    return this.questEngine;
  }
  
  onStart(): void {
    console.log('[QuestTickSystem] Started - quest processing active');
  }
}

/**
 * Register QuestEngine with the global registry.
 */
export function registerQuestSystem(questEngine: QuestEngine): QuestTickSystem {
  const system = new QuestTickSystem(questEngine);
  
  tickSystemRegistry.register({
    system,
    dependencies: ['player-system'], // Quests are player-centric
    tags: ['quest', 'gameplay'],
  });
  
  return system;
}