/**
 * NPCBrainDebugSnapshot — Debug HUD and Replay Support
 * 
 * Provides structured debug information for:
 * - Admin/Dev HUD visualization
 * - Replay verification (same tick + same input = same output)
 * - Memory integrity checking
 * - NPC behavior debugging
 */

import { stableHash32, deterministicNow } from "../../../core/determinism/AREDeterminism.js";
import type {
  NPCMemoryV3,
  NPCDecision,
  NPCGoal,
  NPCRelation,
  NPCEpisodicMemory,
  NPCBrainDebugSnapshot,
} from "./NPCMemoryV3.js";

// ============================================================================
// Stable Sorting (deterministic replacement for localeCompare)
// ============================================================================

/**
 * Compare strings deterministically without localeCompare
 */
function stableStringCompare(a: string, b: string): number {
  const hashA = stableHash32(a);
  const hashB = stableHash32(b);
  return hashA - hashB;
}

// ============================================================================
// Debug Snapshot Generation
// ============================================================================

/**
 * Create debug snapshot for NPC brain state
 */
export function createNPCBrainDebugSnapshot(
  npcId: string,
  tick: number,
  state: string,
  memory: NPCMemoryV3,
  decision: NPCDecision | null,
  additionalInfo?: {
    lastActionResult?: "success" | "failure" | "neutral";
    dangerLevel?: number;
    nearbyEntities?: number;
  }
): NPCBrainDebugSnapshot {
  // Get top goal
  const topGoal = getTopGoal(memory);

  // Get relation highlights (most important relations)
  const relationHighlights = getRelationHighlights(memory.relations);

  // Get recent events
  const recentEvents = getRecentEvents(memory.episodic, 10);

  // Calculate learning stats
  const totalActions = memory.learning.totalActions;
  const totalSuccesses = memory.learning.totalSuccesses;
  const successRate = totalActions > 0 ? totalSuccesses / totalActions : 0;

  // Calculate memory hash for replay verification
  const memoryHash = calculateMemoryHash(memory);

  return {
    npcId,
    tick,
    state,
    topGoal,
    decision: decision ?? {
      action: "idle",
      reason: "no_decision_made",
      score: 0,
      confidence: 0,
    },
    relationHighlights,
    recentEvents,
    memoryHash,
    learningStats: {
      totalActions,
      totalSuccesses,
      successRate,
    },
  };
}

/**
 * Get top goal from memory
 */
function getTopGoal(memory: NPCMemoryV3): NPCGoal | undefined {
  if (memory.goals.length === 0) return undefined;
  
  return [...memory.goals]
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return stableStringCompare(a.id, b.id);
    })[0];
}

/**
 * Get most important relations for debugging
 */
function getRelationHighlights(relations: Record<string, NPCRelation>): NPCRelation[] {
  return Object.values(relations)
    .sort((a, b) => {
      // Sort by absolute score (most extreme first)
      const aAbs = Math.abs(a.trust) + Math.abs(a.fear);
      const bAbs = Math.abs(b.trust) + Math.abs(b.fear);
      if (aAbs !== bAbs) return bAbs - aAbs;
      // Then by interaction count
      return b.interactions - a.interactions;
    })
    .slice(0, 5);
}

/**
 * Get recent events for debugging
 */
function getRecentEvents(episodic: NPCEpisodicMemory[], count: number): NPCEpisodicMemory[] {
  return [...episodic]
    .sort((a, b) => b.tick - a.tick)
    .slice(0, count);
}

/**
 * Calculate memory hash for replay verification
 */
function calculateMemoryHash(memory: NPCMemoryV3): string {
  const components = [
    memory.identity.npcId,
    memory.identity.homeRegionId,
    memory.goals.length,
    memory.episodic.length,
    memory.semantic.length,
    Object.keys(memory.relations).length,
    JSON.stringify(
      Object.entries(memory.learning.actionScores)
        .sort((a, b) => stableStringCompare(a[0], b[0]))
        .slice(0, 10)
    ),
    JSON.stringify(
      Object.entries(memory.learning.contextScores)
        .sort((a, b) => stableStringCompare(a[0], b[0]))
        .slice(0, 10)
    ),
  ];

  const hash = stableHash32(components.join("||"));
  return hash.toString(16).padStart(8, "0");
}

// ============================================================================
// Debug Visualization
// ============================================================================

export interface DebugDisplayInfo {
  npcName: string;
  state: string;
  topGoal: string;
  goalReason: string;
  trustPlayer: number;
  fearPlayer: number;
  factionMood: string;
  nextAction: string;
  decisionReason: string;
  memoryEvents: number;
  summaries: number;
  memoryHash: string;
  learningSuccessRate: string;
}

/**
 * Format debug snapshot for display
 */
export function formatDebugDisplay(snapshot: NPCBrainDebugSnapshot): DebugDisplayInfo {
  const memory = snapshot; // Access through snapshot
  
  return {
    npcName: snapshot.npcId, // Would need name from identity
    state: snapshot.state,
    topGoal: snapshot.topGoal?.type ?? "none",
    goalReason: snapshot.topGoal?.reason ?? "no_goal",
    trustPlayer: getHighestRelationValue(snapshot.relationHighlights, "trust"),
    fearPlayer: getHighestRelationValue(snapshot.relationHighlights, "fear"),
    factionMood: "neutral", // Would calculate from faction memory
    nextAction: snapshot.decision.action,
    decisionReason: snapshot.decision.reason,
    memoryEvents: snapshot.recentEvents.length,
    summaries: 0, // Would count from memory
    memoryHash: snapshot.memoryHash,
    learningSuccessRate: `${(snapshot.learningStats.successRate * 100).toFixed(1)}%`,
  };
}

/**
 * Get highest relation value for specific attribute
 */
function getHighestRelationValue(relations: NPCRelation[], attr: "trust" | "fear" | "morale"): number {
  if (relations.length === 0) return 0;
  
  return Math.max(...relations.map((r) => r[attr]));
}

// ============================================================================
// Replay Verification
// ============================================================================

export interface ReplayVerificationResult {
  verified: boolean;
  expectedHash: string;
  actualHash: string;
  differences: string[];
}

/**
 * Verify replay by comparing memory hashes
 */
export function verifyReplay(
  previousSnapshot: NPCBrainDebugSnapshot,
  currentSnapshot: NPCBrainDebugSnapshot,
  expectedIdentical: boolean = true
): ReplayVerificationResult {
  const differences: string[] = [];

  // Check if memory hash matches
  if (previousSnapshot.memoryHash !== currentSnapshot.memoryHash) {
    differences.push(
      `Memory hash changed: ${previousSnapshot.memoryHash} -> ${currentSnapshot.memoryHash}`
    );
  }

  // Check if decision matches
  if (previousSnapshot.decision.action !== currentSnapshot.decision.action) {
    differences.push(
      `Decision changed: ${previousSnapshot.decision.action} -> ${currentSnapshot.decision.action}`
    );
  }

  // Check if state matches
  if (previousSnapshot.state !== currentSnapshot.state) {
    differences.push(`State changed: ${previousSnapshot.state} -> ${currentSnapshot.state}`);
  }

  // Verify
  const isExpectedChange = expectedIdentical 
    ? differences.length === 0 
    : differences.length > 0;

  return {
    verified: isExpectedChange,
    expectedHash: previousSnapshot.memoryHash,
    actualHash: currentSnapshot.memoryHash,
    differences,
  };
}

// ============================================================================
// Brain Health Check
// ============================================================================

export interface BrainHealthResult {
  healthy: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

/**
 * Check NPC brain health
 */
export function checkBrainHealth(memory: NPCMemoryV3, tick: number): BrainHealthResult {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check memory bloat
  if (memory.episodic.length > 200) {
    issues.push("Episodic memory growing too large");
    recommendations.push("Run memory compression more frequently");
    score -= 10;
  }

  // Check for stale learning
  const timeSinceLastOutcome = tick - memory.learning.lastOutcomeTick;
  if (timeSinceLastOutcome > 500 && memory.learning.totalActions > 10) {
    issues.push("No learning outcomes for a long time");
    recommendations.push("Ensure NPC is getting feedback on actions");
    score -= 15;
  }

  // Check for low success rate
  if (memory.learning.totalActions > 5) {
    const successRate = memory.learning.totalSuccesses / memory.learning.totalActions;
    if (successRate < 0.3) {
      issues.push(`Low success rate: ${(successRate * 100).toFixed(0)}%`);
      recommendations.push("Review decision scoring logic");
      score -= 20;
    }
  }

  // Check for no goals
  if (memory.goals.length === 0) {
    issues.push("NPC has no active goals");
    recommendations.push("Assign goals based on NPC role");
    score -= 5;
  }

  // Check for excessive fear
  const maxFear = Math.max(
    ...Object.values(memory.relations).map((r) => r.fear),
    0
  );
  if (maxFear > 80) {
    issues.push("NPC has extreme fear of some entity");
    recommendations.push("Consider resolving the fear source");
    score -= 10;
  }

  // Check for no relations
  if (Object.keys(memory.relations).length === 0 && tick > 100) {
    issues.push("NPC has no relations despite being active");
    recommendations.push("NPC should interact with world entities");
    score -= 5;
  }

  return {
    healthy: issues.length === 0,
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}

// ============================================================================
// Debug Export
// ============================================================================

export interface ExportedDebugState {
  timestamp: number;
  tick: number;
  npcId: string;
  snapshot: NPCBrainDebugSnapshot;
  memorySize: number;
  relations: string[];
}

/**
 * Export debug state for external analysis
 */
export function exportDebugState(
  memory: NPCMemoryV3,
  tick: number,
  snapshot: NPCBrainDebugSnapshot
): ExportedDebugState {
  return {
    timestamp: deterministicNow(`export:${tick}`),
    tick,
    npcId: memory.identity.npcId,
    snapshot,
    memorySize: memory.episodic.length + memory.semantic.length,
    relations: Object.keys(memory.relations),
  };
}

/**
 * Generate summary report for NPC
 */
export function generateNPCSummaryReport(
  npcId: string,
  memory: NPCMemoryV3,
  tick: number
): string {
  const lines: string[] = [];
  
  lines.push(`=== NPC Brain Report: ${npcId} ===`);
  lines.push(`Tick: ${tick}`);
  lines.push(`Role: ${memory.identity.role} (${memory.identity.profession})`);
  lines.push(`Home: ${memory.identity.homeRegionId}`);
  lines.push("");
  lines.push("Personality:");
  lines.push(`  Courage: ${memory.identity.courage}`);
  lines.push(`  Greed: ${memory.identity.greed}`);
  lines.push(`  Loyalty: ${memory.identity.loyalty}`);
  lines.push("");
  
  if (memory.goals.length > 0) {
    lines.push("Active Goals:");
    for (const goal of memory.goals.slice(0, 5)) {
      lines.push(`  [${goal.priority}] ${goal.type}: ${goal.reason}`);
    }
    lines.push("");
  }
  
  lines.push("Memory Stats:");
  lines.push(`  Episodic: ${memory.episodic.length}`);
  lines.push(`  Semantic: ${memory.semantic.length}`);
  lines.push(`  Relations: ${Object.keys(memory.relations).length}`);
  lines.push("");
  
  lines.push("Learning:");
  lines.push(`  Total Actions: ${memory.learning.totalActions}`);
  lines.push(`  Success Rate: ${(memory.learning.totalSuccesses / Math.max(1, memory.learning.totalActions) * 100).toFixed(1)}%`);
  lines.push("");
  
  if (memory.faction.factionId) {
    lines.push("Faction:");
    lines.push(`  ${memory.faction.factionId} (Rank: ${memory.faction.factionRank})`);
    lines.push(`  Loyalty: ${memory.faction.loyaltyToFaction}`);
    lines.push("");
  }
  
  lines.push("Combat:");
  lines.push(`  Victories: ${memory.combat.victories}`);
  lines.push(`  Defeats: ${memory.combat.defeats}`);
  lines.push(`  Flee Threshold: ${(memory.combat.fleeThreshold * 100).toFixed(0)}%`);
  
  return lines.join("\n");
}