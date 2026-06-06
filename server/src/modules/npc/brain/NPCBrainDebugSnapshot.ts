import { deterministicNow, stableHash32 } from "../../../core/determinism/AREDeterminism.js";
import type {
  NPCBrainDebugSnapshot,
  NPCDecision,
  NPCEpisodicMemory,
  NPCGoal,
  NPCMemoryV3,
  NPCRelation,
} from "./NPCMemoryV3.js";

export type { NPCBrainDebugSnapshot } from "./NPCMemoryV3.js";

function stableStringCompare(a: string, b: string): number {
  return stableHash32(a) - stableHash32(b);
}

function getTopGoal(memory: NPCMemoryV3): NPCGoal | undefined {
  return [...memory.goals].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return stableStringCompare(a.id, b.id);
  })[0];
}

function getRelationHighlights(relations: Record<string, NPCRelation>): NPCRelation[] {
  return Object.values(relations)
    .sort((a, b) => {
      const aWeight = Math.abs(a.trust) + Math.abs(a.fear);
      const bWeight = Math.abs(b.trust) + Math.abs(b.fear);
      if (aWeight !== bWeight) return bWeight - aWeight;
      return b.interactions - a.interactions;
    })
    .slice(0, 5);
}

function getRecentEvents(episodic: NPCEpisodicMemory[], count: number): NPCEpisodicMemory[] {
  return [...episodic].sort((a, b) => b.tick - a.tick).slice(0, count);
}

function calculateDebugMemoryHash(memory: NPCMemoryV3): string {
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
        .slice(0, 10),
    ),
    JSON.stringify(
      Object.entries(memory.learning.contextScores)
        .sort((a, b) => stableStringCompare(a[0], b[0]))
        .slice(0, 10),
    ),
  ];

  return stableHash32(components.join("||")).toString(16).padStart(8, "0");
}

export function createNPCBrainDebugSnapshot(
  npcId: string,
  tick: number,
  state: string,
  memory: NPCMemoryV3,
  decision: NPCDecision | null,
): NPCBrainDebugSnapshot {
  const totalActions = memory.learning.totalActions;
  const totalSuccesses = memory.learning.totalSuccesses;

  return {
    npcId,
    tick,
    state,
    topGoal: getTopGoal(memory),
    decision: decision ?? {
      action: "idle",
      reason: "no_decision_made",
      score: 0,
      confidence: 0,
    },
    relationHighlights: getRelationHighlights(memory.relations),
    recentEvents: getRecentEvents(memory.episodic, 10),
    memoryHash: calculateDebugMemoryHash(memory),
    learningStats: {
      totalActions,
      totalSuccesses,
      successRate: totalActions > 0 ? totalSuccesses / totalActions : 0,
    },
  };
}

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

function getHighestRelationValue(relations: NPCRelation[], attr: "trust" | "fear" | "morale"): number {
  if (relations.length === 0) return 0;
  return Math.max(...relations.map((relation) => relation[attr]));
}

export function formatDebugDisplay(snapshot: NPCBrainDebugSnapshot): DebugDisplayInfo {
  return {
    npcName: snapshot.npcId,
    state: snapshot.state,
    topGoal: snapshot.topGoal?.type ?? "none",
    goalReason: snapshot.topGoal?.reason ?? "no_goal",
    trustPlayer: getHighestRelationValue(snapshot.relationHighlights, "trust"),
    fearPlayer: getHighestRelationValue(snapshot.relationHighlights, "fear"),
    factionMood: "neutral",
    nextAction: snapshot.decision.action,
    decisionReason: snapshot.decision.reason,
    memoryEvents: snapshot.recentEvents.length,
    summaries: 0,
    memoryHash: snapshot.memoryHash,
    learningSuccessRate: `${(snapshot.learningStats.successRate * 100).toFixed(1)}%`,
  };
}

export interface ReplayVerificationResult {
  verified: boolean;
  expectedHash: string;
  actualHash: string;
  differences: string[];
}

export function verifyReplay(
  previousSnapshot: NPCBrainDebugSnapshot,
  currentSnapshot: NPCBrainDebugSnapshot,
  expectedIdentical: boolean = true,
): ReplayVerificationResult {
  const differences: string[] = [];

  if (previousSnapshot.memoryHash !== currentSnapshot.memoryHash) {
    differences.push(`Memory hash changed: ${previousSnapshot.memoryHash} -> ${currentSnapshot.memoryHash}`);
  }
  if (previousSnapshot.decision.action !== currentSnapshot.decision.action) {
    differences.push(`Decision changed: ${previousSnapshot.decision.action} -> ${currentSnapshot.decision.action}`);
  }
  if (previousSnapshot.state !== currentSnapshot.state) {
    differences.push(`State changed: ${previousSnapshot.state} -> ${currentSnapshot.state}`);
  }

  return {
    verified: expectedIdentical ? differences.length === 0 : differences.length > 0,
    expectedHash: previousSnapshot.memoryHash,
    actualHash: currentSnapshot.memoryHash,
    differences,
  };
}

export interface BrainHealthResult {
  healthy: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

export function checkBrainHealth(memory: NPCMemoryV3, tick: number): BrainHealthResult {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  if (memory.episodic.length > 200) {
    issues.push("Episodic memory growing too large");
    recommendations.push("Run memory compression more frequently");
    score -= 10;
  }

  const timeSinceLastOutcome = tick - memory.learning.lastOutcomeTick;
  if (timeSinceLastOutcome > 500 && memory.learning.totalActions > 10) {
    issues.push("No learning outcomes for a long time");
    recommendations.push("Ensure NPC is getting feedback on actions");
    score -= 15;
  }

  if (memory.learning.totalActions > 5) {
    const successRate = memory.learning.totalSuccesses / memory.learning.totalActions;
    if (successRate < 0.3) {
      issues.push(`Low success rate: ${(successRate * 100).toFixed(0)}%`);
      recommendations.push("Review decision scoring logic");
      score -= 20;
    }
  }

  if (memory.goals.length === 0) {
    issues.push("NPC has no active goals");
    recommendations.push("Assign goals based on NPC role");
    score -= 5;
  }

  const maxFear = Math.max(...Object.values(memory.relations).map((relation) => relation.fear), 0);
  if (maxFear > 80) {
    issues.push("NPC has extreme fear of some entity");
    recommendations.push("Consider resolving the fear source");
    score -= 10;
  }

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

export interface ExportedDebugState {
  timestamp: number;
  tick: number;
  npcId: string;
  snapshot: NPCBrainDebugSnapshot;
  memorySize: number;
  relations: string[];
}

export function exportDebugState(
  memory: NPCMemoryV3,
  tick: number,
  snapshot: NPCBrainDebugSnapshot,
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

export function generateNPCSummaryReport(npcId: string, memory: NPCMemoryV3, tick: number): string {
  const successRate = (memory.learning.totalSuccesses / Math.max(1, memory.learning.totalActions)) * 100;
  const lines = [
    `=== NPC Brain Report: ${npcId} ===`,
    `Tick: ${tick}`,
    `Role: ${memory.identity.role} (${memory.identity.profession})`,
    `Home: ${memory.identity.homeRegionId}`,
    "",
    "Memory Stats:",
    `  Episodic: ${memory.episodic.length}`,
    `  Semantic: ${memory.semantic.length}`,
    `  Relations: ${Object.keys(memory.relations).length}`,
    "",
    "Learning:",
    `  Total Actions: ${memory.learning.totalActions}`,
    `  Success Rate: ${successRate.toFixed(1)}%`,
  ];

  return lines.join("\n");
}
