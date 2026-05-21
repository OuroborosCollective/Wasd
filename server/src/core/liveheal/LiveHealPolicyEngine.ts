// @ARE-GUARD-EXEMPT: Self-healing telemetry and timing; not simulation affecting.
/**
 * LiveHeal v2 - Policy Engine
 *
 * Evaluates healing strategies against runtime policies.
 * Can allow, block, or override strategy selection based on load,
 * subsystem state, protected features, and configurable rules.
 */

import type {
  PolicyRule,
  HealingStrategy,
  HealthSnapshot,
  LoadBand,
  SubSystemRecord,
  ProtectedFeature,
} from "./LiveHealTypes.js";

interface PolicyEvaluation {
  allowed: boolean;
  reason: string;
  /** The rule that made the decision (if any) */
  ruleId: string | null;
}

export class LiveHealPolicyEngine {
  private readonly rules = new Map<string, PolicyRule>();
  private readonly protectedFeatures = new Map<string, ProtectedFeature>();

  addRule(rule: PolicyRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  registerProtectedFeature(feature: ProtectedFeature): void {
    this.protectedFeatures.set(feature.id, feature);
  }

  /**
   * Determine the effective load band from a health snapshot.
   */
  static getLoadBand(snapshot: HealthSnapshot): LoadBand {
    const conn = snapshot.metrics.activeConnections ?? 0;
    const errRate = snapshot.metrics.errorRate ?? 0;
    if (conn > 100 || errRate > 0.1) return "high";
    if (conn > 30 || errRate > 0.03) return "medium";
    return "low";
  }

  /**
   * Evaluate a strategy against all active policy rules.
   * Returns whether the strategy is allowed and why.
   */
  evaluate(
    strategy: HealingStrategy,
    subsystem: SubSystemRecord,
    snapshot: HealthSnapshot
  ): PolicyEvaluation {
    const loadBand = LiveHealPolicyEngine.getLoadBand(snapshot);

    // Rule 1: Protect features - if strategy mayTouchState and subsystem has protected features
    if (strategy.mayTouchState) {
      const protectedSubsystems = this.getProtectedSubsystemIds();
      if (protectedSubsystems.has(subsystem.id)) {
        return {
          allowed: false,
          reason: `Strategy "${strategy.name}" may touch state but subsystem "${subsystem.id}" has protected features.`,
          ruleId: "builtin:feature_protection",
        };
      }
    }

    // Rule 2: No queue-dropping strategies for critical subsystems with high load
    if (strategy.mayDropQueue && subsystem.state === "critical" && loadBand === "high") {
      return {
        allowed: false,
        reason: `Queue-dropping strategy "${strategy.name}" blocked during high load on critical subsystem.`,
        ruleId: "builtin:critical_high_load",
      };
    }

    // Rule 3: High-risk strategies only when not in critical phase
    if (strategy.riskLevel === "high" && subsystem.state === "critical") {
      return {
        allowed: false,
        reason: `High-risk strategy "${strategy.name}" blocked for critical subsystem.`,
        ruleId: "builtin:no_high_risk_when_critical",
      };
    }

    // Evaluate custom rules
    const activeRules = Array.from(this.rules.values())
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      // Check load band filter
      if (rule.loadBands && !rule.loadBands.includes(loadBand)) {
        continue;
      }

      // Check subsystem state filter
      if (rule.activeWhenSubsystem && !rule.activeWhenSubsystem.includes(subsystem.state)) {
        continue;
      }

      // Check blocked strategies
      if (rule.blockedStrategies && rule.blockedStrategies.includes(strategy.name)) {
        return {
          allowed: false,
          reason: rule.description,
          ruleId: rule.id,
        };
      }

      // Check allowed strategies (if set, only these are allowed)
      if (rule.allowedStrategies && !rule.allowedStrategies.includes(strategy.name)) {
        return {
          allowed: false,
          reason: rule.description,
          ruleId: rule.id,
        };
      }
    }

    return { allowed: true, reason: "", ruleId: null };
  }

  /**
   * Check if a strategy would threaten any protected features.
   */
  threatensProtectedFeatures(strategy: HealingStrategy): string[] {
    const threatened: string[] = [];
    if (!strategy.mayTouchState && !strategy.mayDropQueue) {
      return threatened;
    }
    for (const feature of this.protectedFeatures.values()) {
      if (strategy.subsystems.some((s) => feature.subsystems.includes(s) || s === "*")) {
        threatened.push(feature.id);
      }
    }
    return threatened;
  }

  private getProtectedSubsystemIds(): Set<string> {
    const ids = new Set<string>();
    for (const feature of this.protectedFeatures.values()) {
      for (const sub of feature.subsystems) {
        ids.add(sub);
      }
    }
    return ids;
  }

  /**
   * Get all active rules for introspection.
   */
  getRules(): PolicyRule[] {
    return Array.from(this.rules.values()).filter((r) => r.enabled);
  }

  /**
   * Get all protected features for introspection.
   */
  getProtectedFeatures(): ProtectedFeature[] {
    return Array.from(this.protectedFeatures.values());
  }
}
