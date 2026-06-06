/**
 * NPC Types and Memory System - Deterministic v2
 * 
 * Extended NPC memory from minimal `longTermGoals: string[]` to a deterministic,
 * replay-fähiges Memory-Modell with structured goals, relations, and events.
 * 
 * Key design principles:
 * - No runtime time sources (Date.now(), Math.random()) in decision logic
 * - Legacy string goals remain readable and deterministically normalized
 * - Tick-based events for replay capability
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * NPC States - deterministic union for state machine
 */
export type NPCState = 
  | 'idle' 
  | 'wandering' 
  | 'combat' 
  | 'questing' 
  | 'collecting'
  | 'trading'
  | 'social'
  | 'sleeping';

/**
 * Goal types for categorization and filtering
 */
export type NPCGoalType = 
  | 'combat' 
  | 'survive'
  | 'collect'
  | 'gather'
  | 'trade'
  | 'social'
  | 'quest_main'
  | 'quest_side'
  | 'explore'
  | 'defend'
  | 'flee'
  | 'rest'
  | 'migrate'
  | 'idle';

/**
 * Structured NPC Goal with priority and optional targeting
 */
export interface NPCGoal {
  id: string;
  type: NPCGoalType;
  priority: number;       // 0-100, higher = more important
  x?: number;             // Optional target position
  y?: number;
  z?: number;
  targetId?: string;      // Optional target entity ID
  reason?: string;        // Why this goal was created
  createdAtTick?: number; // Deterministic tick-based timestamp
}

/**
 * Legacy-compat: supports both structured goals and raw strings.
 * Raw strings are normalized to structured goals on read.
 */
export type NPCLongTermGoal = NPCGoal | string;

/**
 * Memory event types for NPC event log
 */
export type NPCMemoryEventType = 
  | 'observation'
  | 'combat_win'
  | 'combat_loss'
  | 'trade_success'
  | 'trade_failure'
  | 'chat_sent'
  | 'chat_received'
  | 'quest_started'
  | 'quest_completed'
  | 'quest_failed'
  | 'item_acquired'
  | 'item_lost'
  | 'player_interaction'
  | 'npc_interaction'
  | 'zone_entered'
  | 'zone_exited'
  | 'goal_added'
  | 'goal_removed'
  | 'goal_completed'
  | 'state_changed';

/**
 * Memory event stored in NPC event log
 */
export interface NPCMemoryEvent {
  id: string;
  npcId: string;
  kind: NPCMemoryEventType;
  tick: number;           // Deterministic tick, not wall-clock time
  content: string;
  tags: string[];
  data?: Record<string, unknown>;
}

/**
 * NPC relation to other entities (players, NPCs, factions)
 */
export interface NPCRelation {
  entityId: string;
  entityType: 'player' | 'npc' | 'faction';
  score: number;          // -100 to +100, like/dislike
  interactions: number;
  lastInteractionTick: number;
  trust: number;         // 0-100
  memory?: string;        // Optional note about relationship
}

/**
 * Memory summary for quick NPC decision-making
 */
export interface NPCMemorySummary {
  npcId: string;
  lastTick: number;
  currentGoalId?: string;
  goalCount: number;
  relationCount: number;
  recentEventCount: number;
  dominantMood?: string;
}

/**
 * Full NPC Memory structure (extends legacy NPCMemory)
 */
export interface NPCMemory {
  longTermGoals: NPCLongTermGoal[];
  // New v2 fields
  events: NPCMemoryEvent[];
  relations: NPCRelation[];
  summary: NPCMemorySummary;
}

// ============================================================================
// Helper Functions (Deterministic)
// ============================================================================

/**
 * Generate deterministic goal ID from components
 */
export function generateGoalId(npcId: string, goalType: NPCGoalType, tick: number): string {
  // Deterministic hash-like ID, no Math.random()
  const seed = `${npcId}:${goalType}:${tick}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `goal_${Math.abs(hash).toString(16)}`;
}

/**
 * Normalize a legacy string goal to structured NPCGoal
 * Preserves determinism by using consistent default values
 */
export function normalizeNPCGoal(goal: string | NPCGoal, npcId: string, tick: number): NPCGoal {
  if (typeof goal === 'object') {
    return goal;
  }
  
  // Legacy string goal normalization
  const goalStr = goal.toLowerCase();
  let type: NPCGoalType = 'idle';
  let priority = 50; // Default medium priority
  
  // Categorize by keyword matching (deterministic)
  if (goalStr.includes('guard') || goalStr.includes('defend')) {
    type = 'defend';
    priority = 80;
  } else if (goalStr.includes('combat') || goalStr.includes('attack')) {
    type = 'combat';
    priority = 85;
  } else if (goalStr.includes('collect') || goalStr.includes('gather')) {
    type = 'collect';
    priority = 70;
  } else if (goalStr.includes('trade') || goalStr.includes('merchant')) {
    type = 'trade';
    priority = 65;
  } else if (goalStr.includes('quest')) {
    type = goalStr.includes('main') ? 'quest_main' : 'quest_side';
    priority = 90;
  } else if (goalStr.includes('explore')) {
    type = 'explore';
    priority = 40;
  } else if (goalStr.includes('social') || goalStr.includes('talk')) {
    type = 'social';
    priority = 45;
  } else if (goalStr.includes('flee') || goalStr.includes('escape')) {
    type = 'flee';
    priority = 95;
  } else if (goalStr.includes('rest') || goalStr.includes('sleep')) {
    type = 'rest';
    priority = 30;
  }
  
  return {
    id: generateGoalId(npcId, type, tick),
    type,
    priority,
    reason: `normalized_from_legacy:${goal}`,
    createdAtTick: tick,
  };
}

/**
 * Compare two goals for sorting/filtering (deterministic)
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareNPCGoals(a: NPCLongTermGoal, b: NPCLongTermGoal): number {
  const goalA = typeof a === 'string' 
    ? { priority: 50, type: 'idle' as const, id: a } 
    : { priority: a.priority, type: a.type, id: a.id };
  const goalB = typeof b === 'string' 
    ? { priority: 50, type: 'idle' as const, id: b } 
    : { priority: b.priority, type: b.type, id: b.id };
  
  // Primary: priority descending
  if (goalA.priority !== goalB.priority) {
    return goalB.priority - goalA.priority;
  }
  
  // Secondary: type alphabetical for determinism
  const typeA = goalA.type ?? '';
  const typeB = goalB.type ?? '';
  if (typeA !== typeB) {
    return typeA < typeB ? -1 : typeA > typeB ? 1 : 0;
  }
  
  // Tertiary: ID alphabetical for determinism
  const idA = goalA.id ?? '';
  const idB = goalB.id ?? '';
  return idA < idB ? -1 : idA > idB ? 1 : 0;
}

/**
 * Create a memory event (deterministic, tick-based)
 */
export function rememberNPCEvent(
  npcId: string,
  kind: NPCMemoryEventType,
  content: string,
  tick: number,
  tags: string[] = [],
  data?: Record<string, unknown>
): NPCMemoryEvent {
  return {
    id: `evt_${npcId}_${tick}_${kind.substring(0, 4)}`,
    npcId,
    kind,
    tick,
    content,
    tags,
    data,
  };
}

/**
 * Adjust NPC relation with another entity (deterministic delta)
 */
export function adjustNPCRelation(
  relation: NPCRelation,
  delta: number,        // Positive = like, negative = dislike
  tick: number,
  interactionType?: 'positive' | 'negative' | 'neutral'
): NPCRelation {
  // Calculate new score, clamped to [-100, 100]
  const newScore = Math.max(-100, Math.min(100, relation.score + delta));
  
  // Trust adjusts based on interaction type
  let trustDelta = 0;
  if (interactionType === 'positive') {
    trustDelta = 5;
  } else if (interactionType === 'negative') {
    trustDelta = -5;
  }
  const newTrust = Math.max(0, Math.min(100, relation.trust + trustDelta));
  
  return {
    ...relation,
    score: newScore,
    trust: newTrust,
    interactions: relation.interactions + 1,
    lastInteractionTick: tick,
  };
}

/**
 * Create default NPC relation
 */
export function createNPCRelation(
  entityId: string,
  entityType: 'player' | 'npc' | 'faction'
): NPCRelation {
  return {
    entityId,
    entityType,
    score: 0,         // Neutral start
    interactions: 0,
    lastInteractionTick: 0,
    trust: 50,       // Neutral trust
  };
}

/**
 * Decide NPC state based on context (deterministic)
 */
export function decideNPCState(
  currentState: NPCState,
  goals: NPCLongTermGoal[],
  inCombat: boolean,
  inSocial: boolean,
  healthPercent: number
): NPCState {
  // Priority 1: Health-based state (critical)
  if (healthPercent < 20) {
    return 'idle'; // Rest/recover
  }
  
  // Priority 2: Combat state (overrides most)
  if (inCombat) {
    return 'combat';
  }
  
  // Priority 3: Check highest priority goal
  if (goals.length > 0) {
    const sortedGoals = [...goals].sort(compareNPCGoals);
    const topGoal = sortedGoals[0]!;
    const goalObj = typeof topGoal === 'string' 
      ? normalizeNPCGoal(topGoal, '', 0) 
      : topGoal;
    
    switch (goalObj.type) {
      case 'combat':
      case 'survive':
        return 'combat';
      case 'defend':
        return 'combat'; // Defend is combat-adjacent
      case 'collect':
      case 'gather':
        return 'collecting';
      case 'trade':
        return 'trading';
      case 'social':
      case 'quest_side':
        return 'social';
      case 'quest_main':
      case 'explore':
        return 'wandering';
      case 'rest':
        return 'sleeping';
      case 'flee':
        return 'idle'; // Try to escape, idle movement
      default:
        return 'idle';
    }
  }
  
  // Priority 4: Social state
  if (inSocial) {
    return 'social';
  }
  
  // Default: keep current or idle
  return currentState === 'sleeping' ? 'sleeping' : 'idle';
}

/**
 * Create memory summary from full memory (deterministic)
 */
export function createMemorySummary(
  npcId: string,
  tick: number,
  goals: NPCLongTermGoal[],
  relations: NPCRelation[],
  events: NPCMemoryEvent[]
): NPCMemorySummary {
  // Get top goal ID if exists
  let currentGoalId: string | undefined;
  if (goals.length > 0) {
    const sortedGoals = [...goals].sort(compareNPCGoals);
    const topGoal = sortedGoals[0]!;
    currentGoalId = typeof topGoal === 'object' ? topGoal.id : undefined;
  }
  
  // Count recent events (last 10 ticks)
  const recentEventCount = events.filter(e => tick - e.tick <= 10).length;
  
  // Determine dominant mood from relations
  let dominantMood: string | undefined;
  if (relations.length > 0) {
    const avgScore = relations.reduce((sum, r) => sum + r.score, 0) / relations.length;
    if (avgScore > 30) {
      dominantMood = 'friendly';
    } else if (avgScore < -30) {
      dominantMood = 'hostile';
    } else {
      dominantMood = 'neutral';
    }
  }
  
  return {
    npcId,
    lastTick: tick,
    currentGoalId,
    goalCount: goals.length,
    relationCount: relations.length,
    recentEventCount,
    dominantMood,
  };
}

/**
 * Filter goals by type (deterministic)
 */
export function filterGoalsByType(
  goals: NPCLongTermGoal[],
  types: NPCGoalType[]
): NPCLongTermGoal[] {
  return goals.filter(goal => {
    const goalObj = typeof goal === 'string' 
      ? normalizeNPCGoal(goal, '', 0) 
      : goal;
    return types.includes(goalObj.type);
  });
}

/**
 * Get highest priority goal (deterministic)
 */
export function getTopGoal(goals: NPCLongTermGoal[]): NPCLongTermGoal | undefined {
  if (goals.length === 0) return undefined;
  const sorted = [...goals].sort(compareNPCGoals);
  return sorted[0];
}

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * Legacy NPCMemory interface (minimal version for backward compatibility)
 */
export interface NPCLegacyMemory {
  longTermGoals: string[];
}

/**
 * Legacy NPC interface
 */
export interface NPC {
  id: string;
  name: string;
  state: string;
  stateTimer: number;
  memory: NPCLegacyMemory;
}

// Re-export for convenience
export type { NPCState as NpcStateEnum };