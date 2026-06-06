/**
 * NPCMemoryV3 — Autonomous Learning NPC Brain Memory System
 * 
 * A 5-layer memory model for deterministic NPC behavior:
 * - Identity: Who am I?
 * - Episodic: What happened to me?
 * - Semantic: What do I know?
 * - Relations: Who do I know?
 * - Learning: What worked for me?
 * 
 * All memory operations are tick-based and deterministic for replay capability.
 * Same tick + same input = same output (no Math.random() in decision logic).
 */

import { stableHash32 } from "../../../core/determinism/AREDeterminism.js";

// ============================================================================
// World Event Types — All events NPCs can observe
// ============================================================================

export type WorldMemoryEventType =
  | "player_attack"
  | "player_help"
  | "player_trade"
  | "npc_death"
  | "npc_birth"
  | "resource_shortage"
  | "market_price_shift"
  | "city_tax_changed"
  | "guild_declared_war"
  | "king_elected"
  | "building_destroyed"
  | "building_constructed"
  | "quest_completed"
  | "quest_failed"
  | "quest_started"
  | "weather_disaster"
  | "dungeon_opened"
  | "dungeon_closed"
  | "boss_spawned"
  | "boss_defeated"
  | "caravan_raided"
  | "caravan_arrived"
  | "law_changed"
  | "territory_claimed"
  | "faction_joined"
  | "faction_left"
  | "item_stolen"
  | "item_gifted"
  | "combat_won"
  | "combat_lost"
  | "social_greeting"
  | "social_argument"
  | "crafting_completed"
  | "exploration_discovered";

// ============================================================================
// Identity Memory — Who am I?
// ============================================================================

export interface NPCIdentityMemory {
  npcId: string;
  name: string;
  profession: string;
  homeCityId?: string;
  homeRegionId: string;
  role: string; // guard, merchant, farmer, noble, etc.
  moralAlignment: number; // -100 to +100
  courage: number; // 0 to 100
  greed: number; // 0 to 100
  loyalty: number; // 0 to 100
  personalityTraits: string[];
  birthTick?: number;
}

// ============================================================================
// Episodic Memory — Concrete events I experienced
// ============================================================================

export interface NPCEpisodicMemory {
  id: string;
  tick: number;
  type: WorldMemoryEventType;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  regionId?: string;
  cityId?: string;
  factionId?: string;
  guildId?: string;
  impact: number; // -10 to +10, negative = bad, positive = good
  tags: string[];
  payload: Record<string, string | number | boolean>;
  score?: number; // Calculated memory importance score
  emotionalWeight?: number;
}

// ============================================================================
// Semantic Memory — Verdichtetes Wissen
// ============================================================================

export interface NPCSemanticMemory {
  id: string;
  tick: number;
  text: string; // "Spieler X ist gefährlich" / "Region Y hat wenig Eisen"
  category: string;
  confidence: number; // 0 to 1, how certain is this knowledge
  sourceEventIds: string[]; // Which episodic memories formed this
  lastUpdatedTick: number;
  weight: number; // Importance of this knowledge
  tags: string[];
}

// ============================================================================
// Relations — Who I know and how I feel
// ============================================================================

export interface NPCRelation {
  entityId: string;
  entityType: "player" | "npc" | "faction" | "city" | "guild";
  trust: number; // -100 to +100
  fear: number; // 0 to 100, how afraid I am
  respect: number; // 0 to 100
  greed: number; // 0 to 100, how much I want their resources
  morale: number; // -100 to +100, how much I like them
  interactions: number;
  lastInteractionTick: number;
  positiveInteractions: number;
  negativeInteractions: number;
  memory?: string; // "They helped me once" / "They attacked my caravan"
  blocked?: boolean; // Blacklisted
}

// ============================================================================
// Goals — What I'm trying to achieve
// ============================================================================

export interface NPCGoal {
  id: string;
  type: NPCGoalType;
  priority: number; // 0-100, higher = more important
  createdAtTick: number;
  targetId?: string;
  targetPosition?: { x: number; y: number };
  regionId?: string;
  reason: string;
  progress?: number; // 0 to 1
  completed?: boolean;
  failed?: boolean;
}

export type NPCGoalType =
  | "combat"
  | "survive"
  | "collect"
  | "gather"
  | "trade"
  | "social"
  | "quest_main"
  | "quest_side"
  | "explore"
  | "defend"
  | "flee"
  | "rest"
  | "migrate"
  | "work"
  | "craft"
  | "patrol"
  | "raise_alarm"
  | "hire_guard"
  | "start_caravan"
  | "join_guild"
  | "vote"
  | "idle";

// ============================================================================
// Routines — Daily schedules
// ============================================================================

export interface NPCRoutine {
  id: string;
  label: string;
  startTickModulo: number; // Time of day (0-1000 for relative day)
  endTickModulo: number;
  preferredRegionId: string;
  action: NPCRoutineAction;
  priority: number;
  safetyRequirement: number; // Minimum safety to execute
  conditions?: string[];
}

export type NPCRoutineAction =
  | "work"
  | "sleep"
  | "trade"
  | "patrol"
  | "social"
  | "travel"
  | "gather"
  | "craft"
  | "guard";

// ============================================================================
// Fears — What I'm afraid of
// ============================================================================

export interface NPCFearMemory {
  id: string;
  trigger: string; // "player_attack", "resource_shortage", etc.
  fearLevel: number; // 0 to 100
  lastTriggeredTick: number;
  triggerCount: number;
  associatedEntityIds: string[];
}

// ============================================================================
// Skills — What I can do
// ============================================================================

export interface NPCSkillMemory {
  skillId: string;
  name: string;
  level: number;
  experience: number;
  lastUsedTick: number;
  successRate: number; // 0 to 1
  failureCount: number;
}

// ============================================================================
// Economy — Economic knowledge and state
// ============================================================================

export interface NPCEconomyMemory {
  wealth: number;
  debt: number;
  preferredGoods: string[];
  avoidedGoods: string[];
  trustedTradePartners: string[];
  lastTradeTick: number;
  priceExpectations: Record<string, number>; // goods -> expected price
}

// ============================================================================
// Faction — Faction-related knowledge
// ============================================================================

export interface NPCFactionMemory {
  factionId?: string;
  factionRank: number;
  loyaltyToFaction: number; // 0 to 100
  factionContributions: number;
  factionEnemies: string[];
  lastFactionActionTick: number;
}

// ============================================================================
// Politics — Political knowledge and stances
// ============================================================================

export interface NPCPoliticalMemory {
  supportedLeaderId?: string;
  oppositionIds: string[];
  lastVoteTick: number;
  taxTolerance: number; // How high taxes can get before I complain
  cityMood: number; // -100 to +100, how I feel about my city
  migrationDesire: number; // 0 to 100, how much I want to leave
}

// ============================================================================
// Combat — Combat knowledge and habits
// ============================================================================

export interface NPCCombatMemory {
  victories: number;
  defeats: number;
  lastCombatTick: number;
  preferredWeapons: string[];
  avoidedEnemies: string[];
  fleeThreshold: number; // HP % at which I flee
  escortRequests: number; // How often I hired guards
  killedByPlayer: Record<string, number>; // playerId -> count
}

// ============================================================================
// Learning State — Statistical experience tracking
// ============================================================================

export interface NPCLearningState {
  actionScores: Record<string, number>; // actionId -> score (higher = more successful)
  contextScores: Record<string, number>; // contextKey -> score
  failedActions: Record<string, number>; // actionId -> failure count
  successfulActions: Record<string, number>; // actionId -> success count
  lastOutcomeTick: number;
  totalActions: number;
  totalSuccesses: number;
}

// ============================================================================
// NPC Memory V3 — Full Memory Structure
// ============================================================================

export interface NPCMemoryV3 {
  identity: NPCIdentityMemory;
  episodic: NPCEpisodicMemory[];
  semantic: NPCSemanticMemory[];
  relations: Record<string, NPCRelation>;
  goals: NPCGoal[];
  routines: NPCRoutine[];
  fears: NPCFearMemory[];
  skills: NPCSkillMemory[];
  economy: NPCEconomyMemory;
  faction: NPCFactionMemory;
  politics: NPCPoliticalMemory;
  combat: NPCCombatMemory;
  learning: NPCLearningState;
}

// ============================================================================
// NPC Observation — Event from world to NPC
// ============================================================================

export interface NPCObservation {
  id: string;
  tick: number;
  type: WorldMemoryEventType;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  regionId?: string;
  cityId?: string;
  factionId?: string;
  guildId?: string;
  impact: number; // -10 to +10
  tags: string[];
  payload: Record<string, string | number | boolean>;
}

// ============================================================================
// NPC Decision Types
// ============================================================================

export interface NPCDecisionInput {
  tick: number;
  npcId: string;
  npcName: string;
  position: { x: number; y: number };
  homeRegionId: string;
  factionId?: string;
  state: string;
  health: number;
  energy: number;
  gold: number;
  memory: NPCMemoryV3;
  world: NPCWorldSnapshot;
  nearbyEntities: Array<{
    id: string;
    name: string;
    type: "player" | "npc" | "monster";
    position: { x: number; y: number };
    faction?: string;
    hostile?: boolean;
  }>;
}

export interface NPCDecision {
  action: NPCActionType;
  targetId?: string;
  targetPosition?: { x: number; y: number };
  reason: string;
  score: number;
  confidence: number; // 0 to 1
}

export type NPCActionType =
  | "idle"
  | "talk"
  | "trade"
  | "flee"
  | "attack"
  | "patrol"
  | "work"
  | "gather"
  | "craft"
  | "join_guild"
  | "vote"
  | "raise_alarm"
  | "move_city"
  | "hire_guard"
  | "start_caravan"
  | "explore"
  | "social"
  | "defend";

// ============================================================================
// World Snapshot — What NPCs can perceive
// ============================================================================

export interface NPCWorldSnapshot {
  tick: number;
  regionId: string;
  timeOfDay: number; // 0-24
  weather?: string;
  dangerLevel: number; // 0 to 1
  resourceAvailability: Record<string, number>;
  marketPrices: Record<string, number>;
  nearbyThreats: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    strength: number;
  }>;
  friendlyNPCs: string[];
  hostileNPCs: string[];
}

// ============================================================================
// Memory Score — How important is this memory?
// ============================================================================

export interface MemoryScore {
  importance: number;
  emotionalWeight: number;
  recency: number;
  repetition: number;
  personalRelevance: number;
  factionRelevance: number;
  finalScore: number;
}

// ============================================================================
// Brain Tick Result — Output of NPC brain tick
// ============================================================================

export interface NPCBrainOutput {
  npcId: string;
  tick: number;
  nextState: string;
  decision: NPCDecision;
  memory: NPCMemoryV3;
  memoryHash: string;
}

// ============================================================================
// Brain Debug Snapshot — For debugging HUD
// ============================================================================

export interface NPCBrainDebugSnapshot {
  npcId: string;
  tick: number;
  state: string;
  topGoal?: NPCGoal;
  decision: NPCDecision;
  relationHighlights: NPCRelation[];
  recentEvents: NPCEpisodicMemory[];
  memoryHash: string;
  learningStats: {
    totalActions: number;
    totalSuccesses: number;
    successRate: number;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate deterministic episodic memory ID
 */
export function generateEpisodicId(npcId: string, tick: number, type: WorldMemoryEventType): string {
  const hash = stableHash32(`${npcId}:${tick}:${type}`);
  return `ep_${hash.toString(16)}`;
}

/**
 * Generate deterministic goal ID
 */
export function generateGoalId(npcId: string, type: NPCGoalType, tick: number): string {
  const hash = stableHash32(`${npcId}:${type}:${tick}`);
  return `goal_${hash.toString(16)}`;
}

/**
 * Create empty NPCMemoryV3 with defaults
 */
export function createEmptyNPCMemoryV3(
  npcId: string,
  name: string,
  homeRegionId: string,
  profession: string = "worker",
  role: string = "citizen"
): NPCMemoryV3 {
  return {
    identity: {
      npcId,
      name,
      profession,
      homeRegionId,
      role,
      moralAlignment: 0,
      courage: 50,
      greed: 30,
      loyalty: 50,
      personalityTraits: [],
    },
    episodic: [],
    semantic: [],
    relations: {},
    goals: [],
    routines: [],
    fears: [],
    skills: [],
    economy: {
      wealth: 50,
      debt: 0,
      preferredGoods: [],
      avoidedGoods: [],
      trustedTradePartners: [],
      lastTradeTick: 0,
      priceExpectations: {},
    },
    faction: {
      factionRank: 0,
      loyaltyToFaction: 50,
      factionContributions: 0,
      factionEnemies: [],
      lastFactionActionTick: 0,
    },
    politics: {
      oppositionIds: [],
      lastVoteTick: 0,
      taxTolerance: 50,
      cityMood: 0,
      migrationDesire: 0,
    },
    combat: {
      victories: 0,
      defeats: 0,
      lastCombatTick: 0,
      preferredWeapons: [],
      avoidedEnemies: [],
      fleeThreshold: 0.2,
      escortRequests: 0,
      killedByPlayer: {},
    },
    learning: {
      actionScores: {},
      contextScores: {},
      failedActions: {},
      successfulActions: {},
      lastOutcomeTick: 0,
      totalActions: 0,
      totalSuccesses: 0,
    },
  };
}

/**
 * Convert legacy NPCMemory to NPCMemoryV3 (for compatibility)
 */
export function migrateLegacyMemory(
  legacyMemory: { longTermGoals?: string[]; events?: unknown[]; relations?: unknown[] },
  npcId: string,
  name: string,
  homeRegionId: string
): NPCMemoryV3 {
  const base = createEmptyNPCMemoryV3(npcId, name, homeRegionId);
  
  // Migrate goals
  if (legacyMemory.longTermGoals) {
    base.goals = legacyMemory.longTermGoals.map((goal, idx) => ({
      id: generateGoalId(npcId, normalizeGoalType(goal), idx),
      type: normalizeGoalType(goal),
      priority: 50,
      createdAtTick: 0,
      reason: `migrated:${goal}`,
    }));
  }
  
  return base;
}

/**
 * Normalize legacy goal string to goal type
 */
function normalizeGoalType(goal: string): NPCGoalType {
  const g = goal.toLowerCase();
  if (g.includes("guard") || g.includes("defend")) return "defend";
  if (g.includes("combat") || g.includes("attack")) return "combat";
  if (g.includes("collect") || g.includes("gather")) return "collect";
  if (g.includes("trade") || g.includes("merchant")) return "trade";
  if (g.includes("quest")) return g.includes("main") ? "quest_main" : "quest_side";
  if (g.includes("explore")) return "explore";
  if (g.includes("social") || g.includes("talk")) return "social";
  if (g.includes("flee") || g.includes("escape")) return "flee";
  if (g.includes("rest") || g.includes("sleep")) return "rest";
  if (g.includes("work")) return "work";
  if (g.includes("craft")) return "craft";
  return "idle";
}

/**
 * Calculate memory hash for replay verification
 */
export function calculateMemoryHash(memory: NPCMemoryV3): string {
  const components = [
    memory.identity.npcId,
    memory.identity.homeRegionId,
    memory.goals.length,
    memory.episodic.length,
    memory.semantic.length,
    Object.keys(memory.relations).length,
    JSON.stringify(memory.learning.actionScores),
    JSON.stringify(memory.learning.contextScores),
  ];
  
  const hash = stableHash32(components.join("|"));
  return hash.toString(16).padStart(8, "0");
}