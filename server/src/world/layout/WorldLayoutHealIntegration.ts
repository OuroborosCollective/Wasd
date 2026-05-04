// @ts-nocheck
/**
 * WorldLayoutHealIntegration - Bridges WorldLayoutRuleEngine with LiveHeal.
 *
 * Registers the layout system as a LiveHeal subsystem so that layout issues
 * are detected, scored, and repaired within the existing WorldTick cycle.
 */

import type { HealthSnapshot, SubSystemAdapter } from "../../core/liveheal/LiveHealTypes.js";
import type { WorldLayoutRuleEngine } from "./WorldLayoutRuleEngine.js";
import type { SpatialEntity } from "./WorldLayoutTypes.js";

export interface WorldLayoutAdapterOptions {
  /** Objects from WorldObjectSystem to load */
  getWorldObjects: () => Array<{
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    rotation?: number;
    scale?: number;
    glbPath?: string;
  }>;
  /** How often to re-validate (every N ticks). Default: every 300 ticks (~30s at 100ms) */
  checkEveryNTicks?: number;
}

/**
 * Create a LiveHeal SubSystemAdapter for the world layout system.
 */
export function createWorldLayoutAdapter(
  engine: WorldLayoutRuleEngine,
  options: WorldLayoutAdapterOptions
): SubSystemAdapter {
  let tickCounter = 0;
  const checkInterval = options.checkEveryNTicks ?? 300;

  return {
    id: "world-layout",
    getHealthSnapshot: (): HealthSnapshot => {
      tickCounter++;

      // Only re-validate periodically, not every tick
      if (tickCounter % checkInterval === 0) {
        const objects = options.getWorldObjects();
        engine.loadEntities(objects);
        engine.validate();
      }

      const status = engine.getHealthStatus();
      let healthStatus: "healthy" | "degraded" | "critical";
      if (status.criticalCount > 0) {
        healthStatus = "critical";
      } else if (status.invalidCount > 0 || status.score < 70) {
        healthStatus = "degraded";
      } else {
        healthStatus = "healthy";
      }

      const symptomTags: string[] = [];
      if (status.criticalCount > 0) symptomTags.push("critical_layout_issues");
      if (status.invalidCount > 0) symptomTags.push("invalid_layout_issues");
      if (status.warningCount > 0) symptomTags.push("layout_warnings");

      return {
        ok: status.ok,
        status: healthStatus,
        score: status.score,
        errorCode: status.criticalCount > 0 ? "layout_critical" : status.invalidCount > 0 ? "layout_invalid" : undefined,
        symptomTags,
        metrics: {
          custom: {
            issueCount: status.issueCount,
            criticalCount: status.criticalCount,
            invalidCount: status.invalidCount,
            warningCount: status.warningCount,
            entityCount: engine.getStats().entityCount,
          },
        },
        canServeReadOnly: true,
      };
    },
    getDependencies: () => ["worldtick", "asset-health"],
    getProtectedFeatures: () => ["core-worldtick"],
  };
}

/**
 * Create a LiveHeal healing strategy for world layout issues.
 */
export function createLayoutHealStrategy(engine: WorldLayoutRuleEngine) {
  return {
    name: "world_layout_repair",
    subsystems: ["world-layout"],
    riskLevel: "medium" as const,
    cooldownMs: 30_000,
    maxAttempts: 2,
    mayTouchState: true,
    mayDropQueue: false,
    preservesFeatures: true,
    async run(subsystemId: string) {
      const start = Date.now();
      const result = await engine.validateAndRepair();
      const repaired = result.repair?.repaired ?? 0;
      const failed = result.repair?.failed ?? 0;
      const success = result.validation.ok || repaired > 0;

      return {
        success,
        strategyName: "world_layout_repair",
        message: `Layout repair: ${repaired} repaired, ${failed} failed, score: ${result.validation.score}`,
        durationMs: Date.now() - start,
        sideEffects: repaired > 0 ? ["entities_moved"] : [],
        serviceable: true,
      };
    },
  };
}
