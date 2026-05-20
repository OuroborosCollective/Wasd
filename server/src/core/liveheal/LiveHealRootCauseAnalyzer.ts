// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
/**
 * LiveHeal v2 - Root Cause Analyzer
 *
 * Combines dependency graph analysis with anomaly data to identify
 * the most likely root cause when multiple subsystems degrade.
 */

import type {
  SubSystemRecord,
  HealthSnapshot,
  AnomalyObservation,
  ErrorSignature,
} from "./LiveHealTypes.js";
import { LiveHealDependencyGraph } from "./LiveHealDependencyGraph.js";

export interface RootCauseCandidate {
  subsystemId: string;
  /** Higher = more likely to be root cause */
  score: number;
  reasons: string[];
}

export interface RootCauseAnalysis {
  candidates: RootCauseCandidate[];
  /** The most likely root cause, or null if unclear */
  topSuspect: string | null;
  /** Subsystems that are likely victims, not causes */
  victims: string[];
  timestamp: number;
}

export class LiveHealRootCauseAnalyzer {
  constructor(private readonly graph: LiveHealDependencyGraph) {}

  /**
   * Analyze a set of degraded subsystems and rank root cause candidates.
   */
  analyze(
    records: Map<string, SubSystemRecord>,
    snapshots: Map<string, HealthSnapshot>,
    anomalies: AnomalyObservation[]
  ): RootCauseAnalysis {
    const degraded = new Set<string>();
    for (const [id, record] of records) {
      if (record.state === "degraded" || record.state === "critical") {
        degraded.add(id);
      }
    }

    if (degraded.size === 0) {
      return { candidates: [], topSuspect: null, victims: [], timestamp: Date.now() };
    }

    if (degraded.size === 1) {
      const id = Array.from(degraded)[0];
      return {
        candidates: [{ subsystemId: id, score: 1, reasons: ["Only degraded subsystem"] }],
        topSuspect: id,
        victims: [],
        timestamp: Date.now(),
      };
    }

    // Use dependency graph to rank
    const ranked = this.graph.rankRootCauses(degraded);

    const candidates: RootCauseCandidate[] = ranked.map((id, index) => {
      const record = records.get(id);
      const snapshot = snapshots.get(id);
      const reasons: string[] = [];
      let score = 0;

      // Factor 1: Position in dependency ranking (higher = more upstream)
      score += (ranked.length - index) * 10;

      // Factor 2: Severity of this subsystem's own health
      if (snapshot) {
        score += (100 - snapshot.score) / 10;
      }

      // Factor 3: How many other degraded systems depend on this one
      const dependents = this.graph.getDependents(id);
      const degradedDependents = dependents.filter((d) => degraded.has(d)).length;
      if (degradedDependents > 0) {
        score += degradedDependents * 5;
        reasons.push(`${degradedDependents} degraded dependents`);
      }

      // Factor 4: Whether this subsystem has anomalies
      const subAnomalies = anomalies.filter((a) => a.subsystem === id);
      if (subAnomalies.length > 0) {
        score += subAnomalies.length * 3;
        reasons.push(`${subAnomalies.length} anomaly signals`);
      }

      // Factor 5: How many degraded dependencies this has (fewer = more likely root)
      const deps = this.graph.getDependencies(id);
      const degradedDeps = deps.filter((d) => degraded.has(d)).length;
      if (degradedDeps === 0 && deps.length > 0) {
        score += 8;
        reasons.push("No degraded dependencies (leaf cause)");
      }

      // Factor 6: Consecutive failures
      if (record && record.consecutiveFailures > 1) {
        score += record.consecutiveFailures * 2;
        reasons.push(`${record.consecutiveFailures} consecutive failures`);
      }

      // Factor 7: Critical state
      if (record?.state === "critical") {
        score += 5;
        reasons.push("In critical state");
      }

      if (reasons.length === 0) {
        reasons.push("Dependency graph analysis");
      }

      return { subsystemId: id, score, reasons };
    });

    candidates.sort((a, b) => b.score - a.score);

    const topSuspect = candidates.length > 0 ? candidates[0].subsystemId : null;

    // Victims = degraded subsystems that depend on the top suspect
    const victims: string[] = [];
    if (topSuspect) {
      const allDeps = this.graph.getAllDependents(topSuspect);
      for (const dep of allDeps) {
        if (degraded.has(dep)) {
          victims.push(dep);
        }
      }
    }

    return { candidates, topSuspect, victims, timestamp: Date.now() };
  }

  /**
   * Given an error signature, suggest the dependency context.
   */
  getDependencyContext(subsystemId: string): string[] {
    return this.graph.getDependencies(subsystemId);
  }

  /**
   * Check if a subsystem failure is likely to cascade.
   */
  wouldCascade(subsystemId: string): boolean {
    const dependents = this.graph.getDependents(subsystemId);
    return dependents.length > 0;
  }
}
