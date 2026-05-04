// @ts-nocheck
/**
 * WorldLayoutConstraintRegistry - Central registry of all layout constraint rules.
 *
 * Rules are modular, ordered, and can be enabled/disabled at runtime.
 */

import type { LayoutConstraintRule, LayoutIssue, LayoutRuleContext, SpatialEntity } from "./WorldLayoutTypes.js";

export class WorldLayoutConstraintRegistry {
  private readonly rules = new Map<string, LayoutConstraintRule>();

  register(rule: LayoutConstraintRule): void {
    this.rules.set(rule.id, rule);
  }

  unregister(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  get(ruleId: string): LayoutConstraintRule | undefined {
    return this.rules.get(ruleId);
  }

  getAll(): LayoutConstraintRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Run all registered rules against the given entities.
   */
  runAll(entities: SpatialEntity[], context: LayoutRuleContext): LayoutIssue[] {
    const issues: LayoutIssue[] = [];
    for (const rule of this.rules.values()) {
      try {
        const ruleIssues = rule.check(entities, context);
        issues.push(...ruleIssues);
      } catch {
        // Never crash validation due to a single rule failure
      }
    }
    return issues;
  }

  /**
   * Run only rules that apply to a specific category.
   */
  runForCategory(
    category: string,
    entities: SpatialEntity[],
    context: LayoutRuleContext
  ): LayoutIssue[] {
    const issues: LayoutIssue[] = [];
    for (const rule of this.rules.values()) {
      if (rule.categories !== "*" && !rule.categories.includes(category as any)) {
        continue;
      }
      try {
        issues.push(...rule.check(entities, context));
      } catch {
        // best effort
      }
    }
    return issues;
  }

  get size(): number {
    return this.rules.size;
  }
}
