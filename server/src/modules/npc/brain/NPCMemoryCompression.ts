/**
 * NPCMemoryCompression — Memory Summarization and State Management
 * 
 * Prevents unbounded memory growth by compressing episodic memories
 * into semantic summaries. Runs at 0.1 Hz (every 100 ticks).
 * 
 * Compression strategy:
 * 1. Select important events (score >= threshold)
 * 2. Generate semantic summaries from events
 * 3. Prune low-importance episodic memories
 * 4. Update learning statistics
 */

import { stableHash32 } from "../../../core/determinism/AREDeterminism.js";
import type {
  NPCMemoryV3,
  NPCEpisodicMemory,
  NPCSemanticMemory,
  NPCGoal,
  WorldMemoryEventType,
} from "./NPCMemoryV3.js";

// ============================================================================
// Compression Configuration
// ============================================================================

export interface MemoryCompressionConfig {
  /** Minimum score to keep episodic memory */
  minEpisodicScore: number;
  /** Maximum episodic memories to keep */
  maxEpisodicMemories: number;
  /** Maximum semantic memories to keep */
  maxSemanticMemories: number;
  /** Ticks between compression runs */
  compressionInterval: number;
  /** Minimum events for summary generation */
  minEventsForSummary: number;
  /** Importance threshold for summary inclusion */
  summaryImportanceThreshold: number;
}

export const DEFAULT_COMPRESSION_CONFIG: MemoryCompressionConfig = {
  minEpisodicScore: 5,
  maxEpisodicMemories: 64,
  maxSemanticMemories: 128,
  compressionInterval: 100,
  minEventsForSummary: 3,
  summaryImportanceThreshold: 8,
};

// ============================================================================
// Semantic Summary Generation
// ============================================================================

/**
 * Generate semantic summary text from episodic memories
 */
export function buildDeterministicSummaryText(
  events: NPCEpisodicMemory[],
  npcId: string
): string {
  if (events.length === 0) {
    return `No significant events for ${npcId}`;
  }

  // Group by type
  const typeGroups = new Map<WorldMemoryEventType, NPCEpisodicMemory[]>();
  for (const event of events) {
    const group = typeGroups.get(event.type) ?? [];
    group.push(event);
    typeGroups.set(event.type, group);
  }

  const summaries: string[] = [];

  // Combat summary
  const combatEvents = typeGroups.get("player_attack") ?? [];
  const combatWins = typeGroups.get("combat_won") ?? [];
  const combatLosses = typeGroups.get("combat_lost") ?? [];
  
  if (combatEvents.length > 0) {
    const playerAttacks = new Set(combatEvents.map((e) => e.actorId)).size;
    summaries.push(
      `${combatEvents.length} attacks witnessed, ${combatWins.length} wins, ${combatLosses.length} losses, ${playerAttacks} different attackers`
    );
  }

  // Trade summary
  const tradeEvents = typeGroups.get("player_trade") ?? [];
  if (tradeEvents.length > 0) {
    summaries.push(`${tradeEvents.length} trades observed`);
  }

  // Quest summary
  const questEvents = [
    ...(typeGroups.get("quest_completed") ?? []),
    ...(typeGroups.get("quest_failed") ?? []),
    ...(typeGroups.get("quest_started") ?? []),
  ];
  if (questEvents.length > 0) {
    const completed = typeGroups.get("quest_completed")?.length ?? 0;
    const failed = typeGroups.get("quest_failed")?.length ?? 0;
    summaries.push(`${completed} quests completed, ${failed} failed`);
  }

  // Resource events
  const resourceEvents = typeGroups.get("resource_shortage") ?? [];
  if (resourceEvents.length > 0) {
    summaries.push(`${resourceEvents.length} resource shortages witnessed`);
  }

  // Faction events
  const factionEvents = typeGroups.get("faction_joined") ?? [];
  const factionLeftEvents = typeGroups.get("faction_left") ?? [];
  if (factionEvents.length > 0 || factionLeftEvents.length > 0) {
    summaries.push(
      `${factionEvents.length} faction joins, ${factionLeftEvents.length} faction leaves`
    );
  }

  // Generate summary based on tags
  const allTags = events.flatMap((e) => e.tags);
  const tagCounts = new Map<string, number>();
  for (const tag of allTags) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  if (topTags.length > 0) {
    summaries.push(`Top interests: ${topTags.join(", ")}`);
  }

  return summaries.join("; ") || "Routine activity";
}

/**
 * Collect all unique tags from events
 */
export function collectSortedTags(events: NPCEpisodicMemory[]): string[] {
  const tagSet = new Set<string>();
  for (const event of events) {
    for (const tag of event.tags) {
      tagSet.add(tag);
    }
    // Also add event type as tag
    tagSet.add(event.type);
  }
  return [...tagSet].sort();
}

/**
 * Convert summary to semantic memory
 */
export function summaryToSemanticMemory(
  summary: {
    id: string;
    tick: number;
    text: string;
    weight: number;
    tags: string[];
  },
  category: string = "general"
): NPCSemanticMemory {
  return {
    id: summary.id,
    tick: summary.tick,
    text: summary.text,
    category,
    confidence: Math.min(1, summary.weight / 50), // Higher weight = more confidence
    sourceEventIds: [],
    lastUpdatedTick: summary.tick,
    weight: summary.weight,
    tags: summary.tags,
  };
}

// ============================================================================
// Memory Compression
// ============================================================================

/**
 * Compress NPC memory to prevent state bloat
 */
export function compressNPCMemory(
  memory: NPCMemoryV3,
  tick: number,
  config: MemoryCompressionConfig = DEFAULT_COMPRESSION_CONFIG
): NPCMemoryV3 {
  const updatedMemory = { ...memory };

  // ─── Compress Episodic Memory ──────────────────────────────────────────────

  // Filter by importance score
  const importantEvents = updatedMemory.episodic
    .filter((event) => (event.score ?? 0) >= config.minEpisodicScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, config.maxEpisodicMemories);

  // ─── Generate Semantic Summary ──────────────────────────────────────────────

  const recentEvents = updatedMemory.episodic.slice(-config.maxEpisodicMemories);
  
  if (recentEvents.length >= config.minEventsForSummary) {
    const summaryText = buildDeterministicSummaryText(recentEvents, memory.identity.npcId);
    const summaryWeight = recentEvents.reduce((sum, e) => sum + (e.score ?? 0), 0);
    const summaryTags = collectSortedTags(recentEvents);

    const summaryId = `summary_${tick}_${stableHash32(memory.identity.npcId).toString(16)}`;

    const semantic: NPCSemanticMemory = {
      id: summaryId,
      tick,
      text: summaryText,
      category: "compressed_summary",
      confidence: Math.min(1, summaryWeight / 100),
      sourceEventIds: recentEvents.map((e) => e.id),
      lastUpdatedTick: tick,
      weight: summaryWeight,
      tags: summaryTags,
    };

    // Add to semantic memory (at start, most recent first)
    updatedMemory.semantic = [semantic, ...updatedMemory.semantic].slice(
      0,
      config.maxSemanticMemories
    );
  }

  // Enforce semantic-memory bounds even when no new episodic summary was created.
  updatedMemory.semantic = updatedMemory.semantic.slice(0, config.maxSemanticMemories);

  // ─── Update Episodic Memory ─────────────────────────────────────────────────

  updatedMemory.episodic = importantEvents;

  // ─── Prune Old Goals ────────────────────────────────────────────────────────

  // Keep only active goals with recent activity
  const activeGoals = updatedMemory.goals.filter((goal) => {
    if (goal.completed || goal.failed) return false;
    // Keep goals created within last 1000 ticks
    return tick - goal.createdAtTick < 1000;
  });

  // Keep top 10 goals
  updatedMemory.goals = activeGoals
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);

  // ─── Update Learning Stats ─────────────────────────────────────────────────

  const totalActions = updatedMemory.learning.totalActions;
  const totalSuccesses = updatedMemory.learning.totalSuccesses;
  
  // Decay old context scores (forgotten knowledge)
  const decayFactor = 0.95;
  const now = tick;
  
  const updatedContextScores: Record<string, number> = {};
  for (const [key, score] of Object.entries(updatedMemory.learning.contextScores)) {
    // Only keep if used recently (within last 500 ticks)
    if (now - updatedMemory.learning.lastOutcomeTick < 500) {
      updatedContextScores[key] = Math.trunc(score * decayFactor);
    }
  }

  updatedMemory.learning = {
    ...updatedMemory.learning,
    contextScores: updatedContextScores,
  };

  return updatedMemory;
}

/**
 * Apply scheduled compression check
 */
export function shouldCompress(
  npcId: string,
  tick: number,
  lastCompressionTick: number,
  config: MemoryCompressionConfig = DEFAULT_COMPRESSION_CONFIG
): boolean {
  if (tick - lastCompressionTick < config.compressionInterval) {
    return false;
  }

  // Use stable hash for deterministic scheduling
  const phase = stableHash32(npcId) % config.compressionInterval;
  return tick % config.compressionInterval === phase;
}

// ============================================================================
// Memory Cleanup
// ============================================================================

/**
 * Remove stale relations (no interaction for 1000+ ticks)
 */
export function pruneStaleRelations(
  relations: Record<string, { lastInteractionTick: number }>,
  tick: number,
  threshold: number = 1000
): Record<string, { lastInteractionTick: number }> {
  const pruned: Record<string, { lastInteractionTick: number }> = {};
  
  for (const [entityId, relation] of Object.entries(relations)) {
    if (tick - relation.lastInteractionTick < threshold) {
      pruned[entityId] = relation;
    }
  }
  
  return pruned;
}

/**
 * Remove low-importance fears (not triggered in a while)
 */
export function pruneOldFears(
  fears: Array<{ lastTriggeredTick: number; triggerCount: number }>,
  tick: number,
  threshold: number = 500
): Array<{ lastTriggeredTick: number; triggerCount: number }> {
  return fears.filter((fear) => {
    // Keep if triggered recently
    if (tick - fear.lastTriggeredTick < threshold) return true;
    // Keep if triggered many times (strong fear)
    if (fear.triggerCount >= 3) return true;
    return false;
  });
}

// ============================================================================
// Memory Verification
// ============================================================================

export interface MemoryIntegrityResult {
  valid: boolean;
  episodicCount: number;
  semanticCount: number;
  goalCount: number;
  relationCount: number;
  issues: string[];
}

/**
 * Verify memory integrity
 */
export function verifyMemoryIntegrity(
  memory: NPCMemoryV3,
  maxEpisodic: number = 256,
  maxSemantic: number = 128,
  maxGoals: number = 20,
  maxRelations: number = 100
): MemoryIntegrityResult {
  const issues: string[] = [];

  // Check episodic memory bounds
  if (memory.episodic.length > maxEpisodic) {
    issues.push(`Episodic memory exceeds max (${memory.episodic.length} > ${maxEpisodic})`);
  }

  // Check semantic memory bounds
  if (memory.semantic.length > maxSemantic) {
    issues.push(`Semantic memory exceeds max (${memory.semantic.length} > ${maxSemantic})`);
  }

  // Check goal bounds
  if (memory.goals.length > maxGoals) {
    issues.push(`Goals exceed max (${memory.goals.length} > ${maxGoals})`);
  }

  // Check relation bounds
  if (Object.keys(memory.relations).length > maxRelations) {
    issues.push(`Relations exceed max (${Object.keys(memory.relations).length} > ${maxRelations})`);
  }

  // Check for duplicate episodic IDs
  const episodicIds = memory.episodic.map((e) => e.id);
  const uniqueIds = new Set(episodicIds);
  if (episodicIds.length !== uniqueIds.size) {
    issues.push("Duplicate episodic memory IDs detected");
  }

  // Check for duplicate semantic IDs
  const semanticIds = memory.semantic.map((s) => s.id);
  const uniqueSemanticIds = new Set(semanticIds);
  if (semanticIds.length !== uniqueSemanticIds.size) {
    issues.push("Duplicate semantic memory IDs detected");
  }

  return {
    valid: issues.length === 0,
    episodicCount: memory.episodic.length,
    semanticCount: memory.semantic.length,
    goalCount: memory.goals.length,
    relationCount: Object.keys(memory.relations).length,
    issues,
  };
}

/**
 * Get memory statistics
 */
export function getMemoryStats(memory: NPCMemoryV3): {
  totalMemories: number;
  episodicCount: number;
  semanticCount: number;
  eventTypes: Record<string, number>;
  averageScore: number;
  topGoals: NPCGoal[];
} {
  const eventTypes: Record<string, number> = {};
  let totalScore = 0;

  for (const event of memory.episodic) {
    eventTypes[event.type] = (eventTypes[event.type] ?? 0) + 1;
    totalScore += event.score ?? 0;
  }

  const topGoals = [...memory.goals]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  return {
    totalMemories: memory.episodic.length + memory.semantic.length,
    episodicCount: memory.episodic.length,
    semanticCount: memory.semantic.length,
    eventTypes,
    averageScore: memory.episodic.length > 0 
      ? totalScore / memory.episodic.length 
      : 0,
    topGoals,
  };
}